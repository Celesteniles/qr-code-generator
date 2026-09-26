import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRightIcon, DevicePhoneMobileIcon, DocumentTextIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { getViewer } from '@/server/viewer'
import { getBillingOverview } from '@/server/billing'
import { ISSUER } from '@/server/billing-config'
import { SectionHead } from '@/components/compte/SectionHead'
import { PaymentHistory } from '@/components/facturation/PaymentHistory'
import { formatDate } from '@/components/facturation/format'
import { CompteTabs } from '../CompteTabs'
import { MOBILE_MONEY, PaymentMethodChip } from '@/components/kit/PaymentMethod'

export const metadata: Metadata = { title: 'Facturation — link.cg' }


export default async function FacturationPage() {
  const { ctx } = await getViewer()
  if (!ctx) redirect('/connexion?next=/compte/facturation')
  const { planId, planLabel, current, payments } = await getBillingOverview(ctx)

  return (
    <div className="px-4 pb-14 pt-6 sm:px-8 lg:px-10 lg:pt-9">
      <h1 className="h1">Mon compte</h1>
      <p className="lead mt-2 max-w-[60ch]">Votre offre, vos paiements et leurs reçus.</p>
      <CompteTabs current="/compte/facturation" />

      <div className="mt-8 grid items-start gap-4 lg:grid-cols-2">
        <section className="card p-5 sm:p-[26px]" aria-labelledby="f-offre">
          <SectionHead icon={<SparklesIcon />} tone="bg-lilac text-ink" id="f-offre" title="Offre actuelle" />
          <span className="pill pill-brand">{planLabel}</span>
          <p className="mt-3 text-sm text-muted">
            {current
              ? <>Réglée jusqu&apos;au {formatDate(current.periodEnd - 1)}. Prochaine échéance le <strong className="text-ink">{formatDate(current.periodEnd)}</strong>.</>
              : planId === 'free'
                ? 'L’offre Gratuite n’a pas d’échéance : rien à payer.'
                : 'Aucune période payée en cours n’est enregistrée pour votre espace.'}
          </p>
          <Link href="/offres" className="btn btn-soft btn-sm mt-4">Voir les offres<ArrowRightIcon aria-hidden="true" /></Link>
        </section>

        <section className="card p-5 sm:p-[26px]" aria-labelledby="f-moyens">
          <SectionHead icon={<DevicePhoneMobileIcon />} tone="bg-ok-tint text-ok" id="f-moyens" title="Moyens de paiement">
            Les abonnements se règlent par mobile money.
          </SectionHead>
          <ul className="flex flex-wrap gap-2.5" aria-label="Moyens de paiement acceptés">
            {MOBILE_MONEY.map((m) => <li key={m}><PaymentMethodChip method={m} /></li>)}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Pour changer d&apos;offre, écrivez-nous à{' '}
            <a className="link" href={`mailto:${ISSUER.email}`}>{ISSUER.email}</a>.
          </p>
        </section>
      </div>

      <section className="card mt-4 p-5 sm:p-[26px]" aria-labelledby="f-historique">
        <SectionHead icon={<DocumentTextIcon />} tone="bg-brand-tint text-brand" id="f-historique" title="Historique des paiements">
          {payments.length ? 'Chaque paiement a son reçu, à télécharger en PDF ou à imprimer.' : undefined}
        </SectionHead>
        <PaymentHistory payments={payments} planLabel={planLabel} />
      </section>
    </div>
  )
}
