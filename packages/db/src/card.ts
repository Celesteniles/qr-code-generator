// Cartes de visite digitales : profil rattaché à un lien de type 'card'.
// La page publique (qrcode.cg/c/{slug}) lit ces données ; le dashboard les édite.

import { eq } from 'drizzle-orm'
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

/** Crée ou remplace le profil d'un lien carte. `newId` injectable pour les tests. */
export async function upsertCardProfile(
  db: Db,
  linkId: string,
  input: CardProfileInput,
  newId: () => string = () => crypto.randomUUID(),
): Promise<void> {
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
