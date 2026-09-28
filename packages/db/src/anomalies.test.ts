import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import { user as authUser } from './auth-schema'
import type { Db } from './mutations'
import { listPayments } from './payments'
import { createCheckout, getCheckout, settleCheckout, type DepositOutcome } from './checkout'
import {
  countOpenAnomalies, getAnomalyContext, getAnomalyForCheckout, listOpenAnomalies, resolvePaymentAnomaly,
} from './anomalies'

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

const JUNE = Date.parse('2026-06-15T10:00:00Z')

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

/** Tentative Pro mensuelle (1 500 FCFA) encaissée avec une anomalie. */
async function anomalous(outcome: DepositOutcome) {
  const c = await createCheckout(deps(), { workspaceId: 'ws_a', userId: 'u1', plan: 'pro', cycle: 'month' })
  const r = await settleCheckout(deps(), c.id, outcome)
  if (r.ok || r.error !== 'anomaly') throw new Error('anomalie attendue')
  return r.anomaly
}

beforeEach(async () => {
  db = await freshDb()
  await db.insert(schema.workspaces).values({ id: 'ws_a', name: 'Boutique A', plan: 'free', createdAt: 0 })
  await db.insert(authUser).values({ id: 'u1', email: 'awa@example.cg', name: 'Awa', emailVerified: true, createdAt: new Date(0), updatedAt: new Date(0) })
  await db.insert(schema.memberships).values({ userId: 'u1', workspaceId: 'ws_a', role: 'owner' })
})

describe('lectures', () => {
  it('liste, compte et contexte (payeur, propriétaire, tentative)', async () => {
    const a = await anomalous(completed({ amount: '1000' }))
    expect((await listOpenAnomalies(db)).map((x) => x.id)).toEqual([a.id])
    expect(await countOpenAnomalies(db, 'ws_a')).toBe(1)
    expect(await countOpenAnomalies(db, 'ws_b')).toBe(0)
    expect(await getAnomalyForCheckout(db, a.checkoutId)).toMatchObject({ id: a.id })
    const ctx = await getAnomalyContext(db, a)
    expect(ctx).toMatchObject({
      workspaceName: 'Boutique A',
      payer: { email: 'awa@example.cg' },
      owners: [{ email: 'awa@example.cg' }],
      checkout: { amount: 1500, status: 'review' },
    })
  })
})

describe('resolvePaymentAnomaly', () => {
  it('granted : reçu du montant encaissé, palier appliqué, rejouable sans second reçu', async () => {
    const a = await anomalous(completed({ amount: '1000' }))
    const r = await resolvePaymentAnomaly(deps(), { id: a.id, resolution: 'granted', by: 'contact@nscreative.cg', note: 'geste commercial' })
    expect(r).toMatchObject({ ok: true, changed: true, anomaly: { status: 'resolved', resolution: 'granted', resolvedBy: 'contact@nscreative.cg' } })
    expect(await plan()).toBe('pro')
    const payments = await listPayments(db, 'ws_a')
    expect(payments).toHaveLength(1)
    expect(payments[0]).toMatchObject({ amount: 1000, method: 'mtn_momo', status: 'paid', providerReference: a.checkoutId })
    expect(await getCheckout(db, a.checkoutId)).toMatchObject({ status: 'completed', paymentId: payments[0]!.id })

    const again = await resolvePaymentAnomaly(deps(), { id: a.id, resolution: 'granted', by: 'x' })
    expect(again).toMatchObject({ ok: true, changed: false })
    expect(await listPayments(db, 'ws_a')).toHaveLength(1)
    expect(await countOpenAnomalies(db, 'ws_a')).toBe(0)
  })

  it('granted, résolutions concurrentes : un seul reçu', async () => {
    const a = await anomalous(completed({ amount: '1000' }))
    await Promise.all([
      resolvePaymentAnomaly(deps(), { id: a.id, resolution: 'granted', by: 'a' }),
      resolvePaymentAnomaly(deps(), { id: a.id, resolution: 'granted', by: 'b' }),
    ])
    expect(await listPayments(db, 'ws_a')).toHaveLength(1)
  })

  it('granted, opérateur inconnu : le moyen de paiement est exigé', async () => {
    const a = await anomalous(completed({ provider: 'ORANGE_CMR' }))
    expect(await resolvePaymentAnomaly(deps(), { id: a.id, resolution: 'granted', by: 'a' })).toEqual({ ok: false, error: 'method_required' })
    expect(await plan()).toBe('free')
    const r = await resolvePaymentAnomaly(deps(), { id: a.id, resolution: 'granted', by: 'a', method: 'manual' })
    expect(r).toMatchObject({ ok: true, changed: true })
    expect((await listPayments(db, 'ws_a'))[0]).toMatchObject({ method: 'manual', amount: 1500 })
  })

  it('granted, devise inattendue : reçu du prix de l’offre', async () => {
    const a = await anomalous(completed({ currency: 'XOF' }))
    await resolvePaymentAnomaly(deps(), { id: a.id, resolution: 'granted', by: 'a' })
    expect((await listPayments(db, 'ws_a'))[0]).toMatchObject({ amount: 1500 })
  })

  it('refunded : tentative close (REFUNDED), aucun palier, et une relecture ne la rouvre pas', async () => {
    const a = await anomalous(completed({ amount: '1000' }))
    expect(await resolvePaymentAnomaly(deps(), { id: a.id, resolution: 'refunded', by: 'a' })).toMatchObject({ ok: true, changed: true })
    expect(await getCheckout(db, a.checkoutId)).toMatchObject({ status: 'failed', failureCode: 'REFUNDED' })
    // Callback rejoué par pawaPay après la résolution.
    expect(await settleCheckout(deps(), a.checkoutId, completed({ amount: '1000' }))).toMatchObject({ ok: true, changed: false })
    expect(await settleCheckout(deps(), a.checkoutId, completed())).toMatchObject({ ok: true, changed: false })
    expect(await plan()).toBe('free')
    expect(await listPayments(db, 'ws_a')).toHaveLength(0)
    expect(await getCheckout(db, a.checkoutId)).toMatchObject({ status: 'failed' })
  })

  it('dismissed : tentative close (DISMISSED)', async () => {
    const a = await anomalous(completed({ amount: '1000' }))
    await resolvePaymentAnomaly(deps(), { id: a.id, resolution: 'dismissed', by: 'a' })
    expect(await getCheckout(db, a.checkoutId)).toMatchObject({ status: 'failed', failureCode: 'DISMISSED' })
  })

  it('anomalie inconnue', async () => {
    expect(await resolvePaymentAnomaly(deps(), { id: 'nope', resolution: 'granted', by: 'a' })).toEqual({ ok: false, error: 'not_found' })
  })
})
