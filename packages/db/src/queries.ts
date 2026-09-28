// Lectures D1 pour le dashboard (chemin froid — le chemin chaud passe par KV).

import { and, eq, desc, inArray, getTableColumns } from 'drizzle-orm'
import * as schema from './schema'
import type { Db } from './mutations'
import type { LinkRow } from './schema'

/** Lien accompagné du nom de son domaine (link.cg ou domaine personnalisé). */
export type LinkWithHost = LinkRow & { hostname: string }

/** Liens d'un espace de travail avec leur domaine, du plus récent au plus ancien. */
export async function listLinks(db: Db, workspaceId: string): Promise<LinkWithHost[]> {
  return db
    .select({ ...getTableColumns(schema.links), hostname: schema.domains.hostname })
    .from(schema.links)
    .innerJoin(schema.domains, eq(schema.domains.id, schema.links.domainId))
    .where(eq(schema.links.workspaceId, workspaceId))
    .orderBy(desc(schema.links.createdAt))
}

/** Un espace de travail (pour lire son palier). */
export async function getWorkspace(db: Db, id: string) {
  return db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, id) })
}

/** Un lien par id, avec son domaine (pour vérifier la propriété avant mutation). */
export async function getLink(db: Db, id: string): Promise<LinkWithHost | undefined> {
  const [row] = await db
    .select({ ...getTableColumns(schema.links), hostname: schema.domains.hostname })
    .from(schema.links)
    .innerJoin(schema.domains, eq(schema.domains.id, schema.links.domainId))
    .where(eq(schema.links.id, id))
    .limit(1)
  return row
}

/** Domaine par défaut d'un espace (pour préremplir la création). */
export async function defaultDomain(db: Db, workspaceId: string) {
  return db.query.domains.findFirst({
    where: (d, { and }) => and(eq(d.workspaceId, workspaceId), eq(d.isDefault, true)),
  })
}

/** Parmi `slugs`, ceux déjà utilisés sur un domaine (une seule requête). */
export async function takenSlugs(db: Db, domainId: string, slugs: string[]): Promise<Set<string>> {
  if (!slugs.length) return new Set()
  const rows = await db
    .select({ slug: schema.links.slug })
    .from(schema.links)
    .where(and(eq(schema.links.domainId, domainId), inArray(schema.links.slug, slugs)))
  return new Set(rows.map((r) => r.slug))
}
