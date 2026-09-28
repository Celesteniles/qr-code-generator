// Paiement en ligne d'un abonnement (pawaPay, mobile money). Indépendant de l'API
// de pawaPay : apps/web interroge pawaPay et passe ici un résultat normalisé.
//
// Cycle de vie :
//   1. createCheckout : tentative « pending », montant figé depuis PLANS. Son id est
//      le depositId envoyé à pawaPay.
//   2. settleCheckout : appelée par le callback ET par la page de retour (l'une ou
//      l'autre peut arriver la première, ou les deux en même temps). Idempotente :
//      le reçu est créé par recordPayment, idempotent sur (method, depositId).
//   3. syncWorkspacePlan : repasse l'espace en Gratuit quand sa dernière période
//      payée est échue (délai de grâce compris).
//
// Le résultat passé à settleCheckout DOIT venir d'une lecture de l'API pawaPay
// faite par nous (GET /v2/deposits/{id}), jamais du corps d'un callback.

import { and, eq } from 'drizzle-orm'
import { planPrice, type BillingCycle, type PayablePlan, type Plan } from '@link/shared'
import * as schema from './schema'
import type { Db } from './mutations'
import type { CheckoutRow } from './schema'
import { recordPayment, type PaymentMethod } from './payments'

/** Délai après l'échéance avant de repasser en Gratuit : le temps de renouveler. */
export const PLAN_GRACE_MS = 3 * 24 * 60 * 60 * 1000

export interface CheckoutDeps {
  db: Db
  newId?: () => string
  now?: () => number
}

export async function createCheckout(
  deps: CheckoutDeps,
  input: { workspaceId: string; userId: string; plan: PayablePlan; cycle: BillingCycle },
): Promise<CheckoutRow> {
  const ts = (deps.now ?? Date.now)()
  const row: CheckoutRow = {
    id: (deps.newId ?? (() => crypto.randomUUID()))(),
    workspaceId: input.workspaceId,
    userId: input.userId,
    plan: input.plan,
    cycle: input.cycle,
    amount: planPrice(input.plan, input.cycle),
    status: 'pending',
    failureCode: null,
    paymentId: null,
    createdAt: ts,
    updatedAt: ts,
  }
  await deps.db.insert(schema.checkouts).values(row)
  return row
}

export async function getCheckout(db: Db, id: string): Promise<CheckoutRow | undefined> {
  return db.query.checkouts.findFirst({ where: eq(schema.checkouts.id, id) })
}

/** Marque une tentative refusée d'emblée (page de paiement non créée). */
export async function failCheckout(deps: CheckoutDeps, id: string, failureCode: string): Promise<void> {
  await deps.db
    .update(schema.checkouts)
    .set({ status: 'failed', failureCode: failureCode.slice(0, 64), updatedAt: (deps.now ?? Date.now)() })
    .where(and(eq(schema.checkouts.id, id), eq(schema.checkouts.status, 'pending')))
}

/** Résultat d'un dépôt lu chez pawaPay, normalisé par l'appelant. */
export interface DepositOutcome {
  /** PENDING couvre ACCEPTED, PROCESSING, IN_RECONCILIATION, SUBMITTED. */
  status: 'COMPLETED' | 'FAILED' | 'PENDING'
  amount?: string
  currency?: string
  /** Code opérateur pawaPay : MTN_MOMO_COG, AIRTEL_COG… */
  provider?: string
  phoneNumber?: string
  providerTransactionId?: string
  failureCode?: string
}

/** Opérateur pawaPay → moyen de paiement du reçu. null : opérateur inattendu. */
export function methodForProvider(provider: string | undefined): PaymentMethod | null {
  if (!provider) return null
  if (provider.startsWith('MTN_MOMO_')) return 'mtn_momo'
  if (provider.startsWith('AIRTEL_')) return 'airtel_money'
  return null
}

/** Ajoute des mois calendaires (UTC). Le 31 janvier + 1 mois = le dernier jour de février. */
export function addMonths(ts: number, months: number): number {
  const d = new Date(ts)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return d.getTime()
}

/**
 * Période couverte par un nouveau paiement. Renouvellement du même palier avant
 * échéance : la nouvelle période suit la période en cours (aucun jour perdu).
 * Changement de palier : elle commence maintenant.
 */
export async function nextPeriod(
  db: Db, workspaceId: string, plan: Plan, cycle: BillingCycle, now: number,
): Promise<{ start: number; end: number }> {
  const paid = await db.query.payments.findMany({
    where: and(
      eq(schema.payments.workspaceId, workspaceId),
      eq(schema.payments.status, 'paid'),
      eq(schema.payments.plan, plan),
    ),
  })
  const start = Math.max(now, ...paid.map((p) => p.periodEnd))
  return { start, end: addMonths(start, cycle === 'year' ? 12 : 1) }
}

export type SettleResult =
  | { ok: true; checkout: CheckoutRow; changed: boolean }
  | { ok: false; error: 'not_found' | 'anomaly'; detail?: string }

/**
 * Applique le résultat pawaPay à une tentative. COMPLETED : reçu + palier de
 * l'espace. FAILED : tentative échouée. PENDING : rien. Rejouable sans effet.
 */
export async function settleCheckout(deps: CheckoutDeps, id: string, outcome: DepositOutcome): Promise<SettleResult> {
  const { db } = deps
  const now = (deps.now ?? Date.now)()
  const checkout = await getCheckout(db, id)
  if (!checkout) return { ok: false, error: 'not_found' }
  if (checkout.status === 'completed' || outcome.status === 'PENDING') return { ok: true, checkout, changed: false }

  if (outcome.status === 'FAILED') {
    if (checkout.status === 'failed') return { ok: true, checkout, changed: false }
    await failCheckout(deps, id, outcome.failureCode ?? 'FAILED')
    const updated = await getCheckout(db, id)
    return { ok: true, checkout: updated!, changed: updated!.status !== checkout.status }
  }

  // COMPLETED : on ne donne le palier que si pawaPay a encaissé exactement le montant attendu.
  if (outcome.currency !== 'XAF' || Number(outcome.amount) !== checkout.amount) {
    return { ok: false, error: 'anomaly', detail: `montant reçu ${outcome.amount} ${outcome.currency}, attendu ${checkout.amount} XAF` }
  }
  const method = methodForProvider(outcome.provider)
  if (!method) return { ok: false, error: 'anomaly', detail: `opérateur inattendu : ${outcome.provider}` }

  const period = await nextPeriod(db, checkout.workspaceId, checkout.plan, checkout.cycle, now)
  const receipt = await recordPayment({ db, now: () => now }, {
    workspaceId: checkout.workspaceId,
    plan: checkout.plan,
    periodStart: period.start,
    periodEnd: period.end,
    amount: checkout.amount,
    method,
    providerReference: checkout.id,
    payerPhone: outcome.phoneNumber ? `+${outcome.phoneNumber.replace(/\D/g, '')}` : undefined,
    status: 'paid',
    paidAt: now,
    metadata: {
      source: 'pawapay',
      cycle: checkout.cycle,
      ...(outcome.providerTransactionId ? { providerTransactionId: outcome.providerTransactionId } : {}),
    },
  })
  if (!receipt.ok) return { ok: false, error: 'anomaly', detail: `reçu non créé : ${receipt.error}` }

  await db.update(schema.workspaces).set({ plan: checkout.plan }).where(eq(schema.workspaces.id, checkout.workspaceId))
  await db
    .update(schema.checkouts)
    .set({ status: 'completed', paymentId: receipt.id, failureCode: null, updatedAt: now })
    .where(and(eq(schema.checkouts.id, id), eq(schema.checkouts.status, checkout.status)))
  const updated = await getCheckout(db, id)
  return { ok: true, checkout: updated!, changed: !receipt.duplicate }
}

/**
 * Repasse l'espace en Gratuit si toutes ses périodes payées sont échues depuis
 * plus de PLAN_GRACE_MS. Un espace sans aucun paiement garde son palier : il a
 * été posé à la main (Entreprise sur devis, partenaire…). Renvoie le palier.
 */
export async function syncWorkspacePlan(db: Db, workspaceId: string, now: number = Date.now()): Promise<Plan | null> {
  const ws = await db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, workspaceId) })
  if (!ws) return null
  if (ws.plan === 'free') return 'free'
  const paid = await db.query.payments.findMany({
    where: and(eq(schema.payments.workspaceId, workspaceId), eq(schema.payments.status, 'paid')),
    columns: { periodEnd: true },
  })
  if (!paid.length || paid.some((p) => p.periodEnd + PLAN_GRACE_MS > now)) return ws.plan
  await db
    .update(schema.workspaces)
    .set({ plan: 'free' })
    .where(and(eq(schema.workspaces.id, workspaceId), eq(schema.workspaces.plan, ws.plan)))
  return 'free'
}
