// Design QR par lien : stocke la config de style (couleurs, formes) dans qr_designs.
// La config est opaque ici (JSON) — sa forme est définie côté app (apps/web), pour
// que @link/db reste agnostique du moteur de rendu QR.

import { eq } from 'drizzle-orm'
import * as schema from './schema'
import type { Db } from './mutations'

export async function upsertQrDesign(
  db: Db,
  linkId: string,
  config: unknown,
  newId: () => string = () => crypto.randomUUID(),
): Promise<void> {
  const existing = await db.query.qrDesigns.findFirst({ where: eq(schema.qrDesigns.linkId, linkId) })
  if (existing) {
    await db.update(schema.qrDesigns).set({ config }).where(eq(schema.qrDesigns.id, existing.id))
  } else {
    await db.insert(schema.qrDesigns).values({ id: newId(), linkId, config })
  }
}

/** Config de design d'un lien, ou null si aucune (style par défaut). */
export async function getQrDesign(db: Db, linkId: string): Promise<unknown | null> {
  const row = await db.query.qrDesigns.findFirst({ where: eq(schema.qrDesigns.linkId, linkId) })
  return row?.config ?? null
}

/** Designs de plusieurs liens d'un coup (dashboard), indexés par linkId. */
export async function getQrDesigns(db: Db, linkIds: string[]): Promise<Record<string, unknown>> {
  if (linkIds.length === 0) return {}
  const rows = await db.query.qrDesigns.findMany()
  const out: Record<string, unknown> = {}
  for (const r of rows) if (linkIds.includes(r.linkId)) out[r.linkId] = r.config
  return out
}
