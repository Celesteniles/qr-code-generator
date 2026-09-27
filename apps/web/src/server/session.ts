import 'server-only'
import { headers } from 'next/headers'
import { getUserWorkspaceId, ensureWorkspaceForUser } from '@link/db'
import { getAuth } from './auth'
import { getDb } from './data'

export interface SessionContext {
  userId: string
  email: string
  /** Nom saisi à l'inscription (personne ou activité). */
  name: string
  workspaceId: string
}

/**
 * État de la personne qui fait la requête :
 * - `guest` : pas connectée ;
 * - `unverified` : connectée, mais adresse e-mail pas encore confirmée. Elle ne
 *   peut rien faire dans l'espace tant qu'elle n'a pas ouvert le lien reçu
 *   (écran /verifier-email) ;
 * - `ready` : connectée et vérifiée, avec son espace de travail.
 */
export type SessionState =
  | { kind: 'guest' }
  | { kind: 'unverified'; email: string; name: string }
  | { kind: 'ready'; ctx: SessionContext }

async function readSession() {
  return getAuth().api.getSession({ headers: await headers() })
}

/**
 * Session Better Auth brute, seulement si l'adresse est vérifiée ; null sinon
 * (non connecté OU non vérifié). Pour les actions qui s'appuient directement sur
 * Better Auth (page « Mon compte ») : un compte non vérifié n'y fait rien.
 */
export async function getVerifiedSession() {
  const session = await readSession()
  return session?.user.emailVerified ? session : null
}

export async function getSessionState(): Promise<SessionState> {
  const session = await readSession()
  if (!session) return { kind: 'guest' }
  const { user } = session
  if (!user.emailVerified) return { kind: 'unverified', email: user.email, name: user.name || '' }

  const db = getDb()
  const workspaceId =
    (await getUserWorkspaceId(db, user.id)) ??
    (await ensureWorkspaceForUser(db, user.id, user.name || user.email))

  return { kind: 'ready', ctx: { userId: user.id, email: user.email, name: user.name || '', workspaceId } }
}

/**
 * Session courante + espace de travail de l'utilisateur. Renvoie null si non
 * connecté OU si l'adresse e-mail n'est pas vérifiée : c'est le garde réel de
 * toutes les actions serveur et pages de l'espace (la redirection vers
 * /verifier-email n'est que le confort d'affichage, cf. server/viewer.ts). Crée
 * le workspace au vol si absent (robustesse pour comptes anciens).
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const state = await getSessionState()
  return state.kind === 'ready' ? state.ctx : null
}
