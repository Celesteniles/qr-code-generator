import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import type { Db } from './mutations'
import { listPayments } from './payments'
import {
  addMonths, createCheckout, getCheckout, methodForProvider, settleCheckout, syncWorkspacePlan,
  PLAN_GRACE_MS, type DepositOutcome,
} from './checkout'

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
const JUNE = D('2026-06-15T10:00:00Z')
const DAY = 24 * 60 * 60 * 1000

let db: Db
let seq = 0
const deps = (now = JUNE) => ({ db, newId: () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`, now: () => now })

const completed = (over: Partial<DepositOutcome> = {}): DepositOutcome => ({
  status: 'COMPLETED', amount: '1500', currency: 'XAF', provider: 'MTN_MOMO_COG',
  phoneNumber: '242063456789', providerTransactionId: 'TX-1', ...over,
})

async function plan(): Promise<string> {
  const ws = await db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, 'ws_a') })
  return ws!.plan
}

beforeEach(async () => {
  db = await freshDb()
  await db.insert(schema.workspaces).values({ id: 'ws_a', name: 'A', plan: 'free', createdAt: 0 })
})

describe('addMonths', () => {
  it('ajoute des mois calendaires, en restant au dernier jour du mois court', () => {
    expect(new Date(addMonths(D('2026-01-31T08:00:00Z'), 1)).toISOString()).toBe('2026-02-28T08:00:00.000Z')
    expect(new Date(addMonths(D('2026-06-15T10:00:00Z'), 12)).toISOString()).toBe('2027-06-15T10:00:00.000Z')
  })
})

describe('methodForProvider', () => {
  it('reconnaît MTN et Airtel, refuse le reste', () => {
    expect(methodForProvider('MTN_MOMO_COG')).toBe('mtn_momo')
    expect(methodForProvider('AIRTEL_COG')).toBe('airtel_money')
    expect(methodForProvider('ORANGE_CMR')).toBeNull()
    expect(methodForProvider(undefined)).toBeNull()
  })
})

describe('createCheckout', () => {
  it('fige le montant depuis PLANS', async () => {
    const c = await createCheckout(deps(), { workspaceId: 'ws_a', userId: 'u1', plan: 'business', cycle: 'year' })
    expect(c).toMatchObject({ amount: 100_000, status: 'pending', plan: 'business', cycle: 'year' })
  })
})

describe('settleCheckout', () => {
  it('COMPLETED : reçu payé, palier appliqué, période d’un mois', async () => {
    const c = await createCheckout(deps(), { workspaceId: 'ws_a', userId: 'u1', plan: 'pro', cycle: 'month' })
    const r = await settleCheckout(deps(), c.id, completed())
    expect(r).toMatchObject({ ok: true, changed: true })
    expect(await plan()).toBe('pro')
    const [p] = await listPayments(db, 'ws_a')
    expect(p).toMatchObject({
      status: 'paid', amount: 1500, method: 'mtn_momo', providerReference: c.id,
      payerPhone: '+242063456789', periodStart: JUNE, periodEnd: D('2026-07-15T10:00:00Z'),
    })
    expect((await getCheckout(db, c.id))).toMatchObject({ status: 'completed', paymentId: p!.id })
  })

  it('rejouée (callback + page de retour) : un seul reçu', async () => {
    const c = await createCheckout(deps(), { workspaceId: 'ws_a', userId: 'u1', plan: 'pro', cycle: 'month' })
    await Promise.all([settleCheckout(deps(), c.id, completed()), settleCheckout(deps(), c.id, completed())])
    const again = await settleCheckout(deps(), c.id, completed())
    expect(again).toMatchObject({ ok: true, changed: false })
    expect(await listPayments(db, 'ws_a')).toHaveLength(1)
  })

  it('renouvellement du même palier : la période suit la précédente', async () => {
    const a = await createCheckout(deps(), { workspaceId: 'ws_a', userId: 'u1', plan: 'pro', cycle: 'month' })
    await settleCheckout(deps(), a.id, completed())
    const b = await createCheckout(deps(JUNE + DAY), { workspaceId: 'ws_a', userId: 'u1', plan: 'pro', cycle: 'year' })
    await settleCheckout(deps(JUNE + DAY), b.id, completed({ amount: '13000' }))
    const [latest] = await listPayments(db, 'ws_a')
    expect(latest).toMatchObject({ periodStart: D('2026-07-15T10:00:00Z'), periodEnd: D('2027-07-15T10:00:00Z') })
  })

  it('montant ou devise inattendus : aucun palier donné', async () => {
    const c = await createCheckout(deps(), { workspaceId: 'ws_a', userId: 'u1', plan: 'business', cycle: 'month' })
    expect(await settleCheckout(deps(), c.id, completed({ amount: '1500' }))).toMatchObject({ ok: false, error: 'anomaly' })
    expect(await settleCheckout(deps(), c.id, completed({ amount: '10000', currency: 'XOF' }))).toMatchObject({ ok: false, error: 'anomaly' })
    expect(await plan()).toBe('free')
    expect(await listPayments(db, 'ws_a')).toHaveLength(0)
  })

  it('FAILED puis PENDING : échec enregistré, pas de reçu', async () => {
    const c = await createCheckout(deps(), { workspaceId: 'ws_a', userId: 'u1', plan: 'pro', cycle: 'month' })
    expect(await settleCheckout(deps(), c.id, { status: 'PENDING' })).toMatchObject({ ok: true, changed: false })
    await settleCheckout(deps(), c.id, { status: 'FAILED', failureCode: 'INSUFFICIENT_BALANCE' })
    expect(await getCheckout(db, c.id)).toMatchObject({ status: 'failed', failureCode: 'INSUFFICIENT_BALANCE' })
    expect(await listPayments(db, 'ws_a')).toHaveLength(0)
  })

  it('tentative inconnue', async () => {
    expect(await settleCheckout(deps(), 'nope', completed())).toEqual({ ok: false, error: 'not_found' })
  })
})

describe('syncWorkspacePlan', () => {
  it('garde le palier pendant la période et le délai de grâce, puis repasse en Gratuit', async () => {
    const c = await createCheckout(deps(), { workspaceId: 'ws_a', userId: 'u1', plan: 'pro', cycle: 'month' })
    await settleCheckout(deps(), c.id, completed())
    const end = D('2026-07-15T10:00:00Z')
    expect(await syncWorkspacePlan(db, 'ws_a', end + PLAN_GRACE_MS - 1)).toBe('pro')
    expect(await syncWorkspacePlan(db, 'ws_a', end + PLAN_GRACE_MS)).toBe('free')
    expect(await plan()).toBe('free')
  })

  it('un palier posé à la main (aucun paiement) n’est jamais retiré', async () => {
    await db.update(schema.workspaces).set({ plan: 'enterprise' }).where(eq(schema.workspaces.id, 'ws_a'))
    expect(await syncWorkspacePlan(db, 'ws_a', D('2030-01-01T00:00:00Z'))).toBe('enterprise')
  })
})
