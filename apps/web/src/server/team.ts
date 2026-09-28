'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  acceptInvitation, createInvitation, getWorkspace, listUserWorkspaces, removeMember, revokeInvitation,
  INVITATION_TTL_MS,
} from '@link/db'
import { PLANS } from '@link/shared'
import { getDb } from './data'
import { getSessionContext, WORKSPACE_COOKIE } from './session'
import { sendEmail } from './email'
import { invitationEmail } from './email-templates/invitation'

// Actions de l'onglet « Équipe » (/compte/equipe) et de la page /invitation/[token].
// L'espace visé est TOUJOURS l'espace courant de la session (jamais un id venu du
// navigateur) ; les droits (owner/admin) sont revérifiés en base par @link/db.

export type TeamState = { ok: true; message?: string } | { ok: false; message: string } | null

const EXPIRED = 'Votre session a expiré. Reconnectez-vous puis réessayez.'
const FORBIDDEN = 'Seuls le propriétaire et les administrateurs de l’espace peuvent gérer l’équipe.'
const VALIDITY_DAYS = Math.round(INVITATION_TTL_MS / (24 * 60 * 60 * 1000))

/** Mémorise l'espace choisi (préférence : revalidée à chaque requête, cf. session.ts). */
async function rememberWorkspace(workspaceId: string) {
  ;(await cookies()).set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}

/** Invite une adresse (ou renvoie une invitation : la précédente est remplacée). */
export async function inviteMemberAction(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const ctx = await getSessionContext()
  if (!ctx) return { ok: false, message: EXPIRED }
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { ok: false, message: 'Indiquez l’adresse e-mail de la personne à inviter.' }
  const role = String(formData.get('role') ?? 'member') === 'admin' ? 'admin' : 'member'

  const db = getDb()
  const res = await createInvitation({ db }, { workspaceId: ctx.workspaceId, email, role, invitedBy: ctx.userId })
  if (!res.ok) {
    const plan = (await getWorkspace(db, ctx.workspaceId))?.plan ?? 'free'
    return {
      ok: false,
      message:
        res.error === 'invalid' ? 'Cette adresse e-mail ne semble pas valide. Vérifiez-la, puis réessayez.'
        : res.error === 'forbidden' ? FORBIDDEN
        : res.error === 'already_member' ? 'Cette personne fait déjà partie de l’espace.'
        : res.error === 'too_soon' ? 'Une invitation vient de partir vers cette adresse. Patientez une minute avant de la renvoyer.'
        : res.error === 'limit_reached'
          ? res.max <= 1
            ? `L’offre ${PLANS[plan].label} ne comprend qu’un utilisateur. Passez à l’offre Business pour inviter votre équipe.`
            : `L’offre ${PLANS[plan].label} permet ${res.max} utilisateurs, invitations en attente comprises. Annulez une invitation ou passez à l’offre supérieure.`
        : 'L’invitation n’a pas pu être créée. Réessayez dans un instant.',
    }
  }

  const { env } = getCloudflareContext()
  const url = `${env.BETTER_AUTH_URL.replace(/\/+$/, '')}/invitation/${res.token}`
  const ws = await getWorkspace(db, ctx.workspaceId)
  const mail = invitationEmail({
    inviterName: ctx.name || ctx.email,
    workspaceName: ws?.name ?? '',
    role,
    url,
    validityDays: VALIDITY_DAYS,
  })
  revalidatePath('/compte/equipe')
  try {
    await sendEmail({ to: res.email, ...mail })
  } catch (e) {
    console.error('[equipe] e-mail d’invitation non envoyé', e)
    // En développement seulement (pas de clé Brevo) : le lien dans la console.
    if (process.env.NODE_ENV !== 'production') console.info('[equipe] lien d’invitation (dev) :', url)
    return {
      ok: false,
      message: `L’invitation pour ${res.email} est enregistrée, mais l’e-mail n’a pas pu partir. Réessayez dans une minute avec « Renvoyer ».`,
    }
  }
  return { ok: true, message: `Invitation envoyée à ${res.email}. Le lien reste valable ${VALIDITY_DAYS} jours.` }
}

/** Annule une invitation en attente de l'espace courant. */
export async function revokeInvitationAction(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const ctx = await getSessionContext()
  if (!ctx) return { ok: false, message: EXPIRED }
  const invitationId = String(formData.get('id') ?? '')
  const res = await revokeInvitation(getDb(), { workspaceId: ctx.workspaceId, invitationId, actorId: ctx.userId })
  revalidatePath('/compte/equipe')
  if (!res.ok) {
    return { ok: false, message: res.error === 'forbidden' ? FORBIDDEN : 'Cette invitation n’existe plus : elle a déjà été acceptée ou annulée.' }
  }
  return { ok: true, message: 'Invitation annulée : son lien ne fonctionne plus.' }
}

/** Retire un membre de l'espace courant (ou, pour soi-même, quitte l'espace). */
export async function removeMemberAction(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const ctx = await getSessionContext()
  if (!ctx) return { ok: false, message: EXPIRED }
  const userId = String(formData.get('userId') ?? '')
  const res = await removeMember(getDb(), { workspaceId: ctx.workspaceId, userId, actorId: ctx.userId })
  if (!res.ok) {
    return {
      ok: false,
      message:
        res.error === 'cannot_remove_owner' ? 'Le propriétaire de l’espace ne peut pas en être retiré.'
        : res.error === 'forbidden' ? FORBIDDEN
        : 'Cette personne ne fait déjà plus partie de l’espace.',
    }
  }
  if (userId === ctx.userId) {
    // On vient de quitter l'espace courant : retour à son propre espace.
    ;(await cookies()).delete(WORKSPACE_COOKIE)
    revalidatePath('/', 'layout')
    redirect('/')
  }
  revalidatePath('/compte/equipe')
  return { ok: true, message: 'Cette personne n’a plus accès à l’espace.' }
}

/** Ouvre un autre espace dont l'utilisateur est membre. */
export async function switchWorkspaceAction(formData: FormData): Promise<void> {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/connexion?next=/compte/equipe')
  const workspaceId = String(formData.get('workspaceId') ?? '')
  const spaces = await listUserWorkspaces(getDb(), ctx.userId)
  // Anti-IDOR : seulement un espace dont on est membre.
  if (!spaces.some((w) => w.workspaceId === workspaceId)) return
  await rememberWorkspace(workspaceId)
  revalidatePath('/', 'layout')
  redirect('/')
}

/** Accepte l'invitation du lien reçu par e-mail, puis ouvre l'espace rejoint. */
export async function acceptInvitationAction(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const token = String(formData.get('token') ?? '')
  const ctx = await getSessionContext()
  if (!ctx) return { ok: false, message: EXPIRED }
  const res = await acceptInvitation({ db: getDb() }, { token, userId: ctx.userId, userEmail: ctx.email })
  if (!res.ok) {
    return {
      ok: false,
      message:
        res.error === 'expired' ? 'Cette invitation a expiré. Demandez à la personne qui vous a invité de vous en envoyer une nouvelle.'
        : res.error === 'already_used' ? 'Cette invitation a déjà été utilisée.'
        : res.error === 'email_mismatch' ? `Cette invitation est destinée à une autre adresse que ${ctx.email}. Déconnectez-vous, puis ouvrez de nouveau le lien avec le bon compte.`
        : res.error === 'limit_reached' ? 'L’espace a atteint le nombre d’utilisateurs de son offre. Prévenez la personne qui vous a invité.'
        : 'Cette invitation n’existe pas ou a été annulée.',
    }
  }
  await rememberWorkspace(res.workspaceId)
  revalidatePath('/', 'layout')
  redirect('/')
}
