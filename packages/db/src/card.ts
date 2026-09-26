// Cartes de visite digitales : profil rattaché à un lien de type 'card'.
// La page publique (qrcode.cg/c/{slug}) lit ces données ; le dashboard les édite.

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import * as schema from './schema'
import type { Db } from './mutations'
import type { LinkRow } from './schema'

export interface SocialLink {
  label: string
  url: string
}

export interface CardProfileInput {
  fullName: string
  title?: string
  org?: string
  phone?: string
  email?: string
  socials?: SocialLink[]
  /** Couleur d'accent de la carte publique (#rrggbb). */
  theme?: string
}

export interface CardProfile extends CardProfileInput {
  id: string
  linkId: string
}

// Validation côté serveur, appliquée à tout appelant : longueurs bornées, aucun
// caractère de contrôle (retours à la ligne compris : ces champs finissent dans
// une fiche vCard), liens en http(s) uniquement.
// eslint-disable-next-line no-control-regex
const NO_CONTROL = /^[^\u0000-\u001f\u007f]*$/
const field = (max: number) =>
  z.string().max(max, `${max} caractères maximum`).regex(NO_CONTROL, 'caractère non autorisé')
const httpUrl = field(500).refine((s) => {
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}, 'lien http(s) attendu')

export const cardProfileInput = z.object({
  fullName: field(100).refine((s) => s.trim().length > 0, 'nom requis'),
  title: field(120).optional(),
  org: field(120).optional(),
  phone: field(32).regex(/^[+0-9 ().-]*$/, 'numéro de téléphone invalide').optional(),
  email: field(254).email('adresse e-mail invalide').optional(),
  socials: z.array(z.object({ label: field(40), url: httpUrl })).max(12, '12 liens maximum').optional(),
  theme: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'couleur #rrggbb attendue').optional(),
})

/** Profil de carte refusé par la validation ; `issues` = messages par champ. */
export class CardProfileError extends Error {
  constructor(readonly issues: string[]) {
    super(`Profil de carte invalide : ${issues.join(' ; ')}`)
    this.name = 'CardProfileError'
  }
}

/** Valide un profil sans l'écrire (pour afficher une erreur avant d'appeler upsertCardProfile). */
export function validateCardProfile(input: unknown): { ok: true; profile: CardProfileInput } | { ok: false; issues: string[] } {
  const parsed = cardProfileInput.safeParse(input)
  if (parsed.success) return { ok: true, profile: parsed.data }
  return { ok: false, issues: parsed.error.issues.map((i) => `${i.path.join('.') || 'profil'} : ${i.message}`) }
}

/**
 * Crée ou remplace le profil d'un lien carte. `newId` injectable pour les tests.
 * Lève CardProfileError si le profil est invalide (voir cardProfileInput) : rien
 * n'est écrit dans ce cas.
 */
export async function upsertCardProfile(
  db: Db,
  linkId: string,
  raw: CardProfileInput,
  newId: () => string = () => crypto.randomUUID(),
): Promise<void> {
  const checked = validateCardProfile(raw)
  if (!checked.ok) throw new CardProfileError(checked.issues)
  const input = checked.profile
  const existing = await db.query.cardProfiles.findFirst({ where: eq(schema.cardProfiles.linkId, linkId) })
  const values = {
    linkId,
    fullName: input.fullName,
    title: input.title ?? null,
    org: input.org ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    socials: input.socials ?? null,
    avatarKey: null,
    theme: input.theme ?? null,
  }
  if (existing) {
    await db.update(schema.cardProfiles).set(values).where(eq(schema.cardProfiles.id, existing.id))
  } else {
    await db.insert(schema.cardProfiles).values({ id: newId(), ...values })
  }
}

export interface CardBySlug {
  link: LinkRow
  profile: CardProfile | null
}

/** Résout une carte publique par son slug (lien de type 'card'). */
export async function getCardBySlug(db: Db, slug: string): Promise<CardBySlug | null> {
  const link = await db.query.links.findFirst({
    where: (l, { and }) => and(eq(l.slug, slug), eq(l.kind, 'card')),
  })
  if (!link) return null

  const row = await db.query.cardProfiles.findFirst({ where: eq(schema.cardProfiles.linkId, link.id) })
  const profile: CardProfile | null = row
    ? {
        id: row.id,
        linkId: row.linkId,
        fullName: row.fullName,
        title: row.title ?? undefined,
        org: row.org ?? undefined,
        phone: row.phone ?? undefined,
        email: row.email ?? undefined,
        socials: (row.socials as SocialLink[] | null) ?? undefined,
        theme: row.theme ?? undefined,
      }
    : null
  return { link, profile }
}
