'use server'

import { redirect } from 'next/navigation'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { canManageBilling, createCheckout, failCheckout } from '@link/db'
import { PLANS, isPayablePlan, type BillingCycle } from '@link/shared'
import { getDb } from './data'
import { getSessionContext } from './session'
import { createPaymentPage, getPawapayConfig } from './pawapay'

// Lancement d'un paiement d'abonnement (formulaire de /compte/facturation/payer).
// Le palier et le cycle viennent du formulaire, le montant de PLANS (jamais du
// navigateur), l'espace de la session. Succès : redirection vers la page de
// paiement pawaPay ; échec : retour au formulaire avec un code d'erreur.

export async function startCheckoutAction(formData: FormData): Promise<void> {
  const plan = String(formData.get('plan') ?? '')
  const cycle: BillingCycle = formData.get('cycle') === 'year' ? 'year' : 'month'
  const back = (erreur: string) => redirect(`/compte/facturation/payer?offre=${encodeURIComponent(plan)}&cycle=${cycle}&erreur=${erreur}`)

  const ctx = await getSessionContext()
  if (!ctx) redirect(`/connexion?next=${encodeURIComponent(`/compte/facturation/payer?offre=${plan}`)}`)
  if (!isPayablePlan(plan)) redirect('/offres')
  if (!canManageBilling(ctx.role)) back('droits')
  const cfg = getPawapayConfig()
  if (!cfg) back('indisponible')

  const db = getDb()
  const checkout = await createCheckout({ db }, { workspaceId: ctx.workspaceId, userId: ctx.userId, plan, cycle })
  const base = getCloudflareContext().env.BETTER_AUTH_URL.replace(/\/+$/, '')
  const label = PLANS[plan].label
  const page = await createPaymentPage(cfg!, {
    depositId: checkout.id,
    amount: checkout.amount,
    // pawaPay refuse « localhost » : 127.0.0.1 en local, puis /paiement/retour renvoie vers BETTER_AUTH_URL.
    returnUrl: `${base.replace('//localhost', '//127.0.0.1')}/paiement/retour/${checkout.id}`,
    reason: `link.cg ${label}, ${cycle === 'year' ? '1 an' : '1 mois'}`,
    // 4 à 22 caractères, lettres, chiffres et espaces seulement (relevé de l'opérateur).
    customerMessage: `linkcg ${label}`,
  })
  if (!page.ok) {
    await failCheckout({ db }, checkout.id, page.code)
    back('operateur')
  }
  redirect(page.ok ? page.redirectUrl : '/compte/facturation')
}
