// Domaines personnalisés (Cloudflare for SaaS) : go.monresto.cg au lieu de link.cg.
//
// Ce module ne parle qu'à D1. L'appel à Cloudflare (création du hostname, lecture
// du statut du certificat, suppression) vit côté application
// (apps/web/src/server/cf-saas.ts) : ici, on réserve le nom, on enregistre ce que
// Cloudflare a répondu, et on refuse ce qui casserait des liens existants.
//
// Le routeur n'a rien à savoir : il lit déjà KV par `${hostname}:${slug}`.

import { and, asc, eq, notInArray, sql } from 'drizzle-orm'
import * as schema from './schema'
import type { Db } from './mutations'
import type { DomainRow } from './schema'

/** Domaine partagé par défaut des liens. */
export const DEFAULT_LINK_HOST = 'link.cg'

/**
 * Domaines de la plateforme : jamais ajoutables comme domaine personnalisé, ni
 * eux ni leurs sous-domaines (beta.qrcode.cg, x.link.cg…).
 */
export const PLATFORM_HOSTS = ['link.cg', 'qrcode.cg'] as const

export function isPlatformHost(hostname: string): boolean {
  return PLATFORM_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`))
}

export type HostnameError =
  /** Pas un nom de domaine (caractères, longueur, forme). */
  | 'invalid'
  /** Adresse IP : Cloudflare for SaaS n'accepte que des noms. */
  | 'ip'
  /** Domaine nu (monresto.cg) : un CNAME n'y est pas possible, il faut un sous-domaine. */
  | 'apex'
  /** link.cg, qrcode.cg ou un de leurs sous-domaines. */
  | 'reserved'

export type HostnameCheck = { ok: true; hostname: string } | { ok: false; error: HostnameError }

// Étiquette DNS : 1 à 63 caractères, lettres/chiffres/tirets, sans tiret au bord.
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
// Domaine de premier niveau : lettres seulement, ou forme punycode (xn--…).
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/
const IPV6 = /^\[?[0-9a-f]*:[0-9a-f:.]*:[0-9a-f:.]*\]?$/

/**
 * Valide et normalise un nom saisi : minuscules, sans « https:// » ni barre
 * finale ni point final. Strict : aucun chemin, port, identifiant ou caractère
 * non ASCII (un nom accentué doit être saisi en punycode, xn--…).
 * Au moins trois étiquettes (go.monresto.cg) : un sous-domaine est requis, le
 * client doit pouvoir y poser un CNAME.
 */
export function normalizeHostname(raw: string): HostnameCheck {
  let v = String(raw ?? '').trim().toLowerCase()
  v = v.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/\.$/, '')
  if (!v || v.length > 253) return { ok: false, error: 'invalid' }
  if (IPV4.test(v) || IPV6.test(v)) return { ok: false, error: 'ip' }
  const labels = v.split('.')
  if (!labels.every((l) => LABEL.test(l))) return { ok: false, error: 'invalid' }
  if (!TLD.test(labels[labels.length - 1]!)) return { ok: false, error: 'invalid' }
  if (isPlatformHost(v)) return { ok: false, error: 'reserved' }
  if (labels.length < 3) return { ok: false, error: 'apex' }
  return { ok: true, hostname: v }
}

/** Domaines personnalisés d'un espace (hors domaines de la plateforme), du plus ancien au plus récent. */
export async function listWorkspaceDomains(db: Db, workspaceId: string): Promise<DomainRow[]> {
  return db.query.domains.findMany({
    where: and(
      eq(schema.domains.workspaceId, workspaceId),
      notInArray(schema.domains.hostname, [...PLATFORM_HOSTS]),
    ),
    orderBy: [asc(schema.domains.createdAt), asc(schema.domains.hostname)],
  })
}

/** Un domaine personnalisé de l'espace (garde anti-IDOR), ou null. */
export async function getWorkspaceDomain(db: Db, workspaceId: string, domainId: string): Promise<DomainRow | null> {
  const d = await db.query.domains.findFirst({
    where: and(eq(schema.domains.id, domainId), eq(schema.domains.workspaceId, workspaceId)),
  })
  return d && !isPlatformHost(d.hostname) ? d : null
}

/** Domaine personnalisé de l'espace par son nom (création de lien), ou null. */
export async function getWorkspaceDomainByHostname(db: Db, workspaceId: string, hostname: string): Promise<DomainRow | null> {
  const d = await db.query.domains.findFirst({
    where: and(eq(schema.domains.hostname, hostname), eq(schema.domains.workspaceId, workspaceId)),
  })
  return d && !isPlatformHost(d.hostname) ? d : null
}

/** La personne peut-elle gérer les domaines de l'espace ? Propriétaire ou administrateur. */
export async function canManageDomains(db: Db, userId: string, workspaceId: string): Promise<boolean> {
  const m = await db.query.memberships.findFirst({
    where: and(eq(schema.memberships.userId, userId), eq(schema.memberships.workspaceId, workspaceId)),
  })
  return m?.role === 'owner' || m?.role === 'admin'
}

export type AddDomainResult =
  | { ok: true; domain: DomainRow }
  | { ok: false; error: HostnameError }
  | { ok: false; error: 'taken' }
  | { ok: false; error: 'limit_reached' }

export interface AddDomainDeps {
  db: Db
  newId?: () => string
  now?: () => number
}

/**
 * Réserve un domaine personnalisé pour un espace, non vérifié, sans identifiant
 * Cloudflare (posé ensuite par setDomainCloudflare). Le nom est unique sur toute
 * la plateforme : un domaine déjà pris par un autre espace est refusé (`taken`),
 * sans dire lequel. `maxDomains` est compté ET inséré en une seule instruction :
 * deux ajouts simultanés ne dépassent pas le plafond.
 */
export async function addCustomDomain(
  deps: AddDomainDeps,
  input: { workspaceId: string; hostname: string; maxDomains: number },
): Promise<AddDomainResult> {
  const check = normalizeHostname(input.hostname)
  if (!check.ok) return check
  const hostname = check.hostname

  const existing = await deps.db.query.domains.findFirst({ where: eq(schema.domains.hostname, hostname) })
  if (existing) return { ok: false, error: 'taken' }

  const id = (deps.newId ?? (() => crypto.randomUUID()))()
  const ts = (deps.now ?? (() => Date.now()))()
  const platform = [...PLATFORM_HOSTS]

  let inserted: { id: string }[]
  try {
    inserted = await deps.db.all<{ id: string }>(sql`
      INSERT INTO domains (id, workspace_id, hostname, verified, is_default, cf_hostname_id, ssl_status, created_at)
      SELECT ${id}, ${input.workspaceId}, ${hostname}, 0, 0, NULL, NULL, ${ts}
      WHERE (SELECT count(*) FROM domains
             WHERE workspace_id = ${input.workspaceId}
               AND hostname NOT IN (${sql.join(platform.map((h) => sql`${h}`), sql`, `)})) < ${input.maxDomains}
      RETURNING id`)
  } catch (e) {
    // Course perdue sur l'unicité du nom (ajout simultané du même domaine).
    if (isUniqueViolation(e)) return { ok: false, error: 'taken' }
    throw e
  }
  if (inserted.length === 0) return { ok: false, error: 'limit_reached' }

  const domain = await deps.db.query.domains.findFirst({ where: eq(schema.domains.id, id) })
  return { ok: true, domain: domain! }
}

/** Violation d'unicité SQLite/D1, éventuellement enveloppée par Drizzle (`cause`). */
function isUniqueViolation(e: unknown): boolean {
  for (let cur = e, i = 0; cur && i < 4; cur = (cur as { cause?: unknown }).cause, i++) {
    if (/UNIQUE constraint failed/i.test(String((cur as { message?: unknown }).message ?? ''))) return true
  }
  return false
}

/** Statut renvoyé par Cloudflare, à enregistrer. */
export interface DomainStatusUpdate {
  cfHostnameId?: string | null
  /** true quand le hostname ET son certificat sont actifs chez Cloudflare. */
  verified: boolean
  sslStatus: string | null
}

/** Enregistre l'état Cloudflare d'un domaine de l'espace. false si introuvable. */
export async function updateDomainStatus(
  db: Db,
  workspaceId: string,
  domainId: string,
  update: DomainStatusUpdate,
): Promise<boolean> {
  const domain = await getWorkspaceDomain(db, workspaceId, domainId)
  if (!domain) return false
  await db.update(schema.domains)
    .set({
      verified: update.verified,
      sslStatus: update.sslStatus,
      ...(update.cfHostnameId !== undefined ? { cfHostnameId: update.cfHostnameId } : {}),
    })
    .where(and(eq(schema.domains.id, domainId), eq(schema.domains.workspaceId, workspaceId)))
  return true
}

export type RemoveDomainCheck =
  | { ok: true; domain: DomainRow }
  | { ok: false; error: 'not_found' }
  | { ok: false; error: 'has_links'; links: number }

/** Nombre de liens portés par un domaine. */
async function linksOnDomain(db: Db, domainId: string): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(schema.links).where(eq(schema.links.domainId, domainId))
  return Number(row?.n ?? 0)
}

/**
 * Le domaine peut-il être retiré ? Refusé tant qu'il porte des liens : ces liens
 * sont peut-être imprimés (QR, cartes), les retirer en silence les casserait.
 * La personne supprime d'abord ses liens, en connaissance de cause. Pas de
 * déplacement automatique vers link.cg : l'adresse imprimée resterait go.monresto.cg.
 */
export async function checkDomainRemoval(db: Db, workspaceId: string, domainId: string): Promise<RemoveDomainCheck> {
  const domain = await getWorkspaceDomain(db, workspaceId, domainId)
  if (!domain) return { ok: false, error: 'not_found' }
  const n = await linksOnDomain(db, domainId)
  if (n > 0) return { ok: false, error: 'has_links', links: n }
  return { ok: true, domain }
}

/**
 * Supprime un domaine personnalisé de l'espace, seulement s'il ne porte aucun
 * lien — vérifié dans la même instruction que la suppression (un lien créé entre
 * la vérification et la suppression l'empêche). L'appelant retire d'abord le
 * hostname chez Cloudflare.
 */
export async function removeCustomDomain(db: Db, workspaceId: string, domainId: string): Promise<RemoveDomainCheck> {
  const check = await checkDomainRemoval(db, workspaceId, domainId)
  if (!check.ok) return check
  const deleted = await db.all<{ id: string }>(sql`
    DELETE FROM domains
    WHERE id = ${domainId} AND workspace_id = ${workspaceId}
      AND NOT EXISTS (SELECT 1 FROM links WHERE domain_id = ${domainId})
    RETURNING id`)
  if (deleted.length === 0) return { ok: false, error: 'has_links', links: await linksOnDomain(db, domainId) }
  return check
}
