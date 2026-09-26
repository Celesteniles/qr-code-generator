import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import type { Db } from './mutations'
import {
  recordPayment, markPaymentStatus, listPayments, getPayment, activePaidPeriod,
  formatReceiptNumber, receiptYear, maskPhone,
} from './payments'

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

let db: Db
let seq = 0
const newId = () => `pay_${++seq}`
const deps = (now = JUNE) => ({ db, newId, now: () => now })

const base = {
  workspaceId: 'ws_a',
  plan: 'pro' as const,
  periodStart: D('2026-06-01T00:00:00Z'),
  periodEnd: D('2026-07-01T00:00:00Z'),
  amount: 15000,
  method: 'airtel_money' as const,
}

beforeEach(async () => {
  db = await freshDb()
  seq = 0
  await db.insert(schema.workspaces).values([
    { id: 'ws_a', name: 'A', plan: 'free', createdAt: 0 },
    { id: 'ws_b', name: 'B', plan: 'free', createdAt: 0 },
  ])
})

describe('numérotation des reçus', () => {
  it('formate LCG-AAAA-NNNNN', () => {
    expect(formatReceiptNumber(2026, 1)).toBe('LCG-2026-00001')
    expect(formatReceiptNumber(2026, 123456)).toBe('LCG-2026-123456')
  })

  it("prend l'année à l'heure de Brazzaville (UTC+1)", () => {
    expect(receiptYear(D('2026-12-31T22:59:59Z'))).toBe(2026)
    expect(receiptYear(D('2026-12-31T23:00:00Z'))).toBe(2027)
  })

  it('attribue des numéros séquentiels, tous espaces confondus', async () => {
    const r1 = await recordPayment(deps(), base)
    const r2 = await recordPayment(deps(), { ...base, workspaceId: 'ws_b' })
    const r3 = await recordPayment(deps(), base)
    expect([r1, r2, r3].map((r) => r.ok && r.receiptNumber)).toEqual([
      'LCG-2026-00001', 'LCG-2026-00002', 'LCG-2026-00003',
    ])
  })

  it("repart à 1 au changement d'année", async () => {
    await recordPayment(deps(D('2026-12-31T12:00:00Z')), base)
    await recordPayment(deps(D('2026-12-31T12:30:00Z')), base)
    const jan = await recordPayment(deps(D('2027-01-01T08:00:00Z')), base)
    expect(jan.ok && jan.receiptNumber).toBe('LCG-2027-00001')
    // L'année précédente continue sa propre séquence (saisie manuelle tardive, par ex.).
    const late = await recordPayment(deps(D('2026-12-31T20:00:00Z')), base)
    expect(late.ok && late.receiptNumber).toBe('LCG-2026-00003')
  })

  it('trie numériquement au-delà de 99 999', async () => {
    await db.insert(schema.payments).values({
      id: 'big', workspaceId: 'ws_a', receiptNumber: 'LCG-2026-99999', plan: 'pro',
      periodStart: 0, periodEnd: 1, amount: 1, method: 'manual', status: 'paid', createdAt: 0,
    })
    const r = await recordPayment(deps(), base)
    expect(r.ok && r.receiptNumber).toBe('LCG-2026-100000')
    const r2 = await recordPayment(deps(), base)
    expect(r2.ok && r2.receiptNumber).toBe('LCG-2026-100001')
  })

  it('réessaie en cas de collision (écritures concurrentes)', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => recordPayment(deps(), base)))
    expect(results.every((r) => r.ok)).toBe(true)
    const numbers = results.map((r) => (r.ok ? r.receiptNumber : '')).sort()
    expect(numbers).toEqual([1, 2, 3, 4, 5].map((n) => formatReceiptNumber(2026, n)))
  })
})

describe('idempotence opérateur', () => {
  it('une même transaction notifiée deux fois ne crée qu’un reçu', async () => {
    const input = { ...base, providerReference: 'AM-7781-XY', status: 'paid' as const }
    const r1 = await recordPayment(deps(), input)
    const r2 = await recordPayment(deps(), input)
    expect(r1).toMatchObject({ ok: true, duplicate: false })
    expect(r2).toEqual({ ok: true, id: r1.ok && r1.id, receiptNumber: r1.ok && r1.receiptNumber, duplicate: true })
    expect(await listPayments(db, 'ws_a')).toHaveLength(1)
  })

  it('en parallèle aussi', async () => {
    const input = { ...base, providerReference: 'AM-PAR' }
    const [r1, r2] = await Promise.all([recordPayment(deps(), input), recordPayment(deps(), input)])
    expect(r1.ok && r2.ok && r1.id === r2.id).toBe(true)
    expect(await listPayments(db, 'ws_a')).toHaveLength(1)
  })

  it('la même référence chez un autre opérateur est un autre paiement', async () => {
    await recordPayment(deps(), { ...base, providerReference: 'REF1' })
    const r = await recordPayment(deps(), { ...base, method: 'mtn_momo', providerReference: 'REF1' })
    expect(r).toMatchObject({ ok: true, duplicate: false })
  })

  it('refuse une référence déjà utilisée par un autre espace', async () => {
    await recordPayment(deps(), { ...base, providerReference: 'REF2' })
    const r = await recordPayment(deps(), { ...base, workspaceId: 'ws_b', providerReference: 'REF2' })
    expect(r).toEqual({ ok: false, error: 'reference_conflict' })
    expect(await listPayments(db, 'ws_b')).toHaveLength(0)
  })

  it('sans référence, pas de dédoublonnage', async () => {
    await recordPayment(deps(), base)
    await recordPayment(deps(), base)
    expect(await listPayments(db, 'ws_a')).toHaveLength(2)
  })
})

describe('validation', () => {
  it.each([
    ['montant décimal', { amount: 15000.5 }],
    ['montant nul', { amount: 0 }],
    ['montant négatif', { amount: -100 }],
    ['devise autre que XAF', { currency: 'EUR' }],
    ['moyen inconnu', { method: 'visa' }],
    ['palier inconnu', { plan: 'gold' }],
    ['période inversée', { periodEnd: base.periodStart - 1 }],
    ['téléphone invalide', { payerPhone: 'abc' }],
    ['statut inconnu', { status: 'ok' }],
  ])('rejette : %s', async (_, patch) => {
    const r = await recordPayment(deps(), { ...base, ...patch })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('invalid')
    expect(await listPayments(db, 'ws_a')).toHaveLength(0)
  })

  it('rejette un espace inexistant', async () => {
    expect(await recordPayment(deps(), { ...base, workspaceId: 'nope' })).toEqual({ ok: false, error: 'workspace_not_found' })
  })

  it('normalise le téléphone et renseigne paidAt pour un paiement payé', async () => {
    const r = await recordPayment(deps(), { ...base, payerPhone: '+242 06 123 45 67', status: 'paid' })
    const p = await getPayment(db, r.ok ? r.id : '')
    expect(p).toMatchObject({ payerPhone: '+242061234567', status: 'paid', paidAt: JUNE, currency: 'XAF', createdAt: JUNE })
  })

  it('un paiement en attente n’a pas de paidAt', async () => {
    const r = await recordPayment(deps(), base)
    expect((await getPayment(db, r.ok ? r.id : ''))?.paidAt).toBeNull()
  })
})

describe('markPaymentStatus', () => {
  it('pending → paid renseigne paidAt, puis paid → refunded', async () => {
    const r = await recordPayment(deps(), base)
    const id = r.ok ? r.id : ''
    const m1 = await markPaymentStatus(deps(JUNE + 5000), id, 'paid')
    expect(m1).toMatchObject({ ok: true, changed: true, payment: { status: 'paid', paidAt: JUNE + 5000 } })
    const m2 = await markPaymentStatus(deps(), id, 'refunded')
    expect(m2).toMatchObject({ ok: true, changed: true })
    expect((await getPayment(db, id))?.status).toBe('refunded')
  })

  it('accepte un paidAt fourni par l’opérateur', async () => {
    const r = await recordPayment(deps(), base)
    const m = await markPaymentStatus(deps(), r.ok ? r.id : '', 'paid', 1234)
    expect(m.ok && m.payment.paidAt).toBe(1234)
  })

  it('est idempotent sur le même état', async () => {
    const r = await recordPayment(deps(), { ...base, status: 'paid' })
    expect(await markPaymentStatus(deps(), r.ok ? r.id : '', 'paid')).toMatchObject({ ok: true, changed: false })
  })

  it('refuse les transitions incohérentes', async () => {
    const r = await recordPayment(deps(), { ...base, status: 'paid' })
    const id = r.ok ? r.id : ''
    expect(await markPaymentStatus(deps(), id, 'pending')).toEqual({ ok: false, error: 'invalid_transition', from: 'paid', to: 'pending' })
    expect(await markPaymentStatus(deps(), id, 'failed')).toMatchObject({ ok: false, error: 'invalid_transition' })
  })

  it('un échec peut être confirmé payé plus tard', async () => {
    const r = await recordPayment(deps(), { ...base, status: 'failed' })
    expect(await markPaymentStatus(deps(), r.ok ? r.id : '', 'paid')).toMatchObject({ ok: true, changed: true })
  })

  it('introuvable / statut invalide', async () => {
    expect(await markPaymentStatus(deps(), 'nope', 'paid')).toEqual({ ok: false, error: 'not_found' })
    expect(await markPaymentStatus(deps(), 'nope', 'bogus' as never)).toEqual({ ok: false, error: 'invalid_status' })
  })
})

describe('lectures', () => {
  it('isole les paiements par espace et trie du plus récent au plus ancien', async () => {
    await recordPayment(deps(D('2026-03-01T00:00:00Z')), base)
    await recordPayment(deps(D('2026-05-01T00:00:00Z')), base)
    await recordPayment(deps(D('2026-04-01T00:00:00Z')), { ...base, workspaceId: 'ws_b' })
    const a = await listPayments(db, 'ws_a')
    expect(a.map((p) => p.receiptNumber)).toEqual(['LCG-2026-00002', 'LCG-2026-00001'])
    expect(a.every((p) => p.workspaceId === 'ws_a')).toBe(true)
    expect((await listPayments(db, 'ws_b')).map((p) => p.receiptNumber)).toEqual(['LCG-2026-00003'])
    expect(await listPayments(db, 'ws_vide')).toEqual([])
  })

  it('getPayment renvoie undefined si absent', async () => {
    expect(await getPayment(db, 'nope')).toBeUndefined()
  })

  it('activePaidPeriod : seule une période payée en cours compte', async () => {
    await recordPayment(deps(), { ...base, status: 'paid' })
    await recordPayment(deps(), { ...base, status: 'pending', periodEnd: D('2026-09-01T00:00:00Z') })
    const all = await listPayments(db, 'ws_a')
    expect(activePaidPeriod(all, D('2026-06-20T00:00:00Z'))?.periodEnd).toBe(base.periodEnd)
    expect(activePaidPeriod(all, D('2026-07-01T00:00:00Z'))).toBeNull()
  })
})

describe('maskPhone', () => {
  it('ne laisse voir que les 4 derniers chiffres', () => {
    expect(maskPhone('+242061234567')).toBe('+242 •• ••• 45 67')
    expect(maskPhone('061234567')).toBe('•• ••• 45 67')
    expect(maskPhone('12')).toBe('••••')
    expect(maskPhone(null)).toBeNull()
  })
})
