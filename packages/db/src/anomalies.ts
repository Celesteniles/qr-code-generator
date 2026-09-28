// Anomalies de paiement : pawaPay a encaissé, mais l'offre n'a pas pu être donnée
// automatiquement (cf. settleCheckout / recordAnomaly dans checkout.ts). Lecture
// pour l'alerte et la page réservée, et résolution manuelle par NS Creative.
// Procédure : docs/PAIEMENTS.md.

import { and, desc, eq, inArray } from 'drizzle-orm'
import * as schema from './schema'
import { user as authUser } from './auth-schema'
import type { Db } from './mutations'
import type { PaymentAnomalyRow } from './schema'
import { getCheckout, grantCheckout, methodForProvider, type CheckoutDeps } from './checkout'
import { PAYMENT_METHODS, type PaymentMethod } from './payments'

export type AnomalyResolution = NonNullable<PaymentAnomalyRow['resolution']>

export async function getAnomaly(db: Db, id: string): Promise<PaymentAnomalyRow | undefined> {
  return db.query.paymentAnomalies.findFirst({ where: eq(schema.paymentAnomalies.id, id) })
}

/** Anomalie d'une tentative, s'il y en a une. */
export async function getAnomalyForCheckout(db: Db, checkoutId: string): Promise<PaymentAnomalyRow | undefined> {
  return db.query.paymentAnomalies.findFirst({ where: eq(schema.paymentAnomalies.checkoutId, checkoutId) })
}

/** Anomalies ouvertes, de la plus récente à la plus ancienne. */
export async function listOpenAnomalies(db: Db): Promise<PaymentAnomalyRow[]> {
  return db.query.paymentAnomalies.findMany({
    where: eq(schema.paymentAnomalies.status, 'open'),
    orderBy: desc(schema.paymentAnomalies.createdAt),
  })
}

/** Nombre d'anomalies ouvertes d'un espace (page Facturation du client). */
export async function countOpenAnomalies(db: Db, workspaceId: string): Promise<number> {
  const rows = await db.query.paymentAnomalies.findMany({
    where: and(eq(schema.paymentAnomalies.workspaceId, workspaceId), eq(schema.paymentAnomalies.status, 'open')),
    columns: { id: true },
  })
  return rows.length
}

/** Tout ce qu'il faut pour traiter une anomalie : tentative, espace, payeur. */
export interface AnomalyContext {
  anomaly: PaymentAnomalyRow
  checkout: schema.CheckoutRow
  workspaceName: string
  /** Personne qui a lancé le paiement (compte link.cg). */
  payer: { name: string; email: string } | null
  /** Propriétaire(s) de l'espace. */
  owners: { name: string; email: string }[]
}

export async function getAnomalyContext(db: Db, anomaly: PaymentAnomalyRow): Promise<AnomalyContext | null> {
  const checkout = await getCheckout(db, anomaly.checkoutId)
  if (!checkout) return null
  const [ws, payer, owners] = await Promise.all([
    db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, anomaly.workspaceId) }),
    db.select({ name: authUser.name, email: authUser.email }).from(authUser).where(eq(authUser.id, checkout.userId)),
    db
      .select({ name: authUser.name, email: authUser.email })
      .from(schema.memberships)
      .innerJoin(authUser, eq(authUser.id, schema.memberships.userId))
      .where(and(eq(schema.memberships.workspaceId, anomaly.workspaceId), eq(schema.memberships.role, 'owner'))),
  ])
  return { anomaly, checkout, workspaceName: ws?.name ?? '', payer: payer[0] ?? null, owners }
}

export type ResolveAnomalyResult =
  | { ok: true; anomaly: PaymentAnomalyRow; changed: boolean; paymentId?: string }
  | { ok: false; error: 'not_found' | 'method_required' | 'grant_failed'; detail?: string }

/**
 * Tranche une anomalie. Rejouable : une anomalie déjà résolue est renvoyée telle quelle.
 * - granted : l'offre est accordée. Reçu (idempotent sur la tentative, du montant
 *   réellement encaissé s'il est en FCFA) + palier de l'espace + tentative
 *   « completed ». `method` n'est requis que si l'opérateur est inconnu.
 * - refunded : NS Creative a remboursé le client ; tentative « failed » (REFUNDED).
 * - dismissed : rien n'a été encaissé en réalité ; tentative « failed » (DISMISSED).
 */
export async function resolvePaymentAnomaly(
  deps: CheckoutDeps,
  input: { id: string; resolution: AnomalyResolution; by: string; note?: string; method?: PaymentMethod },
): Promise<ResolveAnomalyResult> {
  const { db } = deps
  const now = (deps.now ?? Date.now)()
  const anomaly = await getAnomaly(db, input.id)
  if (!anomaly) return { ok: false, error: 'not_found' }
  if (anomaly.status === 'resolved') return { ok: true, anomaly, changed: false }
  const checkout = await getCheckout(db, anomaly.checkoutId)
  if (!checkout) return { ok: false, error: 'not_found' }

  let paymentId: string | undefined
  if (input.resolution === 'granted') {
    const method = input.method ?? methodForProvider(anomaly.deposit.provider)
    if (!method || !(PAYMENT_METHODS as readonly string[]).includes(method)) return { ok: false, error: 'method_required' }
    const received = Number(anomaly.deposit.amount)
    const amount = anomaly.deposit.currency === 'XAF' && Number.isInteger(received) && received > 0 ? received : undefined
    const granted = await grantCheckout(deps, checkout, {
      method,
      amount,
      phoneNumber: anomaly.deposit.phoneNumber,
      metadata: {
        anomalyId: anomaly.id,
        ...(anomaly.deposit.providerTransactionId ? { providerTransactionId: anomaly.deposit.providerTransactionId } : {}),
      },
    })
    if (!granted.ok) return { ok: false, error: 'grant_failed', detail: granted.detail }
    paymentId = granted.paymentId
  } else {
    // Directement de « review » à « failed » : jamais repassée par « pending », où
    // une relecture concurrente pourrait encore donner l'offre.
    await db
      .update(schema.checkouts)
      .set({ status: 'failed', failureCode: input.resolution === 'refunded' ? 'REFUNDED' : 'DISMISSED', updatedAt: now })
      .where(and(eq(schema.checkouts.id, checkout.id), inArray(schema.checkouts.status, ['pending', 'review'])))
  }

  await db
    .update(schema.paymentAnomalies)
    .set({
      status: 'resolved',
      resolution: input.resolution,
      resolvedBy: input.by.slice(0, 200),
      resolutionNote: input.note?.trim().slice(0, 1000) || null,
      resolvedAt: now,
    })
    .where(and(eq(schema.paymentAnomalies.id, anomaly.id), eq(schema.paymentAnomalies.status, 'open')))
  return { ok: true, anomaly: (await getAnomaly(db, anomaly.id))!, changed: true, paymentId }
}
