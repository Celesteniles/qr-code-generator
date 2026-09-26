import Link from 'next/link'
import { ArrowRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import type { PaymentRow } from '@link/db'
import { PLANS } from '@link/shared'
import { Illustration } from '@/components/kit/Illustration'
import { METHOD_LABEL, formatFcfa, formatPeriod, formatShortDate } from './format'
import { StatusPill } from './StatusPill'
import { PaymentMethodInline } from '@/components/kit/PaymentMethod'

const receiptHref = (id: string) => `/compte/facturation/${encodeURIComponent(id)}`
/** Date affichée : celle du paiement s'il a abouti, sinon celle de la demande. */
const shownDate = (p: PaymentRow) => p.paidAt ?? p.createdAt

/** Historique des paiements : tableau sur grand écran, liste de cartes sur mobile. */
export function PaymentHistory({ payments, planLabel }: { payments: PaymentRow[]; planLabel: string }) {
  if (!payments.length) return <EmptyHistory planLabel={planLabel} />

  return (
    <>
      {/* Grand écran */}
      <div className="-mx-2 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-muted [&>th]:border-b [&>th]:border-line [&>th]:px-2 [&>th]:pb-2.5">
              <th scope="col">Date</th>
              <th scope="col">N° de reçu</th>
              <th scope="col">Offre</th>
              <th scope="col">Période</th>
              <th scope="col" className="text-right">Montant</th>
              <th scope="col">Moyen</th>
              <th scope="col">Statut</th>
              <th scope="col"><span className="sr-only">Reçu</span></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="[&>td]:border-b [&>td]:border-line [&>td]:px-2 [&>td]:py-3 last:[&>td]:border-b-0">
                <td className="whitespace-nowrap">{formatShortDate(shownDate(p))}</td>
                <td className="whitespace-nowrap font-mono text-[13px]">{p.receiptNumber}</td>
                <td>{PLANS[p.plan].label}</td>
                <td className="text-muted">{formatPeriod(p.periodStart, p.periodEnd, true)}</td>
                <td className="whitespace-nowrap text-right font-semibold tabular-nums">{formatFcfa(p.amount)}</td>
                <td><PaymentMethodInline method={p.method} label={METHOD_LABEL[p.method]} /></td>
                <td><StatusPill status={p.status} /></td>
                <td className="whitespace-nowrap text-right">
                  <Link href={receiptHref(p.id)} className="link text-[13px]" aria-label={`Voir le reçu ${p.receiptNumber}`}>
                    Voir le reçu<ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="grid gap-3 md:hidden">
        {payments.map((p) => (
          <li key={p.id} className="rounded-[18px] p-4 shadow-[inset_0_0_0_1px_var(--line)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">Offre {PLANS[p.plan].label}</p>
                <p className="text-[13px] text-muted">{formatPeriod(p.periodStart, p.periodEnd, true)}</p>
              </div>
              <StatusPill status={p.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="text-muted">Montant</dt><dd className="text-right font-semibold tabular-nums">{formatFcfa(p.amount)}</dd>
              <dt className="text-muted">Date</dt><dd className="text-right">{formatShortDate(shownDate(p))}</dd>
              <dt className="text-muted">Moyen</dt><dd className="flex justify-end"><PaymentMethodInline method={p.method} label={METHOD_LABEL[p.method]} size={18} /></dd>
              <dt className="text-muted">N° de reçu</dt><dd className="text-right font-mono">{p.receiptNumber}</dd>
            </dl>
            <Link href={receiptHref(p.id)} className="btn btn-soft btn-sm mt-3 w-full">
              <DocumentTextIcon aria-hidden="true" className="h-4 w-4" />Voir le reçu
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

function EmptyHistory({ planLabel }: { planLabel: string }) {
  return (
    <div className="grid items-center gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
      <Illustration name="empty" height={130} className="overflow-hidden rounded-[20px] bg-sky" />
      <div>
        <p className="h3">Aucun paiement pour l&apos;instant</p>
        <p className="mt-1 text-sm text-muted">
          Vous êtes sur l&apos;offre {planLabel}. Vos paiements et leurs reçus apparaîtront ici.
        </p>
        <Link href="/offres" className="btn btn-soft btn-sm mt-4">Voir les offres<ArrowRightIcon aria-hidden="true" className="h-4 w-4" /></Link>
      </div>
    </div>
  )
}
