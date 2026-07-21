// Lectures D1 pour le dashboard (chemin froid — le chemin chaud passe par KV).

import { eq, desc } from 'drizzle-orm'
import * as schema from './schema'
import type { Db } from './mutations'
import type { LinkRow } from './schema'

/** Liens d'un espace de travail, du plus récent au plus ancien. */
export async function listLinks(db: Db, workspaceId: string): Promise<LinkRow[]> {
  return db.query.links.findMany({
    where: eq(schema.links.workspaceId, workspaceId),
    orderBy: desc(schema.links.createdAt),
  })
}

/** Un lien par id (pour vérifier la propriété avant mutation). */
export async function getLink(db: Db, id: string): Promise<LinkRow | undefined> {
  return db.query.links.findFirst({ where: eq(schema.links.id, id) })
}

/** Domaine par défaut d'un espace (pour préremplir la création). */
export async function defaultDomain(db: Db, workspaceId: string) {
  return db.query.domains.findFirst({
    where: (d, { and }) => and(eq(d.workspaceId, workspaceId), eq(d.isDefault, true)),
  })
}
