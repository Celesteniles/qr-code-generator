import 'server-only'
import { headers } from 'next/headers'
import { getUserWorkspaceId, ensureWorkspaceForUser } from '@link/db'
import { getAuth } from './auth'
import { getDb } from './data'

export interface SessionContext {
  userId: string
  email: string
  workspaceId: string
}

/**
 * Session courante + espace de travail de l'utilisateur. Renvoie null si non
 * connecté. Crée le workspace au vol si absent (robustesse pour comptes anciens).
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) return null

  const db = getDb()
  const workspaceId =
    (await getUserWorkspaceId(db, session.user.id)) ??
    (await ensureWorkspaceForUser(db, session.user.id, session.user.name || session.user.email))

  return { userId: session.user.id, email: session.user.email, workspaceId }
}
