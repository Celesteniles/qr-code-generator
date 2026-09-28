import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { and, eq } from 'drizzle-orm'
import * as schema from './schema'
import { user as authUser } from './auth-schema'
import type { Db } from './mutations'
import {
  acceptInvitation, canManageTeam, createInvitation, generateInvitationToken, getInvitationByToken,
  getMemberRole, hashInvitationToken, listTeam, listUserWorkspaces, removeMember, resolveCurrentWorkspace,
  revokeInvitation, INVITATION_RESEND_DELAY_MS, INVITATION_TTL_MS,
} from './team'

// Base SQLite en mémoire avec TOUTES les migrations réelles, dans l'ordre.
async function freshDb(): Promise<Db> {
  const client = createClient({ url: ':memory:' })
  const migDir = join(__dirname, '..', 'migrations')
  for (const file of readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(migDir, file), 'utf8')
    for (const stmt of sql.split('--> statement-breakpoint')) {
      const s = stmt.trim()
      if (s) await client.execute(s)
    }
  }
  return drizzle(client, { schema }) as unknown as Db
}

const T0 = Date.parse('2026-09-01T10:00:00Z')
const MIN = 60_000

let db: Db
let seq = 0
const deps = (now = T0) => ({ db, now: () => now, newId: () => `inv_${++seq}`, newToken: () => `jeton-de-test-${String(++seq).padStart(4, '0')}-xxxxxxxx` })

async function addUser(id: string, email: string, name = id) {
  await db.insert(authUser).values({ id, email, name, emailVerified: true, createdAt: new Date(0), updatedAt: new Date(0) })
}

/** Espace + propriétaire. */
async function addWorkspace(id: string, owner: string, plan: 'free' | 'pro' | 'business' | 'enterprise' = 'business') {
  await db.insert(schema.workspaces).values({ id, name: `Espace ${id}`, plan, createdAt: 0 })
  await db.insert(schema.memberships).values({ userId: owner, workspaceId: id, role: 'owner' })
}

async function invite(email: string, opts: { ws?: string; by?: string; role?: 'admin' | 'member'; now?: number } = {}) {
  return createInvitation(deps(opts.now), { workspaceId: opts.ws ?? 'ws_a', email, role: opts.role, invitedBy: opts.by ?? 'u_owner' })
}

beforeEach(async () => {
  db = await freshDb()
  seq = 0
  await addUser('u_owner', 'patron@exemple.cg', 'Patron')
  await addUser('u_ami', 'ami@exemple.cg', 'Ami')
  await addUser('u_autre', 'autre@exemple.cg', 'Autre')
  await addWorkspace('ws_a', 'u_owner')
  await addWorkspace('ws_ami', 'u_ami', 'free')
  await addWorkspace('ws_autre', 'u_autre', 'free')
})

describe('jetons', () => {
  it('génère des jetons forts et distincts (base64url, 256 bits)', () => {
    const a = generateInvitationToken()
    const b = generateInvitationToken()
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(a).not.toBe(b)
  })

  it('hache en SHA-256 hexadécimal', async () => {
    expect(await hashInvitationToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

describe('createInvitation', () => {
  it('stocke seulement le hachage, expire dans 7 jours, normalise l’adresse', async () => {
    const res = await invite('  Ami@Exemple.CG ')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.email).toBe('ami@exemple.cg')
    expect(res.expiresAt).toBe(T0 + INVITATION_TTL_MS)
    const row = await db.query.invitations.findFirst({ where: eq(schema.invitations.id, res.id) })
    expect(row?.tokenHash).toBe(await hashInvitationToken(res.token))
    expect(JSON.stringify(row)).not.toContain(res.token)
    expect(row?.role).toBe('member')
  })

  it('refuse une adresse invalide', async () => {
    const res = await invite('pas-une-adresse')
    expect(res).toMatchObject({ ok: false, error: 'invalid' })
  })

  it('refuse un simple membre ou un inconnu', async () => {
    await db.insert(schema.memberships).values({ userId: 'u_ami', workspaceId: 'ws_a', role: 'member' })
    expect(await invite('x@exemple.cg', { by: 'u_ami' })).toEqual({ ok: false, error: 'forbidden' })
    expect(await invite('x@exemple.cg', { by: 'u_autre' })).toEqual({ ok: false, error: 'forbidden' })
  })

  it('autorise un admin', async () => {
    await db.insert(schema.memberships).values({ userId: 'u_ami', workspaceId: 'ws_a', role: 'admin' })
    expect((await invite('x@exemple.cg', { by: 'u_ami' })).ok).toBe(true)
  })

  it('refuse une personne déjà membre (adresse sans tenir compte de la casse)', async () => {
    await db.insert(schema.memberships).values({ userId: 'u_ami', workspaceId: 'ws_a', role: 'member' })
    expect(await invite('AMI@exemple.cg')).toEqual({ ok: false, error: 'already_member' })
    expect(await invite('patron@exemple.cg')).toEqual({ ok: false, error: 'already_member' })
  })

  it('compte membres + invitations en attente dans la limite du palier (Business : 3)', async () => {
    expect((await invite('a@exemple.cg')).ok).toBe(true)
    expect((await invite('b@exemple.cg')).ok).toBe(true)
    // Propriétaire + 2 invitations = 3 : plus de place.
    expect(await invite('c@exemple.cg')).toEqual({ ok: false, error: 'limit_reached', max: 3 })
    const rows = await db.query.invitations.findMany({ where: eq(schema.invitations.workspaceId, 'ws_a') })
    expect(rows.map((r) => r.email).sort()).toEqual(['a@exemple.cg', 'b@exemple.cg'])
  })

  it('ne compte pas les invitations expirées', async () => {
    await invite('a@exemple.cg')
    await invite('b@exemple.cg')
    expect((await invite('c@exemple.cg', { now: T0 + INVITATION_TTL_MS })).ok).toBe(true)
  })

  it('refuse toute invitation sur les paliers à un seul utilisateur', async () => {
    expect(await invite('x@exemple.cg', { ws: 'ws_ami', by: 'u_ami' })).toEqual({ ok: false, error: 'limit_reached', max: 1 })
  })

  it('pas de limite en Entreprise', async () => {
    await db.update(schema.workspaces).set({ plan: 'enterprise' }).where(eq(schema.workspaces.id, 'ws_a'))
    for (let i = 0; i < 6; i++) expect((await invite(`p${i}@exemple.cg`)).ok).toBe(true)
  })

  it('ré-inviter remplace l’ancienne invitation (l’ancien lien ne marche plus)', async () => {
    const first = await invite('a@exemple.cg')
    await invite('b@exemple.cg')
    // Même avec la limite atteinte : l'invitation remplacée libère sa place.
    const second = await invite('A@exemple.cg', { role: 'admin', now: T0 + 2 * MIN })
    expect(second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    const rows = await db.query.invitations.findMany({
      where: and(eq(schema.invitations.workspaceId, 'ws_a'), eq(schema.invitations.email, 'a@exemple.cg')),
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: second.id, role: 'admin' })
    expect(await getInvitationByToken(db, first.token, T0)).toBeNull()
  })

  it('pas deux envois vers la même adresse dans la minute', async () => {
    await invite('a@exemple.cg')
    expect(await invite('a@exemple.cg', { now: T0 + INVITATION_RESEND_DELAY_MS - 1 })).toEqual({ ok: false, error: 'too_soon' })
    expect((await invite('a@exemple.cg', { now: T0 + INVITATION_RESEND_DELAY_MS })).ok).toBe(true)
  })
})

describe('acceptInvitation', () => {
  it('crée l’adhésion avec le rôle invité et consomme le jeton', async () => {
    const inv = await invite('ami@exemple.cg', { role: 'admin' })
    if (!inv.ok) throw new Error('invitation')
    const res = await acceptInvitation(deps(T0 + MIN), { token: inv.token, userId: 'u_ami', userEmail: 'Ami@exemple.cg' })
    expect(res).toEqual({ ok: true, workspaceId: 'ws_a', alreadyMember: false })
    expect(await getMemberRole(db, 'ws_a', 'u_ami')).toBe('admin')
    // Usage unique.
    expect(await acceptInvitation(deps(T0 + MIN), { token: inv.token, userId: 'u_ami', userEmail: 'ami@exemple.cg' }))
      .toEqual({ ok: false, error: 'already_used' })
    expect((await getInvitationByToken(db, inv.token, T0 + MIN))?.status).toBe('accepted')
  })

  it('refuse un jeton inconnu ou fantaisiste', async () => {
    expect(await acceptInvitation(deps(), { token: 'inconnu-mais-bien-forme-123', userId: 'u_ami', userEmail: 'ami@exemple.cg' }))
      .toEqual({ ok: false, error: 'not_found' })
    expect(await acceptInvitation(deps(), { token: "x' OR 1=1", userId: 'u_ami', userEmail: 'ami@exemple.cg' }))
      .toEqual({ ok: false, error: 'not_found' })
  })

  it('refuse un jeton expiré', async () => {
    const inv = await invite('ami@exemple.cg')
    if (!inv.ok) throw new Error('invitation')
    expect(await acceptInvitation(deps(T0 + INVITATION_TTL_MS), { token: inv.token, userId: 'u_ami', userEmail: 'ami@exemple.cg' }))
      .toEqual({ ok: false, error: 'expired' })
    expect(await getMemberRole(db, 'ws_a', 'u_ami')).toBeNull()
  })

  it('refuse si le compte connecté n’a pas l’adresse invitée', async () => {
    const inv = await invite('ami@exemple.cg')
    if (!inv.ok) throw new Error('invitation')
    expect(await acceptInvitation(deps(), { token: inv.token, userId: 'u_autre', userEmail: 'autre@exemple.cg' }))
      .toEqual({ ok: false, error: 'email_mismatch' })
    expect(await getMemberRole(db, 'ws_a', 'u_autre')).toBeNull()
    // L'invitation reste utilisable par la bonne personne.
    expect((await acceptInvitation(deps(), { token: inv.token, userId: 'u_ami', userEmail: 'ami@exemple.cg' })).ok).toBe(true)
  })

  it('refuse si le palier a baissé entre-temps', async () => {
    const inv = await invite('ami@exemple.cg')
    if (!inv.ok) throw new Error('invitation')
    await db.update(schema.workspaces).set({ plan: 'pro' }).where(eq(schema.workspaces.id, 'ws_a'))
    expect(await acceptInvitation(deps(), { token: inv.token, userId: 'u_ami', userEmail: 'ami@exemple.cg' }))
      .toEqual({ ok: false, error: 'limit_reached', max: 1 })
  })
})

describe('revokeInvitation', () => {
  it('supprime l’invitation : son lien ne marche plus', async () => {
    const inv = await invite('ami@exemple.cg')
    if (!inv.ok) throw new Error('invitation')
    expect(await revokeInvitation(db, { workspaceId: 'ws_a', invitationId: inv.id, actorId: 'u_owner' })).toEqual({ ok: true })
    expect(await acceptInvitation(deps(), { token: inv.token, userId: 'u_ami', userEmail: 'ami@exemple.cg' }))
      .toEqual({ ok: false, error: 'not_found' })
  })

  it('ignore l’invitation d’un autre espace (anti-IDOR) et refuse un simple membre', async () => {
    const inv = await invite('x@exemple.cg')
    if (!inv.ok) throw new Error('invitation')
    expect(await revokeInvitation(db, { workspaceId: 'ws_autre', invitationId: inv.id, actorId: 'u_autre' }))
      .toEqual({ ok: false, error: 'not_found' })
    await db.insert(schema.memberships).values({ userId: 'u_ami', workspaceId: 'ws_a', role: 'member' })
    expect(await revokeInvitation(db, { workspaceId: 'ws_a', invitationId: inv.id, actorId: 'u_ami' }))
      .toEqual({ ok: false, error: 'forbidden' })
    expect(await db.query.invitations.findFirst({ where: eq(schema.invitations.id, inv.id) })).toBeTruthy()
  })
})

describe('removeMember', () => {
  beforeEach(async () => {
    await db.insert(schema.memberships).values([
      { userId: 'u_ami', workspaceId: 'ws_a', role: 'admin' },
      { userId: 'u_autre', workspaceId: 'ws_a', role: 'member' },
    ])
  })

  it('le propriétaire ne peut pas être retiré, ni partir', async () => {
    expect(await removeMember(db, { workspaceId: 'ws_a', userId: 'u_owner', actorId: 'u_ami' }))
      .toEqual({ ok: false, error: 'cannot_remove_owner' })
    expect(await removeMember(db, { workspaceId: 'ws_a', userId: 'u_owner', actorId: 'u_owner' }))
      .toEqual({ ok: false, error: 'cannot_remove_owner' })
    expect(await getMemberRole(db, 'ws_a', 'u_owner')).toBe('owner')
  })

  it('un admin retire un membre ; un membre ne retire personne d’autre', async () => {
    expect(await removeMember(db, { workspaceId: 'ws_a', userId: 'u_ami', actorId: 'u_autre' }))
      .toEqual({ ok: false, error: 'forbidden' })
    expect(await removeMember(db, { workspaceId: 'ws_a', userId: 'u_autre', actorId: 'u_ami' })).toEqual({ ok: true })
    expect(await getMemberRole(db, 'ws_a', 'u_autre')).toBeNull()
    // Son propre espace n'est pas touché.
    expect(await getMemberRole(db, 'ws_autre', 'u_autre')).toBe('owner')
  })

  it('un membre peut quitter l’espace', async () => {
    expect(await removeMember(db, { workspaceId: 'ws_a', userId: 'u_autre', actorId: 'u_autre' })).toEqual({ ok: true })
    expect(await getMemberRole(db, 'ws_a', 'u_autre')).toBeNull()
  })

  it('un étranger à l’espace ne peut rien', async () => {
    await addUser('u_x', 'x@exemple.cg')
    expect(await removeMember(db, { workspaceId: 'ws_a', userId: 'u_autre', actorId: 'u_x' }))
      .toEqual({ ok: false, error: 'forbidden' })
  })
})

describe('listTeam', () => {
  it('liste membres (propriétaire d’abord) et invitations, avec les places occupées', async () => {
    await db.insert(schema.memberships).values({ userId: 'u_ami', workspaceId: 'ws_a', role: 'member' })
    await invite('a@exemple.cg')
    await db.update(schema.workspaces).set({ plan: 'enterprise' }).where(eq(schema.workspaces.id, 'ws_a'))
    await invite('b@exemple.cg', { now: T0 - INVITATION_TTL_MS })
    const team = await listTeam(db, 'ws_a', T0)
    expect(team.members.map((m) => [m.email, m.role])).toEqual([['patron@exemple.cg', 'owner'], ['ami@exemple.cg', 'member']])
    expect(team.invitations.map((i) => [i.email, i.expired])).toEqual([['a@exemple.cg', false], ['b@exemple.cg', true]])
    expect(team.seatsUsed).toBe(3)
  })
})

describe('espace courant', () => {
  it('rôles de gestion', () => {
    expect([canManageTeam('owner'), canManageTeam('admin'), canManageTeam('member'), canManageTeam(null)])
      .toEqual([true, true, false, false])
  })

  it('invité : l’espace qui l’a invité ; sinon le choix mémorisé ; sinon le sien', async () => {
    expect((await resolveCurrentWorkspace(db, { userId: 'u_ami', email: 'ami@exemple.cg' }))?.workspaceId).toBe('ws_ami')

    const inv = await invite('ami@exemple.cg')
    if (!inv.ok) throw new Error('invitation')
    await acceptInvitation(deps(), { token: inv.token, userId: 'u_ami', userEmail: 'ami@exemple.cg' })

    expect((await listUserWorkspaces(db, 'u_ami')).map((w) => [w.workspaceId, w.role]))
      .toEqual([['ws_ami', 'owner'], ['ws_a', 'member']])
    expect(await resolveCurrentWorkspace(db, { userId: 'u_ami', email: 'ami@exemple.cg' }))
      .toMatchObject({ workspaceId: 'ws_a', role: 'member' })
    expect((await resolveCurrentWorkspace(db, { userId: 'u_ami', email: 'ami@exemple.cg', preferred: 'ws_ami' }))?.workspaceId).toBe('ws_ami')
    // Un espace dont il n'est pas membre n'est jamais retenu.
    expect((await resolveCurrentWorkspace(db, { userId: 'u_ami', email: 'ami@exemple.cg', preferred: 'ws_autre' }))?.workspaceId).toBe('ws_a')

    await removeMember(db, { workspaceId: 'ws_a', userId: 'u_ami', actorId: 'u_owner' })
    expect((await resolveCurrentWorkspace(db, { userId: 'u_ami', email: 'ami@exemple.cg', preferred: 'ws_a' }))?.workspaceId).toBe('ws_ami')
  })

  it('aperçu d’invitation : espace, invitant, statut', async () => {
    const inv = await invite('ami@exemple.cg')
    if (!inv.ok) throw new Error('invitation')
    expect(await getInvitationByToken(db, inv.token, T0)).toMatchObject({
      workspaceName: 'Espace ws_a', inviterName: 'Patron', email: 'ami@exemple.cg', status: 'pending',
    })
    expect((await getInvitationByToken(db, inv.token, T0 + INVITATION_TTL_MS))?.status).toBe('expired')
  })
})
