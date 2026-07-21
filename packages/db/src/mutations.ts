// Chemin d'écriture : créer un lien = insérer dans D1 (vérité) PUIS propager vers KV
// (vue de lecture). L'ordre est impératif (docs/ARCHITECTURE.md §4).
//
// Le cœur vit ici, pas dans le Worker HTTP, pour être testable en base réelle et
// réutilisable par le futur dashboard.

import { eq } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { ruleSchema, linkKey } from '@link/shared'
import { z } from 'zod'
import * as schema from './schema'
import { compileLink, serializeEntry } from './compile'

/** Écriture KV minimale — suffit aux chemins de création/mise à jour/suppression. */
export interface KVWriter {
  put(key: string, value: string): Promise<unknown>
  delete(key: string): Promise<unknown>
}

export type Db = DrizzleD1Database<typeof schema>

export const createLinkInput = z.object({
  workspaceId: z.string().min(1),
  domainId: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, 'slug alphanumérique (- et _ autorisés)'),
  rule: ruleSchema,
  expiresAt: z.number().int().positive().optional(),
})
export type CreateLinkInput = z.infer<typeof createLinkInput>

/** Vérificateur d'URL anti-abus. Retourne true si l'URL est sûre. */
export type UrlChecker = (url: string) => Promise<boolean>

export interface CreateLinkDeps {
  db: Db
  kv: KVWriter
  /** Optionnel : si absent, la vérification est désactivée (à activer en prod). */
  checkUrl?: UrlChecker
  /** Injecté pour la testabilité (crypto.randomUUID par défaut, Date.now). */
  newId?: () => string
  now?: () => number
}

export type CreateLinkResult =
  | { ok: true; id: string; key: string }
  | { ok: false; error: 'invalid'; issues: string[] }
  | { ok: false; error: 'domain_not_found' }
  | { ok: false; error: 'slug_taken' }
  | { ok: false; error: 'unsafe_url'; url: string }

/** URLs contenues dans une règle, à soumettre à la vérification anti-abus. */
function urlsOf(rule: CreateLinkInput['rule']): string[] {
  switch (rule.type) {
    case 'static': return [rule.url]
    case 'app': return [rule.ios, rule.android, rule.fallback].filter((u): u is string => !!u)
    case 'card': return []
  }
}

export async function createLink(deps: CreateLinkDeps, raw: unknown): Promise<CreateLinkResult> {
  const parsed = createLinkInput.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'invalid', issues: parsed.error.issues.map((i) => i.message) }
  }
  const input = parsed.data

  // Le domaine doit exister — on a besoin de son hostname pour la clé KV.
  const domain = await deps.db.query.domains.findFirst({ where: eq(schema.domains.id, input.domainId) })
  if (!domain) return { ok: false, error: 'domain_not_found' }

  // Unicité (domain_id, slug) — vérifiée avant l'écriture pour un message clair.
  const existing = await deps.db.query.links.findFirst({
    where: (l, { and }) => and(eq(l.domainId, input.domainId), eq(l.slug, input.slug)),
  })
  if (existing) return { ok: false, error: 'slug_taken' }

  // Anti-abus : toute URL de destination doit passer la vérification, si activée.
  if (deps.checkUrl) {
    for (const url of urlsOf(input.rule)) {
      if (!(await deps.checkUrl(url))) return { ok: false, error: 'unsafe_url', url }
    }
  }

  const id = (deps.newId ?? (() => crypto.randomUUID()))()
  const ts = (deps.now ?? (() => Date.now()))()

  // 1. Vérité D1.
  await deps.db.insert(schema.links).values({
    id,
    workspaceId: input.workspaceId,
    domainId: input.domainId,
    slug: input.slug,
    kind: input.rule.type,
    rule: input.rule,
    active: true,
    expiresAt: input.expiresAt ?? null,
    createdAt: ts,
    updatedAt: ts,
  })

  // 2. Propagation KV (vue de lecture). Après D1, jamais avant.
  const entry = serializeEntry(
    compileLink(
      { id, workspaceId: input.workspaceId, domainId: input.domainId, slug: input.slug,
        kind: input.rule.type, rule: input.rule, active: true,
        expiresAt: input.expiresAt ?? null, createdAt: ts, updatedAt: ts },
      domain.hostname,
    ),
  )
  await deps.kv.put(entry.key, entry.value)

  return { ok: true, id, key: entry.key }
}

// ── Mise à jour / suppression ─────────────────────────────────────────────────

export interface MutateDeps {
  db: Db
  kv: KVWriter
  now?: () => number
}

export type LinkMutation =
  | { ok: true; key: string }
  | { ok: false; error: 'not_found' }

/** Résout le hostname d'un lien via son domaine (nécessaire à la clé KV). */
async function linkWithHostname(db: Db, linkId: string) {
  const link = await db.query.links.findFirst({ where: eq(schema.links.id, linkId) })
  if (!link) return null
  const domain = await db.query.domains.findFirst({ where: eq(schema.domains.id, link.domainId) })
  if (!domain) return null
  return { link, hostname: domain.hostname }
}

/** Active/désactive un lien : D1 puis KV (le lien inactif reste en KV, le routeur renvoie 410). */
export async function setLinkActive(deps: MutateDeps, linkId: string, active: boolean): Promise<LinkMutation> {
  const found = await linkWithHostname(deps.db, linkId)
  if (!found) return { ok: false, error: 'not_found' }
  const ts = (deps.now ?? (() => Date.now()))()

  await deps.db.update(schema.links).set({ active, updatedAt: ts }).where(eq(schema.links.id, linkId))

  const entry = serializeEntry(compileLink({ ...found.link, active, updatedAt: ts }, found.hostname))
  await deps.kv.put(entry.key, entry.value)
  return { ok: true, key: entry.key }
}

/** Supprime un lien : D1 puis KV (retrait de la vue de lecture). */
export async function deleteLink(deps: MutateDeps, linkId: string): Promise<LinkMutation> {
  const found = await linkWithHostname(deps.db, linkId)
  if (!found) return { ok: false, error: 'not_found' }

  await deps.db.delete(schema.links).where(eq(schema.links.id, linkId))

  const key = linkKey(found.hostname, found.link.slug)
  await deps.kv.delete(key)
  return { ok: true, key }
}
