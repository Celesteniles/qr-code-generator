// Rappels d'échéance des offres payées. Le mobile money n'a pas de prélèvement
// automatique : chaque période se paie à la main, d'où trois rappels au
// propriétaire et aux administrateurs de l'espace :
//   j7 : 7 jours avant l'échéance ; j1 : la veille ; j0 : le jour même (l'offre
//   repasse en Gratuit PLAN_GRACE_MS plus tard si elle n'est pas renouvelée).
//
// Ce module décide QUOI envoyer (fonction pure de la base et de l'heure) ; l'app
// qui exécute la tâche planifiée rédige et envoie, en réservant chaque envoi
// avec claimNotification (notifications.ts) pour ne jamais l'envoyer deux fois.
//
// Jours comptés à l'heure de Brazzaville (UTC+1). Rappel manqué (tâche arrêtée) :
// on n'envoie que celui du moment, jamais les précédents en rafale.

import { and, eq, gt, inArray, lte } from 'drizzle-orm'
import { isPayablePlan, planPrice, type BillingCycle, type PayablePlan } from '@link/shared'
import * as schema from './schema'
import { user as authUser } from './auth-schema'
import type { Db } from './mutations'
import type { PaymentRow } from './schema'
import { PLAN_GRACE_MS } from './checkout'

export type ReminderKind = 'j7' | 'j1' | 'j0'

const DAY_MS = 24 * 60 * 60 * 1000
/** Heure du Congo (WAT, UTC+1, sans heure d'été). */
const WAT_OFFSET_MS = 60 * 60 * 1000

/** Numéro du jour calendaire à Brazzaville. */
function localDay(ts: number): number {
  return Math.floor((ts + WAT_OFFSET_MS) / DAY_MS)
}

/** Rappel à envoyer pour une période qui se termine à `periodEnd` (exclusive), ou null. */
export function reminderKind(periodEnd: number, now: number): ReminderKind | null {
  if (now >= periodEnd + PLAN_GRACE_MS) return null
  const daysLeft = localDay(periodEnd) - localDay(now)
  if (daysLeft <= 0) return 'j0'
  if (daysLeft === 1) return 'j1'
  if (daysLeft <= 7) return 'j7'
  return null
}

/** Rythme d'une période payée : celui du paiement, ou déduit de sa durée. */
export function paymentCycle(p: Pick<PaymentRow, 'periodStart' | 'periodEnd' | 'metadata'>): BillingCycle {
  const c = p.metadata?.cycle
  if (c === 'month' || c === 'year') return c
  return p.periodEnd - p.periodStart > 200 * DAY_MS ? 'year' : 'month'
}

export interface ReminderRecipient {
  userId: string
  email: string
  name: string
}

export interface DueReminder {
  kind: ReminderKind
  workspaceId: string
  workspaceName: string
  /** Paiement dont la période arrive à échéance (clé du rappel). */
  paymentId: string
  plan: PayablePlan
  cycle: BillingCycle
  /** Prix du renouvellement, au même rythme. */
  amount: number
  periodEnd: number
  /** Retour en Gratuit sans renouvellement. */
  downgradeAt: number
  recipients: ReminderRecipient[]
}

/** Clé d'idempotence d'un rappel pour un destinataire. */
export function reminderKey(r: Pick<DueReminder, 'paymentId' | 'kind'>, userId: string): string {
  return `rappel:${r.paymentId}:${r.kind}:${userId}`
}

/** Propriétaire et administrateurs (ceux qui gèrent la facturation), avec leur adresse. */
export async function listBillingContacts(db: Db, workspaceId: string): Promise<ReminderRecipient[]> {
  const rows = await db
    .select({ userId: schema.memberships.userId, email: authUser.email, name: authUser.name })
    .from(schema.memberships)
    .innerJoin(authUser, eq(authUser.id, schema.memberships.userId))
    .where(and(eq(schema.memberships.workspaceId, workspaceId), inArray(schema.memberships.role, ['owner', 'admin'])))
  return rows.filter((r) => r.email)
}

/**
 * Rappels dus à `now`. Un espace est concerné si sa DERNIÈRE période payée du
 * palier qu'il a aujourd'hui arrive à échéance : une période suivante déjà payée
 * repousse l'échéance, donc aucun rappel. Paliers sans paiement en ligne
 * (Entreprise, palier posé à la main) : aucun rappel.
 */
export async function listDueReminders(db: Db, now: number = Date.now()): Promise<DueReminder[]> {
  // Candidats : une période payée finit entre « délai de grâce écoulé » et J+8.
  const near = await db
    .select({ workspaceId: schema.payments.workspaceId })
    .from(schema.payments)
    .where(and(
      eq(schema.payments.status, 'paid'),
      gt(schema.payments.periodEnd, now - PLAN_GRACE_MS),
      lte(schema.payments.periodEnd, now + 8 * DAY_MS),
    ))
  const ids = [...new Set(near.map((r) => r.workspaceId))]
  const due: DueReminder[] = []
  for (const workspaceId of ids) {
    const ws = await db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, workspaceId) })
    if (!ws || !isPayablePlan(ws.plan)) continue
    const paid = await db.query.payments.findMany({
      where: and(
        eq(schema.payments.workspaceId, workspaceId),
        eq(schema.payments.status, 'paid'),
        eq(schema.payments.plan, ws.plan),
      ),
    })
    const last = paid.reduce<PaymentRow | null>((a, p) => (!a || p.periodEnd > a.periodEnd ? p : a), null)
    if (!last) continue
    const kind = reminderKind(last.periodEnd, now)
    if (!kind) continue
    const recipients = await listBillingContacts(db, workspaceId)
    if (!recipients.length) continue
    const cycle = paymentCycle(last)
    due.push({
      kind,
      workspaceId,
      workspaceName: ws.name,
      paymentId: last.id,
      plan: ws.plan,
      cycle,
      amount: planPrice(ws.plan, cycle),
      periodEnd: last.periodEnd,
      downgradeAt: last.periodEnd + PLAN_GRACE_MS,
      recipients,
    })
  }
  return due
}
