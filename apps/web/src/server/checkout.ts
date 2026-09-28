import 'server-only'
import { getCheckout, settleCheckout, type CheckoutRow } from '@link/db'
import { getDb } from './data'
import { getDeposit, getPawapayConfig } from './pawapay'

// Rapprochement d'une tentative de paiement avec pawaPay, partagé par le callback
// et la page de retour : on relit le dépôt chez pawaPay (jamais le corps du
// callback), puis settleCheckout applique le résultat (idempotent).

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function reconcileCheckout(id: string): Promise<CheckoutRow | null> {
  const db = getDb()
  const checkout = await getCheckout(db, id)
  if (!checkout || checkout.status === 'completed') return checkout ?? null
  const cfg = getPawapayConfig()
  if (!cfg) return checkout
  const outcome = await getDeposit(cfg, id)
  if (!outcome) return checkout
  const res = await settleCheckout({ db }, id, outcome)
  if (!res.ok) {
    // Argent peut-être encaissé sans palier donné : à traiter à la main.
    console.error('[paiement] anomalie de rapprochement', id, res.error, res.error === 'anomaly' ? res.detail : '')
    return checkout
  }
  return res.checkout
}
