import 'server-only'
import { cache } from 'react'
import { activePaidPeriod, getPayment, getWorkspace, listPayments, type PaymentRow } from '@link/db'
import { PLANS, type Plan, type PlanSpec } from '@link/shared'
import type { SessionContext } from './session'
import { getDb } from './data'

// Lectures « Facturation » pour l'utilisateur connecté. Toujours bornées à son
// espace de travail : un paiement d'un autre espace est traité comme inexistant.

/**
 * Palier de l'espace `workspaceId` (Gratuit si l'espace ou son palier est
 * inconnu). `cache` : une seule lecture par requête.
 */
export const getWorkspacePlan = cache(async (workspaceId: string): Promise<PlanSpec> => {
  const ws = await getWorkspace(getDb(), workspaceId)
  return PLANS[(ws?.plan ?? 'free') as Plan] ?? PLANS.free
})

export interface BillingOverview {
  planId: Plan
  planLabel: string
  /** Paiement « paid » dont la période est en cours, s'il y en a un. */
  current: PaymentRow | null
  payments: PaymentRow[]
}

export async function getBillingOverview(ctx: SessionContext): Promise<BillingOverview> {
  const db = getDb()
  const [ws, payments] = await Promise.all([getWorkspace(db, ctx.workspaceId), listPayments(db, ctx.workspaceId)])
  const planId = (ws?.plan ?? 'free') as Plan
  return {
    planId,
    planLabel: PLANS[planId].label,
    current: activePaidPeriod(payments, Date.now()),
    payments,
  }
}

export interface ReceiptData {
  payment: PaymentRow
  /** Nom de l'espace (null s'il est vide : l'appelant se replie sur le nom du compte). */
  workspaceName: string | null
}

/**
 * Paiement appartenant à l'espace `workspaceId`, ou null (absent OU d'un autre
 * espace — les deux cas sont indiscernables pour l'appelant). `cache` : un seul
 * accès par requête (métadonnées + page).
 */
export const getOwnReceipt = cache(async (workspaceId: string, id: string): Promise<ReceiptData | null> => {
  const db = getDb()
  const payment = await getPayment(db, id)
  if (!payment || payment.workspaceId !== workspaceId) return null
  const ws = await getWorkspace(db, workspaceId)
  return { payment, workspaceName: ws?.name || null }
})
