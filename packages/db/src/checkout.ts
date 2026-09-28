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
//   4. settleStaleCheckout : la tâche planifiée relit les tentatives restées en
//      attente (callback perdu, page fermée) et fait expirer les plus vieilles.
//
// Anomalie (pawaPay a encaissé mais l'offre ne peut pas être donnée) : la
// tentative passe en « review » et l'anomalie est enregistrée une seule fois
// (payment_anomalies) ; l'équipe tranche avec resolvePaymentAnomaly (anomalies.ts).
//
// Le résultat passé à settleCheckout DOIT venir d'une lecture de l'API pawaPay
// faite par nous (GET /v2/deposits/{id}), jamais du corps d'un callback.

import { and, eq, inArray, isNull, lte, or } from 'drizzle-orm'
import { planPrice, type BillingCycle, type PayablePlan, type Plan } from '@link/shared'
import * as schema from './schema'
import type { Db } from './mutations'
import type { CheckoutRow, PaymentAnomalyRow } from './schema'
import { recordPayment, type PaymentMethod } from './payments'

/** Délai après l'échéance avant de repasser en Gratuit : le temps de renouveler. */
export const PLAN_GRACE_MS = 3 * 24 * 60 * 60 * 1000
/** Une tentative en attente depuis plus longtemps est relue par la tâche planifiée. */
export const CHECKOUT_RECHECK_AFTER_MS = 10 * 60 * 1000
/** Au-delà, une tentative toujours en attente (ou introuvable) chez pawaPay expire. */
export const CHECKOUT_EXPIRY_MS = 48 * 60 * 60 * 1000

export type PawapayEnv = 'sandbox' | 'production'

/** Codes d'échec posés à la résolution d'une anomalie (anomalies.ts) : définitifs. */
export const MANUAL_FAILURES = new Set(['REFUNDED', 'DISMISSED'])

export interface CheckoutDeps {
  db: Db
  newId?: () => string
  now?: () => number
}

export async function createCheckout(
  deps: CheckoutDeps,
  input: { workspaceId: string; userId: string; plan: PayablePlan; cycle: BillingCycle; pawapayEnv?: PawapayEnv },
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
    pawapayEnv: input.pawapayEnv ?? null,
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

/**
 * Tentatives en attente depuis plus de CHECKOUT_RECHECK_AFTER_MS, créées par la
 * même API pawaPay que celle de l'appelant (ou d'avant la colonne pawapay_env).
 */
export async function listStaleCheckouts(
  db: Db, input: { env: PawapayEnv; now?: number; limit?: number },
): Promise<CheckoutRow[]> {
  const now = input.now ?? Date.now()
  return db.query.checkouts.findMany({
    where: and(
      eq(schema.checkouts.status, 'pending'),
      lte(schema.checkouts.createdAt, now - CHECKOUT_RECHECK_AFTER_MS),
      or(eq(schema.checkouts.pawapayEnv, input.env), isNull(schema.checkouts.pawapayEnv)),
    ),
    orderBy: schema.checkouts.createdAt,
    limit: input.limit ?? 50,
  })
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

export type AnomalyKind = PaymentAnomalyRow['kind']

export type SettleResult =
  | { ok: true; checkout: CheckoutRow; changed: boolean }
  | { ok: false; error: 'not_found' }
  /**
   * Encaissé sans offre donnée : tentative en « review », anomalie enregistrée.
   * `created` : l'anomalie vient d'être enregistrée par CET appel (à signaler).
   */
  | { ok: false; error: 'anomaly'; detail: string; checkout: CheckoutRow; anomaly: PaymentAnomalyRow; created: boolean }

/** Numéro du payeur au format du reçu (+242…), ou rien s'il est illisible. */
function payerPhone(phone: string | undefined): string | undefined {
  const digits = phone?.replace(/\D/g, '') ?? ''
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : undefined
}

/** Dépôt pawaPay à conserver avec l'anomalie (sans champ vide). */
function depositRecord(outcome: DepositOutcome): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(outcome)) if (typeof v === 'string' && v) out[k] = v
  return out
}

export type GrantResult =
  | { ok: true; checkout: CheckoutRow; paymentId: string; duplicate: boolean }
  | { ok: false; detail: string }

/**
 * Donne l'offre payée par une tentative : reçu (idempotent sur la tentative),
 * palier de l'espace, tentative « completed ». Partagé par settleCheckout et par
 * la résolution manuelle d'une anomalie (anomalies.ts).
 */
export async function grantCheckout(
  deps: CheckoutDeps,
  checkout: CheckoutRow,
  input: { method: PaymentMethod; amount?: number; phoneNumber?: string; metadata?: Record<string, unknown> },
): Promise<GrantResult> {
  const { db } = deps
  const now = (deps.now ?? Date.now)()
  const period = await nextPeriod(db, checkout.workspaceId, checkout.plan, checkout.cycle, now)
  const receipt = await recordPayment({ db, now: () => now }, {
    workspaceId: checkout.workspaceId,
    plan: checkout.plan,
    periodStart: period.start,
    periodEnd: period.end,
    amount: input.amount ?? checkout.amount,
    method: input.method,
    providerReference: checkout.id,
    payerPhone: payerPhone(input.phoneNumber),
    status: 'paid',
    paidAt: now,
    metadata: { source: 'pawapay', cycle: checkout.cycle, ...input.metadata },
  })
  if (!receipt.ok) return { ok: false, detail: `reçu non créé : ${receipt.error}` }

  await db.update(schema.workspaces).set({ plan: checkout.plan }).where(eq(schema.workspaces.id, checkout.workspaceId))
  await db
    .update(schema.checkouts)
    .set({ status: 'completed', paymentId: receipt.id, failureCode: null, updatedAt: now })
    .where(and(eq(schema.checkouts.id, checkout.id), inArray(schema.checkouts.status, ['pending', 'failed', 'review'])))
  const updated = await getCheckout(db, checkout.id)
  return { ok: true, checkout: updated!, paymentId: receipt.id, duplicate: receipt.duplicate }
}

/**
 * Enregistre l'anomalie d'une tentative (une seule par tentative, même rejouée
 * en parallèle) et passe la tentative en « review ».
 */
export async function recordAnomaly(
  deps: CheckoutDeps,
  checkout: CheckoutRow,
  input: { kind: AnomalyKind; detail: string; outcome: DepositOutcome },
): Promise<{ anomaly: PaymentAnomalyRow; created: boolean; checkout: CheckoutRow }> {
  const { db } = deps
  const now = (deps.now ?? Date.now)()
  const inserted = await db
    .insert(schema.paymentAnomalies)
    .values({
      id: (deps.newId ?? (() => crypto.randomUUID()))(),
      checkoutId: checkout.id,
      workspaceId: checkout.workspaceId,
      kind: input.kind,
      detail: input.detail.slice(0, 500),
      deposit: depositRecord(input.outcome),
      status: 'open',
      createdAt: now,
    })
    .onConflictDoNothing()
    .returning({ id: schema.paymentAnomalies.id })
  await db
    .update(schema.checkouts)
    .set({ status: 'review', updatedAt: now })
    .where(and(eq(schema.checkouts.id, checkout.id), inArray(schema.checkouts.status, ['pending', 'failed'])))
  const anomaly = await db.query.paymentAnomalies.findFirst({ where: eq(schema.paymentAnomalies.checkoutId, checkout.id) })
  return { anomaly: anomaly!, created: inserted.length > 0, checkout: (await getCheckout(db, checkout.id))! }
}

/**
 * Applique le résultat pawaPay à une tentative. COMPLETED : reçu + palier de
 * l'espace (ou anomalie). FAILED : tentative échouée. PENDING : rien. Rejouable
 * sans effet.
 */
export async function settleCheckout(deps: CheckoutDeps, id: string, outcome: DepositOutcome): Promise<SettleResult> {
  const { db } = deps
  const checkout = await getCheckout(db, id)
  if (!checkout) return { ok: false, error: 'not_found' }
  // completed : déjà donnée. review, ou anomalie tranchée sans offre (remboursée,
  // classée) : l'équipe a la main, plus rien d'automatique.
  if (
    checkout.status === 'completed' || checkout.status === 'review' || outcome.status === 'PENDING'
    || (checkout.status === 'failed' && MANUAL_FAILURES.has(checkout.failureCode ?? ''))
  ) {
    return { ok: true, checkout, changed: false }
  }

  if (outcome.status === 'FAILED') {
    if (checkout.status === 'failed') return { ok: true, checkout, changed: false }
    await failCheckout(deps, id, outcome.failureCode ?? 'FAILED')
    const updated = await getCheckout(db, id)
    return { ok: true, checkout: updated!, changed: updated!.status !== checkout.status }
  }

  const anomaly = async (kind: AnomalyKind, detail: string): Promise<SettleResult> => {
    const rec = await recordAnomaly(deps, checkout, { kind, detail, outcome })
    return { ok: false, error: 'anomaly', detail, ...rec }
  }

  // COMPLETED : on ne donne le palier que si pawaPay a encaissé exactement le montant attendu.
  if (outcome.currency !== 'XAF' || Number(outcome.amount) !== checkout.amount) {
    return anomaly('amount_mismatch', `montant reçu ${outcome.amount} ${outcome.currency}, attendu ${checkout.amount} XAF`)
  }
  const method = methodForProvider(outcome.provider)
  if (!method) return anomaly('unknown_provider', `opérateur inattendu : ${outcome.provider}`)

  const granted = await grantCheckout(deps, checkout, {
    method,
    phoneNumber: outcome.phoneNumber,
    metadata: outcome.providerTransactionId ? { providerTransactionId: outcome.providerTransactionId } : {},
  })
  if (!granted.ok) return anomaly('receipt_failed', granted.detail)
  return { ok: true, checkout: granted.checkout, changed: !granted.duplicate }
}

/**
 * Variante de settleCheckout pour la tâche planifiée : une tentative toujours en
 * attente (ou introuvable) chez pawaPay après CHECKOUT_EXPIRY_MS expire (EXPIRED).
 * Si pawaPay la confirme plus tard, le callback la rattrape (failed → completed).
 */
export async function settleStaleCheckout(deps: CheckoutDeps, id: string, outcome: DepositOutcome): Promise<SettleResult> {
  const now = (deps.now ?? Date.now)()
  const checkout = await getCheckout(deps.db, id)
  if (checkout?.status === 'pending' && outcome.status === 'PENDING' && checkout.createdAt <= now - CHECKOUT_EXPIRY_MS) {
    await failCheckout(deps, id, 'EXPIRED')
    const updated = await getCheckout(deps.db, id)
    return { ok: true, checkout: updated!, changed: updated!.status !== checkout.status }
  }
  return settleCheckout(deps, id, outcome)
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
