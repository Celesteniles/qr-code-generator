import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { canManageBilling } from '@link/db'
import { PLANS, isPayablePlan, planPrice, type BillingCycle } from '@link/shared'
import { getViewer } from '@/server/viewer'
import { getPawapayConfig } from '@/server/pawapay'
import { startCheckoutAction } from '@/server/billing-actions'
import { ISSUER } from '@/server/billing-config'
import { formatFcfa } from '@/components/facturation/format'
import { MOBILE_MONEY, PaymentMethodChip } from '@/components/kit/PaymentMethod'

export const metadata: Metadata = { title: 'Payer mon offre — link.cg', robots: { index: false } }

type Props = { searchParams: Promise<{ offre?: string; cycle?: string; erreur?: string }> }

const ERRORS: Record<string, string> = {
  droits: 'Seuls le propriétaire et les administrateurs de l’espace peuvent payer son offre.',
  indisponible: 'Le paiement en ligne n’est pas encore ouvert. Écrivez-nous pour changer d’offre.',
  operateur: 'Le service de paiement n’a pas pu démarrer. Réessayez dans quelques minutes.',
}

export default async function PayerPage({ searchParams }: Props) {
  const { offre = '', cycle: rawCycle, erreur } = await searchParams
  const { ctx, viewer } = await getViewer()
  if (!ctx) redirect(`/connexion?next=${encodeURIComponent(`/compte/facturation/payer?offre=${offre}`)}`)
  if (!isPayablePlan(offre)) redirect('/offres')
  if (!canManageBilling(ctx.role)) redirect('/compte')

  const plan = PLANS[offre]
  const cycle: BillingCycle = rawCycle === 'month' ? 'month' : 'year'
  const enabled = !!getPawapayConfig()
  const month = planPrice(offre, 'month')
  const year = planPrice(offre, 'year')
  const current = viewer.plan?.label ?? null

  return (
    <div className="px-4 pb-14 pt-6 sm:px-8 lg:px-10 lg:pt-9">
      <div className="mx-auto max-w-[560px]">
        <Link href="/offres" className="btn btn-ghost btn-sm -ml-3"><ArrowLeftIcon aria-hidden="true" />Offres</Link>
        <h1 className="h1 mt-3">Offre {plan.label}</h1>
        <p className="lead mt-2">
          {current && current !== plan.label ? <>Vous êtes actuellement en {current}. </> : null}
          Paiement par mobile money, sans carte bancaire.
        </p>

        {erreur && ERRORS[erreur] && (
          <p role="alert" className="mt-5 rounded-[18px] bg-bad-tint px-4 py-3 text-sm text-bad">{ERRORS[erreur]}</p>
        )}

        {enabled ? (
          <form action={startCheckoutAction} className="card mt-6 grid gap-3 p-5 sm:p-[26px]">
            <input type="hidden" name="plan" value={offre} />
            <fieldset className="grid gap-3">
              <legend className="mb-1 font-semibold">Rythme de paiement</legend>
              {([
                ['year', `${formatFcfa(year)} pour un an`, `soit ${formatFcfa(month * 12 - year)} d’économie`],
                ['month', `${formatFcfa(month)} pour un mois`, 'à renouveler chaque mois'],
              ] as const).map(([value, title, hint]) => (
                <label key={value} className="flex cursor-pointer items-center gap-3 rounded-[18px] bg-soft px-4 py-3 has-[:checked]:shadow-[inset_0_0_0_2px_var(--brand)]">
                  <input type="radio" name="cycle" value={value} defaultChecked={cycle === value} className="accent-[var(--brand)]" />
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-sm text-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <button type="submit" className="btn btn-brand mt-2 w-full">Payer avec Mobile Money</button>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {MOBILE_MONEY.map((m) => <PaymentMethodChip key={m} method={m} />)}
            </div>
            <p className="text-center text-xs text-muted">
              Vous validerez le paiement avec votre code secret, sur votre téléphone. Le reçu est disponible dès la confirmation.
            </p>
          </form>
        ) : (
          <div className="card mt-6 p-5 sm:p-[26px]">
            <p>Le paiement en ligne ouvre bientôt. En attendant, écrivez-nous et nous activons votre offre.</p>
            <a className="btn btn-brand mt-4 w-full" href={`mailto:${ISSUER.email}?subject=${encodeURIComponent(`Offre ${plan.label} link.cg`)}`}>
              Écrire à {ISSUER.email}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
