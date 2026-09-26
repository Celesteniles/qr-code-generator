// Design QR par lien : stocke la config de style (couleurs, formes) dans qr_designs.
// La config est opaque ici (JSON) — sa forme est définie côté app (apps/web), pour
// que @link/db reste agnostique du moteur de rendu QR. On en borne seulement la
// nature (objet JSON) et la taille : la forme est filtrée à la lecture (toDesign).

import { eq, inArray } from 'drizzle-orm'
import * as schema from './schema'
import type { Db } from './mutations'

/**
 * Taille maximale d'une config sérialisée. Le logo y est en data URL : le tiroir de
 * style accepte des fichiers de 500 Ko (≈ 670 Ko en base64), d'où cette marge.
 */
export const QR_DESIGN_MAX_BYTES = 768 * 1024

/** Config de design refusée (pas un objet JSON, ou trop lourde). */
export class QrDesignError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QrDesignError'
  }
}

/** Vérifie la config avant écriture ; lève QrDesignError si elle est refusée. */
export function checkQrDesignConfig(config: unknown): void {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new QrDesignError('Le style du QR doit être un objet.')
  }
  let json: string
  try {
    json = JSON.stringify(config)
  } catch {
    throw new QrDesignError('Le style du QR n’est pas enregistrable.')
  }
  if (new TextEncoder().encode(json).length > QR_DESIGN_MAX_BYTES) {
    throw new QrDesignError('Le style du QR est trop lourd (logo trop grand).')
  }
}

/**
 * Crée ou remplace le design d'un lien. Lève QrDesignError si la config est
 * refusée (voir checkQrDesignConfig) : rien n'est écrit dans ce cas.
 */
export async function upsertQrDesign(
  db: Db,
  linkId: string,
  config: unknown,
  newId: () => string = () => crypto.randomUUID(),
): Promise<void> {
  checkQrDesignConfig(config)
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

// D1 limite le nombre de paramètres liés par requête (100) : lots plus petits.
const IN_CHUNK = 90

/** Designs de plusieurs liens d'un coup (dashboard), indexés par linkId. */
export async function getQrDesigns(db: Db, linkIds: string[]): Promise<Record<string, unknown>> {
  const ids = [...new Set(linkIds)]
  if (ids.length === 0) return {}
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += IN_CHUNK) chunks.push(ids.slice(i, i + IN_CHUNK))
  const batches = await Promise.all(
    chunks.map((chunk) => db.query.qrDesigns.findMany({ where: inArray(schema.qrDesigns.linkId, chunk) })),
  )
  const out: Record<string, unknown> = {}
  for (const rows of batches) for (const r of rows) out[r.linkId] = r.config
  return out
}
