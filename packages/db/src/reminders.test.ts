import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import { user as authUser } from './auth-schema'
import type { Db } from './mutations'
import { recordPayment } from './payments'
import { PLAN_GRACE_MS } from './checkout'
import { listDueReminders, paymentCycle, reminderKey, reminderKind } from './reminders'
import { claimNotification, completeNotification, getNotification, NOTIFICATION_MAX_ATTEMPTS } from './notifications'

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

const D = (iso: string) => Date.parse(iso)
const DAY = 24 * 60 * 60 * 1000
// Échéance : 15 juillet 2026 à 10 h UTC (11 h à Brazzaville).
const END = D('2026-07-15T10:00:00Z')

let db: Db

async function addUser(id: string, email: string) {
  await db.insert(authUser).values({ id, email, name: id, emailVerified: true, createdAt: new Date(0), updatedAt: new Date(0) })
}

async function pay(workspaceId: string, plan: 'pro' | 'business' | 'enterprise', start: number, end: number, over: Record<string, unknown> = {}) {
  const r = await recordPayment({ db }, {
    workspaceId, plan, periodStart: start, periodEnd: end, amount: 1500, method: 'mtn_momo',
    status: 'paid', paidAt: start, metadata: { cycle: 'month' }, ...over,
  })
  if (!r.ok) throw new Error(r.error)
  return r.id
}

beforeEach(async () => {
  db = await freshDb()
  await addUser('owner', 'owner@example.cg')
  await addUser('admin', 'admin@example.cg')
  await addUser('member', 'member@example.cg')
  await db.insert(schema.workspaces).values({ id: 'ws_a', name: 'Boutique A', plan: 'pro', createdAt: 0 })
  await db.insert(schema.memberships).values([
    { userId: 'owner', workspaceId: 'ws_a', role: 'owner' },
    { userId: 'admin', workspaceId: 'ws_a', role: 'admin' },
    { userId: 'member', workspaceId: 'ws_a', role: 'member' },
  ])
})

describe('reminderKind (jours de Brazzaville)', () => {
  it('J-7 à J-2 : j7 ; veille : j1 ; jour J et délai de grâce : j0 ; après : rien', () => {
    expect(reminderKind(END, D('2026-07-07T07:00:00Z'))).toBeNull()
    expect(reminderKind(END, D('2026-07-08T07:00:00Z'))).toBe('j7')
    expect(reminderKind(END, D('2026-07-13T07:00:00Z'))).toBe('j7')
    expect(reminderKind(END, D('2026-07-14T07:00:00Z'))).toBe('j1')
    expect(reminderKind(END, D('2026-07-15T07:00:00Z'))).toBe('j0')
    expect(reminderKind(END, END + PLAN_GRACE_MS - 1)).toBe('j0')
    expect(reminderKind(END, END + PLAN_GRACE_MS)).toBeNull()
  })

  it('le jour est celui de Brazzaville, pas celui d’UTC', () => {
    // 23 h 30 UTC le 13 = 0 h 30 le 14 à Brazzaville : veille de l'échéance.
    expect(reminderKind(END, D('2026-07-13T23:30:00Z'))).toBe('j1')
  })
})

describe('paymentCycle', () => {
  it('lit le rythme du paiement, ou le déduit de la durée', () => {
    expect(paymentCycle({ periodStart: 0, periodEnd: 30 * DAY, metadata: { cycle: 'year' } })).toBe('year')
    expect(paymentCycle({ periodStart: 0, periodEnd: 365 * DAY, metadata: null })).toBe('year')
    expect(paymentCycle({ periodStart: 0, periodEnd: 31 * DAY, metadata: null })).toBe('month')
  })
})

describe('listDueReminders', () => {
  it('rappel au propriétaire et aux administrateurs, avec le prix du renouvellement', async () => {
    const id = await pay('ws_a', 'pro', END - 30 * DAY, END)
    const due = await listDueReminders(db, D('2026-07-14T07:00:00Z'))
    expect(due).toHaveLength(1)
    expect(due[0]).toMatchObject({
      kind: 'j1', workspaceId: 'ws_a', workspaceName: 'Boutique A', paymentId: id, plan: 'pro', cycle: 'month',
      amount: 1500, periodEnd: END, downgradeAt: END + PLAN_GRACE_MS,
    })
    expect(due[0]!.recipients.map((r) => r.email).sort()).toEqual(['admin@example.cg', 'owner@example.cg'])
  })

  it('rythme annuel : prix annuel', async () => {
    await pay('ws_a', 'pro', END - 365 * DAY, END, { amount: 13000, metadata: { cycle: 'year' } })
    const [r] = await listDueReminders(db, D('2026-07-10T07:00:00Z'))
    expect(r).toMatchObject({ kind: 'j7', cycle: 'year', amount: 13_000 })
  })

  it('période suivante déjà payée : aucun rappel', async () => {
    await pay('ws_a', 'pro', END - 30 * DAY, END)
    await pay('ws_a', 'pro', END, END + 31 * DAY)
    expect(await listDueReminders(db, D('2026-07-14T07:00:00Z'))).toEqual([])
  })

  it('trop tôt, délai de grâce écoulé, palier non payable en ligne ou changé : aucun rappel', async () => {
    await pay('ws_a', 'pro', END - 30 * DAY, END)
    expect(await listDueReminders(db, D('2026-07-01T07:00:00Z'))).toEqual([])
    expect(await listDueReminders(db, END + PLAN_GRACE_MS)).toEqual([])
    await db.update(schema.workspaces).set({ plan: 'enterprise' })
    expect(await listDueReminders(db, D('2026-07-14T07:00:00Z'))).toEqual([])
    await db.update(schema.workspaces).set({ plan: 'business' })
    expect(await listDueReminders(db, D('2026-07-14T07:00:00Z'))).toEqual([])
  })

  it('paiement non réglé (en attente, échoué) : ignoré', async () => {
    await pay('ws_a', 'pro', END - 30 * DAY, END, { status: 'pending' })
    expect(await listDueReminders(db, D('2026-07-14T07:00:00Z'))).toEqual([])
  })
})

describe('notifications (au plus une fois)', () => {
  const key = reminderKey({ paymentId: 'p1', kind: 'j7' }, 'owner')

  it('une clé ne se réserve qu’une fois, même en parallèle', async () => {
    expect(key).toBe('rappel:p1:j7:owner')
    const claims = await Promise.all([claimNotification(db, key), claimNotification(db, key), claimNotification(db, key)])
    expect(claims.filter(Boolean)).toHaveLength(1)
    await completeNotification(db, key, 'sent')
    expect(await claimNotification(db, key)).toBe(false)
    expect(await getNotification(db, key)).toMatchObject({ status: 'sent', attempts: 1 })
  })

  it('envoi interrompu (resté « sending ») : jamais repris', async () => {
    expect(await claimNotification(db, key)).toBe(true)
    expect(await claimNotification(db, key)).toBe(false)
  })

  it('échec connu : repris, dans la limite des tentatives', async () => {
    expect(await claimNotification(db, key)).toBe(true)
    for (let i = 1; i < NOTIFICATION_MAX_ATTEMPTS; i++) {
      await completeNotification(db, key, 'failed')
      expect(await claimNotification(db, key)).toBe(true)
    }
    await completeNotification(db, key, 'failed')
    expect(await claimNotification(db, key)).toBe(false)
    expect(await getNotification(db, key)).toMatchObject({ status: 'failed', attempts: NOTIFICATION_MAX_ATTEMPTS })
  })
})
