'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { authSchema } from '@link/db'
import { getAuth } from './auth'

// Actions de la page « Mon compte ». Chacune relit la session côté serveur :
// on n'agit jamais sur un identifiant fourni par le navigateur sans vérifier
// qu'il appartient bien à l'utilisateur connecté.
//
// Le changement de mot de passe passe par le client Better Auth
// (/api/auth/change-password) : il y bénéficie de la limitation d'essais et du
// renouvellement du cookie de session.

export type AccountState = { ok: true; message?: string } | { ok: false; message: string } | null

const NAME_MAX = 80

/** Modifie le nom affiché (personne ou activité). */
export async function updateNameAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const name = String(formData.get('name') ?? '').replace(/\s+/g, ' ').trim()
  if (!name) return { ok: false, message: 'Indiquez un nom : le vôtre ou celui de votre activité.' }
  if (name.length > NAME_MAX) return { ok: false, message: `Ce nom est un peu long : ${NAME_MAX} caractères maximum.` }

  const h = await headers()
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: h })
  if (!session) return { ok: false, message: 'Votre session a expiré. Reconnectez-vous puis réessayez.' }
  if (session.user.name === name) return { ok: true }

  try {
    await auth.api.updateUser({ body: { name }, headers: h })
  } catch {
    return { ok: false, message: 'Le nom n\'a pas pu être enregistré. Réessayez dans un instant.' }
  }
  // La coquille (barre latérale) affiche aussi le nom.
  revalidatePath('/', 'layout')
  return { ok: true }
}

/** Déconnecte UNE autre session de l'utilisateur, désignée par son identifiant. */
export async function revokeSessionAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: 'Appareil introuvable.' }

  const h = await headers()
  const auth = getAuth()
  const current = await auth.api.getSession({ headers: h })
  if (!current) return { ok: false, message: 'Votre session a expiré. Reconnectez-vous puis réessayez.' }
  if (id === current.session.id) {
    return { ok: false, message: 'Pour quitter cet appareil, utilisez le bouton « Se déconnecter ».' }
  }

  // Anti-IDOR : la session doit appartenir à l'utilisateur connecté.
  const db = drizzle(getCloudflareContext().env.DB, { schema: authSchema })
  const [row] = await db
    .select({ token: authSchema.session.token })
    .from(authSchema.session)
    .where(and(eq(authSchema.session.id, id), eq(authSchema.session.userId, current.user.id)))
    .limit(1)
  // Déjà déconnecté (ou pas à vous) : même réponse, rien à révéler.
  if (row) {
    try {
      await auth.api.revokeSession({ body: { token: row.token }, headers: h })
    } catch {
      return { ok: false, message: 'L\'appareil n\'a pas pu être déconnecté. Réessayez dans un instant.' }
    }
  }
  revalidatePath('/compte')
  return { ok: true, message: 'Cet appareil est déconnecté. Il devra se reconnecter avec votre mot de passe.' }
}

/** Déconnecte toutes les sessions sauf celle en cours. */
export async function revokeOtherSessionsAction(): Promise<AccountState> {
  const h = await headers()
  const auth = getAuth()
  const current = await auth.api.getSession({ headers: h })
  if (!current) return { ok: false, message: 'Votre session a expiré. Reconnectez-vous puis réessayez.' }
  try {
    await auth.api.revokeOtherSessions({ headers: h })
  } catch {
    return { ok: false, message: 'Les autres appareils n\'ont pas pu être déconnectés. Réessayez dans un instant.' }
  }
  revalidatePath('/compte')
  return { ok: true, message: 'Tous vos autres appareils sont déconnectés. Seul celui-ci reste connecté.' }
}
