// Équipe d'un espace : membres, invitations, droits. Fonctions pures sur la base,
// testées en SQLite (team.test.ts) ; l'application (apps/web) ne fait que lire la
// session et appeler ces fonctions.
//
// Droits :
// - owner (propriétaire, créateur de l'espace) et admin gèrent l'équipe :
//   inviter, révoquer une invitation, retirer un membre ;
// - member utilise l'espace (liens, statistiques) sans gérer ni l'équipe ni la
//   facturation ;
// - le propriétaire ne peut être ni retiré, ni partir de son propre espace.
//
// Chaque fonction qui modifie l'équipe revérifie le rôle de l'acteur en base
// (`actorId`) : l'appelant n'a pas à le faire, et ne peut pas l'oublier.
//
// Invitations : jeton aléatoire de 256 bits envoyé par e-mail ; seul son hachage
// SHA-256 est stocké (une fuite de la base ne donne aucun lien utilisable).
// Valable 7 jours, à usage unique, réservé à l'adresse invitée. Le plafond du
// palier (`maxMembers`) compte les membres ET les invitations en attente.

import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { PLANS, type Plan } from '@link/shared'
import * as schema from './schema'
import { user as authUser } from './auth-schema'
import type { Db } from './mutations'

export type TeamRole = 'owner' | 'admin' | 'member'
export type InviteRole = 'admin' | 'member'

/** Durée de validité d'une invitation. */
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000
/** Délai minimal avant de renvoyer une invitation à la même adresse (anti-relais de spam). */
export const INVITATION_RESEND_DELAY_MS = 60 * 1000

/** Owner et admin gèrent l'équipe ; un simple membre, non. */
export function canManageTeam(role: TeamRole | null | undefined): boolean {
  return role === 'owner' || role === 'admin'
}

/** Seul le propriétaire et les administrateurs voient la facturation. */
export const canManageBilling = canManageTeam

/** Adresse e-mail comparable : sans espaces, en minuscules. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Jeton d'invitation en clair : 32 octets aléatoires, en base64url (43 caractères). */
export function generateInvitationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Hachage SHA-256 (hexadécimal) d'un jeton : seule forme stockée en base. */
export async function hashInvitationToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Forme d'un jeton plausible : évite une requête pour une URL fantaisiste. */
function plausibleToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,128}$/.test(token)
}

export interface TeamDeps {
  db: Db
  newId?: () => string
  now?: () => number
  /** Injecté pour les tests ; generateInvitationToken par défaut. */
  newToken?: () => string
}

// ── Lectures ─────────────────────────────────────────────────────────────────

/** Rôle de l'utilisateur dans l'espace, ou null s'il n'en est pas membre. */
export async function getMemberRole(db: Db, workspaceId: string, userId: string): Promise<TeamRole | null> {
  const m = await db.query.memberships.findFirst({
    where: and(eq(schema.memberships.workspaceId, workspaceId), eq(schema.memberships.userId, userId)),
  })
  return m?.role ?? null
}

export interface UserWorkspace {
  workspaceId: string
  name: string
  plan: Plan
  role: TeamRole
}

/** Espaces dont l'utilisateur est membre (le sien d'abord, puis par nom). */
export async function listUserWorkspaces(db: Db, userId: string): Promise<UserWorkspace[]> {
  const rows = await db
    .select({
      workspaceId: schema.memberships.workspaceId,
      role: schema.memberships.role,
      name: schema.workspaces.name,
      plan: schema.workspaces.plan,
    })
    .from(schema.memberships)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.memberships.workspaceId))
    .where(eq(schema.memberships.userId, userId))
  return rows.sort((a, b) =>
    Number(b.role === 'owner') - Number(a.role === 'owner') || a.name.localeCompare(b.name, 'fr'),
  )
}

/**
 * Espace courant de l'utilisateur :
 * 1. l'espace choisi (`preferred`, ex. cookie), s'il en est toujours membre ;
 * 2. sinon, l'espace rejoint le plus récemment par invitation (quelqu'un
 *    d'invité veut arriver dans l'espace qui l'a invité, même sur un autre
 *    appareil) ;
 * 3. sinon, son propre espace (celui dont il est propriétaire).
 * null s'il n'est membre d'aucun espace.
 */
export async function resolveCurrentWorkspace(
  db: Db,
  { userId, email, preferred }: { userId: string; email: string; preferred?: string | null },
): Promise<UserWorkspace | null> {
  const all = await listUserWorkspaces(db, userId)
  if (!all.length) return null
  const chosen = preferred ? all.find((w) => w.workspaceId === preferred) : undefined
  if (chosen) return chosen

  const joined = all.filter((w) => w.role !== 'owner')
  if (joined.length) {
    const [last] = await db
      .select({ workspaceId: schema.invitations.workspaceId })
      .from(schema.invitations)
      .where(and(
        eq(schema.invitations.email, normalizeEmail(email)),
        isNotNull(schema.invitations.acceptedAt),
        inArray(schema.invitations.workspaceId, joined.map((w) => w.workspaceId)),
      ))
      .orderBy(desc(schema.invitations.acceptedAt))
      .limit(1)
    const recent = last && joined.find((w) => w.workspaceId === last.workspaceId)
    if (recent) return recent
  }
  return all.find((w) => w.role === 'owner') ?? all[0]
}

export interface TeamMember {
  userId: string
  /** Vide si le compte d'identité a disparu. */
  name: string
  email: string
  role: TeamRole
}

export interface PendingInvitation {
  id: string
  email: string
  role: InviteRole
  createdAt: number
  expiresAt: number
  /** Expirée : ne compte plus dans la limite, peut être renvoyée ou supprimée. */
  expired: boolean
}

export interface TeamOverview {
  members: TeamMember[]
  invitations: PendingInvitation[]
  /** Membres + invitations en attente non expirées : ce qui compte pour la limite. */
  seatsUsed: number
}

const ROLE_ORDER: Record<TeamRole, number> = { owner: 0, admin: 1, member: 2 }

/** Membres (propriétaire d'abord) et invitations non acceptées d'un espace. */
export async function listTeam(db: Db, workspaceId: string, now: number = Date.now()): Promise<TeamOverview> {
  const [memberRows, inviteRows] = await Promise.all([
    db
      .select({
        userId: schema.memberships.userId,
        role: schema.memberships.role,
        name: authUser.name,
        email: authUser.email,
      })
      .from(schema.memberships)
      .leftJoin(authUser, eq(authUser.id, schema.memberships.userId))
      .where(eq(schema.memberships.workspaceId, workspaceId)),
    db.query.invitations.findMany({
      where: and(eq(schema.invitations.workspaceId, workspaceId), isNull(schema.invitations.acceptedAt)),
      orderBy: desc(schema.invitations.createdAt),
    }),
  ])

  const members = memberRows
    .map((m): TeamMember => ({ userId: m.userId, role: m.role, name: m.name ?? '', email: m.email ?? '' }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || (a.name || a.email).localeCompare(b.name || b.email, 'fr'))
  const invitations = inviteRows.map((i): PendingInvitation => ({
    id: i.id,
    email: i.email,
    role: i.role,
    createdAt: i.createdAt,
    expiresAt: i.expiresAt,
    expired: i.expiresAt <= now,
  }))
  return { members, invitations, seatsUsed: members.length + invitations.filter((i) => !i.expired).length }
}

export type InvitationStatus = 'pending' | 'expired' | 'accepted'

export interface InvitationPreview {
  id: string
  workspaceId: string
  workspaceName: string
  email: string
  role: InviteRole
  /** Nom (ou adresse) de la personne qui a invité, si le compte existe encore. */
  inviterName: string | null
  expiresAt: number
  status: InvitationStatus
}

/** Invitation désignée par un jeton en clair (page d'acceptation), ou null. */
export async function getInvitationByToken(db: Db, token: string, now: number = Date.now()): Promise<InvitationPreview | null> {
  if (!plausibleToken(token)) return null
  const tokenHash = await hashInvitationToken(token)
  const [row] = await db
    .select({
      inv: schema.invitations,
      workspaceName: schema.workspaces.name,
      inviterName: authUser.name,
      inviterEmail: authUser.email,
    })
    .from(schema.invitations)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.invitations.workspaceId))
    .leftJoin(authUser, eq(authUser.id, schema.invitations.invitedBy))
    .where(eq(schema.invitations.tokenHash, tokenHash))
    .limit(1)
  if (!row) return null
  const { inv } = row
  return {
    id: inv.id,
    workspaceId: inv.workspaceId,
    workspaceName: row.workspaceName,
    email: inv.email,
    role: inv.role,
    inviterName: row.inviterName || row.inviterEmail || null,
    expiresAt: inv.expiresAt,
    status: inv.acceptedAt !== null ? 'accepted' : inv.expiresAt <= now ? 'expired' : 'pending',
  }
}

// ── Invitations ──────────────────────────────────────────────────────────────

export const createInvitationInput = z.object({
  workspaceId: z.string().min(1),
  email: z.string().trim().toLowerCase().max(254, 'adresse trop longue').email('adresse e-mail invalide'),
  role: z.enum(['admin', 'member']).default('member'),
  /** Utilisateur (Better Auth) qui invite : doit être owner ou admin de l'espace. */
  invitedBy: z.string().min(1),
})
export type CreateInvitationInput = z.input<typeof createInvitationInput>

export type CreateInvitationResult =
  | { ok: true; id: string; token: string; email: string; expiresAt: number }
  | { ok: false; error: 'invalid'; issues: string[] }
  | { ok: false; error: 'forbidden' }
  | { ok: false; error: 'workspace_not_found' }
  | { ok: false; error: 'already_member' }
  | { ok: false; error: 'too_soon' }
  | { ok: false; error: 'limit_reached'; max: number }

/**
 * Invite une adresse dans un espace. Renvoie le jeton EN CLAIR (à mettre dans
 * l'e-mail, jamais ailleurs). Une invitation encore ouverte pour la même adresse
 * est remplacée (l'ancien lien cesse de fonctionner).
 */
export async function createInvitation(deps: TeamDeps, raw: CreateInvitationInput): Promise<CreateInvitationResult> {
  const parsed = createInvitationInput.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'invalid', issues: parsed.error.issues.map((i) => i.message) }
  const input = parsed.data
  const { db } = deps
  const now = (deps.now ?? Date.now)()

  if (!canManageTeam(await getMemberRole(db, input.workspaceId, input.invitedBy))) return { ok: false, error: 'forbidden' }
  const ws = await db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, input.workspaceId) })
  if (!ws) return { ok: false, error: 'workspace_not_found' }

  // Déjà membre ? (le compte d'identité porte l'adresse, l'adhésion porte l'id)
  const [existing] = await db
    .select({ userId: schema.memberships.userId })
    .from(schema.memberships)
    .innerJoin(authUser, eq(authUser.id, schema.memberships.userId))
    .where(and(eq(schema.memberships.workspaceId, input.workspaceId), sql`lower(${authUser.email}) = ${input.email}`))
    .limit(1)
  if (existing) return { ok: false, error: 'already_member' }

  // Ré-invitation : l'invitation ouverte pour cette adresse est remplacée, pas
  // dupliquée. Pas plus d'un envoi par minute vers la même adresse.
  const previous = await db.query.invitations.findMany({
    where: and(
      eq(schema.invitations.workspaceId, input.workspaceId),
      eq(schema.invitations.email, input.email),
      isNull(schema.invitations.acceptedAt),
    ),
  })
  if (previous.some((p) => now - p.createdAt < INVITATION_RESEND_DELAY_MS)) return { ok: false, error: 'too_soon' }

  const max = PLANS[ws.plan].maxMembers
  const id = (deps.newId ?? (() => crypto.randomUUID()))()
  const token = (deps.newToken ?? generateInvitationToken)()
  const tokenHash = await hashInvitationToken(token)
  const expiresAt = now + INVITATION_TTL_MS

  // Suppression de l'ancienne et insertion dans un même lot (un seul aller-retour
  // D1). L'invitation remplacée ne compte pas dans la limite (même adresse).
  const removePrevious = db.delete(schema.invitations).where(and(
    eq(schema.invitations.workspaceId, input.workspaceId),
    eq(schema.invitations.email, input.email),
    isNull(schema.invitations.acceptedAt),
  ))
  // Plafond du palier : compté ET inséré en une seule instruction (deux
  // invitations simultanées ne peuvent pas dépasser la limite). Les invitations
  // expirées ne comptent pas.
  const insert = max === null
    ? db.insert(schema.invitations).values({
        id, workspaceId: input.workspaceId, email: input.email, role: input.role, tokenHash,
        invitedBy: input.invitedBy, createdAt: now, expiresAt,
      }).returning({ id: schema.invitations.id })
    : db.insert(schema.invitations).select(sql`
        SELECT ${id}, ${input.workspaceId}, ${input.email}, ${input.role}, ${tokenHash}, ${input.invitedBy}, ${now}, ${expiresAt}, NULL
        WHERE (SELECT count(*) FROM memberships WHERE workspace_id = ${input.workspaceId})
            + (SELECT count(*) FROM invitations WHERE workspace_id = ${input.workspaceId}
                 AND accepted_at IS NULL AND expires_at > ${now} AND email <> ${input.email}) < ${max}`,
      ).returning({ id: schema.invitations.id })

  const [, inserted] = await db.batch([removePrevious, insert])
  if (inserted.length === 0) {
    // Le lot a supprimé l'ancienne invitation avant l'insertion refusée : on la remet.
    if (previous.length) await db.insert(schema.invitations).values(previous)
    return { ok: false, error: 'limit_reached', max: max ?? 0 }
  }
  return { ok: true, id, token, email: input.email, expiresAt }
}

export type RevokeInvitationResult = { ok: true } | { ok: false; error: 'forbidden' | 'not_found' }

/** Annule une invitation non acceptée de l'espace (l'id d'un autre espace est ignoré). */
export async function revokeInvitation(
  db: Db,
  { workspaceId, invitationId, actorId }: { workspaceId: string; invitationId: string; actorId: string },
): Promise<RevokeInvitationResult> {
  if (!canManageTeam(await getMemberRole(db, workspaceId, actorId))) return { ok: false, error: 'forbidden' }
  const deleted = await db
    .delete(schema.invitations)
    .where(and(
      eq(schema.invitations.id, invitationId),
      eq(schema.invitations.workspaceId, workspaceId),
      isNull(schema.invitations.acceptedAt),
    ))
    .returning({ id: schema.invitations.id })
  return deleted.length ? { ok: true } : { ok: false, error: 'not_found' }
}

export type AcceptInvitationResult =
  | { ok: true; workspaceId: string; alreadyMember: boolean }
  | { ok: false; error: 'not_found' | 'expired' | 'already_used' | 'email_mismatch' }
  | { ok: false; error: 'limit_reached'; max: number }

/**
 * Accepte une invitation pour l'utilisateur connecté. `userEmail` doit être une
 * adresse VÉRIFIÉE (c'est elle qui prouve que la personne est bien l'invitée) :
 * l'appelant ne transmet que la session d'un compte vérifié.
 */
export async function acceptInvitation(
  deps: TeamDeps,
  { token, userId, userEmail }: { token: string; userId: string; userEmail: string },
): Promise<AcceptInvitationResult> {
  const { db } = deps
  const now = (deps.now ?? Date.now)()
  if (!plausibleToken(token)) return { ok: false, error: 'not_found' }
  const tokenHash = await hashInvitationToken(token)
  const inv = await db.query.invitations.findFirst({ where: eq(schema.invitations.tokenHash, tokenHash) })
  if (!inv) return { ok: false, error: 'not_found' }
  if (inv.acceptedAt !== null) return { ok: false, error: 'already_used' }
  if (inv.expiresAt <= now) return { ok: false, error: 'expired' }
  if (normalizeEmail(inv.email) !== normalizeEmail(userEmail)) return { ok: false, error: 'email_mismatch' }

  const already = await getMemberRole(db, inv.workspaceId, userId)
  if (!already) {
    // La place était réservée par l'invitation ; revérifiée au cas où le palier
    // aurait baissé depuis l'envoi.
    const ws = await db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, inv.workspaceId) })
    if (!ws) return { ok: false, error: 'not_found' }
    const max = PLANS[ws.plan].maxMembers
    if (max !== null) {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)` })
        .from(schema.memberships)
        .where(eq(schema.memberships.workspaceId, inv.workspaceId))
      if (n >= max) return { ok: false, error: 'limit_reached', max }
    }
  }

  // Usage unique : seul le premier à poser accepted_at gagne (deux onglets, deux clics).
  const claimed = await db
    .update(schema.invitations)
    .set({ acceptedAt: now })
    .where(and(eq(schema.invitations.id, inv.id), isNull(schema.invitations.acceptedAt), gt(schema.invitations.expiresAt, now)))
    .returning({ id: schema.invitations.id })
  if (!claimed.length) return { ok: false, error: 'already_used' }

  if (!already) {
    await db.insert(schema.memberships)
      .values({ userId, workspaceId: inv.workspaceId, role: inv.role })
      .onConflictDoNothing()
  }
  return { ok: true, workspaceId: inv.workspaceId, alreadyMember: already !== null }
}

// ── Membres ──────────────────────────────────────────────────────────────────

export type RemoveMemberResult =
  | { ok: true }
  | { ok: false; error: 'forbidden' | 'not_found' | 'cannot_remove_owner' }

/**
 * Retire `userId` de l'espace. Owner/admin retirent n'importe quel membre sauf le
 * propriétaire ; un membre (ou un admin) peut aussi se retirer lui-même
 * (« Quitter l'espace »). Le propriétaire ne quitte jamais son espace.
 */
export async function removeMember(
  db: Db,
  { workspaceId, userId, actorId }: { workspaceId: string; userId: string; actorId: string },
): Promise<RemoveMemberResult> {
  const actorRole = await getMemberRole(db, workspaceId, actorId)
  if (!actorRole) return { ok: false, error: 'forbidden' }
  if (actorId !== userId && !canManageTeam(actorRole)) return { ok: false, error: 'forbidden' }

  const targetRole = actorId === userId ? actorRole : await getMemberRole(db, workspaceId, userId)
  if (!targetRole) return { ok: false, error: 'not_found' }
  if (targetRole === 'owner') return { ok: false, error: 'cannot_remove_owner' }

  await db.delete(schema.memberships).where(and(
    eq(schema.memberships.workspaceId, workspaceId),
    eq(schema.memberships.userId, userId),
    // Garde-fou en base : même en cas de course, jamais le propriétaire.
    sql`${schema.memberships.role} <> 'owner'`,
  ))
  return { ok: true }
}
