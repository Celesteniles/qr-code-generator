// Rattachement identité ↔ espace de travail. Chaque utilisateur Better Auth possède
// un workspace (créé à l'inscription) ; les liens appartiennent au workspace.

import { eq } from 'drizzle-orm'
import * as schema from './schema'
import type { Db } from './mutations'

/** Crée un workspace + adhésion propriétaire pour un utilisateur. Idempotent-ish :
 *  si l'utilisateur a déjà un workspace, renvoie l'existant. */
export async function ensureWorkspaceForUser(
  db: Db,
  userId: string,
  name: string,
  newId: () => string = () => crypto.randomUUID(),
  now: () => number = () => Date.now(),
): Promise<string> {
  const existing = await db.query.memberships.findFirst({ where: eq(schema.memberships.userId, userId) })
  if (existing) return existing.workspaceId

  const workspaceId = newId()
  await db.insert(schema.workspaces).values({ id: workspaceId, name, plan: 'free', createdAt: now() })
  await db.insert(schema.memberships).values({ userId, workspaceId, role: 'owner' })
  return workspaceId
}

/** Workspace de l'utilisateur (le premier dont il est membre), ou null. */
export async function getUserWorkspaceId(db: Db, userId: string): Promise<string | null> {
  const m = await db.query.memberships.findFirst({ where: eq(schema.memberships.userId, userId) })
  return m?.workspaceId ?? null
}

/** Le domaine partagé link.cg (plateforme). Tous les workspaces créent des liens dessus. */
export async function sharedDomainId(db: Db): Promise<string | null> {
  const d = await db.query.domains.findFirst({ where: eq(schema.domains.hostname, 'link.cg') })
  return d?.id ?? null
}
