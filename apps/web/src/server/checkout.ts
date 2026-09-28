import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  claimNotification, completeNotification, getAnomaly, getAnomalyContext, getCheckout, settleCheckout, settleStaleCheckout,
  type CheckoutRow, type DepositOutcome, type SettleResult,
} from '@link/db'
import { getDb } from './data'
import { EmailError, sendEmail } from './email'
import { getDeposit, getPawapayConfig } from './pawapay'
import { ISSUER } from './billing-config'
import { paymentAnomalyEmail } from './email-templates/payment-anomaly'

// Rapprochement d'une tentative de paiement avec pawaPay, partagé par le callback,
// la page de retour et la tâche planifiée : on relit le dépôt chez pawaPay (jamais
// le corps du callback), puis settleCheckout applique le résultat (idempotent).

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Relit la tentative chez pawaPay et applique le résultat. `changed` : l'état
 * vient de changer à cet appel (l'offre de l'espace a pu changer avec lui).
 * `stale` : appel de la tâche planifiée (une tentative trop ancienne expire).
 */
export async function reconcileCheckout(
  id: string, opts: { stale?: boolean } = {},
): Promise<{ checkout: CheckoutRow; changed: boolean } | null> {
  const db = getDb()
  const checkout = await getCheckout(db, id)
  if (!checkout) return null
  // review : encaissé mais en vérification, l'équipe a la main.
  if (checkout.status === 'completed' || checkout.status === 'review') return { checkout, changed: false }
  const cfg = getPawapayConfig()
  if (!cfg) return { checkout, changed: false }
  const outcome: DepositOutcome | null = await getDeposit(cfg, id)
  if (!outcome) return { checkout, changed: false }
  const res: SettleResult = await (opts.stale ? settleStaleCheckout : settleCheckout)({ db }, id, outcome)
  if (!res.ok) {
    if (res.error === 'not_found') return { checkout, changed: false }
    // Argent encaissé sans palier donné : anomalie enregistrée, NS Creative alerté.
    console.error('[paiement] anomalie de rapprochement', id, res.anomaly.kind, res.detail)
    const alert = notifyAnomaly(res.anomaly.id).catch((e) => console.error('[paiement] alerte d’anomalie', e))
    if (opts.stale) await alert
    else getCloudflareContext().ctx.waitUntil(alert)
    return { checkout: res.checkout, changed: res.checkout.status !== checkout.status }
  }
  return { checkout: res.checkout, changed: res.checkout.status !== checkout.status }
}

/** Origine publique du site (liens absolus des e-mails). */
export function siteOrigin(): string {
  return getCloudflareContext().env.BETTER_AUTH_URL.replace(/\/+$/, '')
}

/**
 * Alerte NS Creative d'une anomalie, une seule fois (clé anomalie:<id>). Rejouée
 * par la tâche planifiée tant que l'envoi a échoué avant de partir.
 * true : l'alerte vient de partir.
 */
export async function notifyAnomaly(anomalyId: string): Promise<boolean> {
  const db = getDb()
  const anomaly = await getAnomaly(db, anomalyId)
  if (!anomaly || anomaly.status !== 'open') return false
  const key = `anomalie:${anomaly.id}`
  if (!(await claimNotification(db, key))) return false
  try {
    const ctx = await getAnomalyContext(db, anomaly)
    if (!ctx) throw new EmailError('tentative introuvable')
    const mail = paymentAnomalyEmail(ctx, `${siteOrigin()}/interne/paiements#${anomaly.id}`)
    await sendEmail({ to: ISSUER.email, name: ISSUER.name, ...mail })
  } catch (e) {
    // Issue incertaine : la clé reste « sending », jamais renvoyée (au plus une
    // fois). Refus certain : « failed », la tâche planifiée retentera.
    if (!(e instanceof EmailError && e.maybeSent)) await completeNotification(db, key, 'failed')
    throw e
  }
  await completeNotification(db, key, 'sent')
  return true
}
