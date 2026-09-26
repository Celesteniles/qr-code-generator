import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { maskPhone, type PaymentRow } from '@link/db'
import { PLANS } from '@link/shared'
import type { Issuer } from '@/server/billing-config'
import { METHOD_LABEL, formatDate, formatFcfa, formatPeriod } from './format'
import { StatusPill } from './StatusPill'
import { PaymentMethodInline } from '@/components/kit/PaymentMethod'

// Feuille d'impression : masque la coquille (barre latérale, en-tête et onglets
// mobiles), force le thème clair sur fond blanc, format A4. Les éléments marqués
// `print:hidden` (boutons, onglets) disparaissent aussi.
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 16mm 14mm; }
  :root, :root[data-theme] { color-scheme: light !important; --bg: #fff !important; }
  html, body { background: #fff !important; }
  /* Coquille : grille à barre latérale -> bloc simple ; en-tête et onglets mobiles masqués. */
  div:has(> aside) { display: block !important; min-height: 0 !important; }
  div:has(> aside) > aside, div:has(> aside) > nav, div:has(> main) > header, nextjs-portal { display: none !important; }
  div:has(> main) { padding: 0 !important; }
  main { min-height: 0 !important; padding: 0 !important; background: #fff !important; box-shadow: none !important; border-radius: 0 !important; }
  .receipt-page { padding: 0 !important; }
  .receipt-page {
    --bg: #fff; --surface: #fff; --soft: #f4f1ec; --line: #d9d3c7; --line-strong: #8f8573;
    --ink: #16161d; --muted: #4f4c44; --subtle: #6b665b; --brand: #0060ff; --brand-tint: #e3ecff;
    --ok: #117544; --ok-tint: #dcf3e6; --sun: #ffe6b3; --bad: #b42323; --bad-tint: #fde4e4;
    color: #16161d; color-scheme: light;
  }
  .receipt-sheet { box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; max-width: none !important; }
  .receipt-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .receipt-sheet table, .receipt-sheet section { break-inside: avoid; }
}
`

const TITLE: Record<PaymentRow['status'], string> = {
  paid: 'Reçu de paiement',
  refunded: 'Reçu de paiement — remboursé',
  pending: 'Paiement en attente',
  failed: 'Paiement échoué',
}

/** Ligne libellé / valeur ; rien n'est rendu si la valeur est vide. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === '') return null
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2 last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}

export function Receipt({ payment: p, client, issuer, serviceName }: {
  payment: PaymentRow
  client: { name: string; email: string }
  issuer: Issuer
  serviceName: string
}) {
  const isReceipt = p.status === 'paid' || p.status === 'refunded'
  const phone = maskPhone(p.payerPhone)
  const issuerLines = [
    issuer.address,
    issuer.phone && `Tél. ${issuer.phone}`,
    issuer.website,
    issuer.email,
    issuer.niu && `NIU : ${issuer.niu}`,
    issuer.rccm && `RCCM : ${issuer.rccm}`,
  ].filter(Boolean) as string[]

  return (
    <>
      <style>{PRINT_CSS}</style>
      <article className="receipt-sheet card mx-auto max-w-[820px] p-6 sm:p-10" aria-labelledby="recu-titre">
        {/* En-tête : émetteur à gauche, document à droite */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div className="min-w-0">
            <p className="font-display text-xl font-bold tracking-tight">{issuer.name}</p>
            <address className="mt-1 text-[13px] not-italic leading-relaxed text-muted">
              {issuerLines.map((l) => <span key={l} className="block">{l}</span>)}
            </address>
          </div>
          <div className="sm:text-right">
            <h1 id="recu-titre" className="font-display text-2xl font-bold tracking-tight">{TITLE[p.status]}</h1>
            <p className="mt-1 font-mono text-sm font-semibold">N° {p.receiptNumber}</p>
            <p className="text-[13px] text-muted">
              {isReceipt && p.paidAt ? `Payé le ${formatDate(p.paidAt)}` : `Émis le ${formatDate(p.createdAt)}`}
            </p>
          </div>
        </div>

        {!isReceipt && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-bad-tint p-4 text-bad" role="note">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="text-sm">
              <strong className="block">Ce document n&apos;est pas un reçu de paiement.</strong>
              {p.status === 'pending'
                ? 'Le paiement n’a pas encore été confirmé par l’opérateur.'
                : 'Le paiement n’a pas abouti : aucun montant n’a été encaissé.'}
            </div>
          </div>
        )}
        {p.status === 'refunded' && (
          <p className="mt-6 rounded-2xl bg-soft p-4 text-sm">Ce paiement a été remboursé.</p>
        )}

        {/* Client */}
        <section className="mt-6" aria-labelledby="recu-client">
          <h2 id="recu-client" className="text-xs font-semibold uppercase tracking-wide text-muted">Client</h2>
          <p className="mt-1 font-semibold">{client.name}</p>
          <p className="text-sm text-muted">{client.email}</p>
        </section>

        {/* Désignation */}
        <table className="mt-6 w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-muted [&>th]:border-b [&>th]:border-line [&>th]:pb-2">
              <th scope="col">Désignation</th>
              <th scope="col" className="hidden sm:table-cell print:table-cell">Période</th>
              <th scope="col" className="text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr className="[&>td]:border-b [&>td]:border-line [&>td]:py-3 [&>td]:align-top">
              <td>
                Abonnement {serviceName} — offre {PLANS[p.plan].label}
                <span className="block text-[13px] text-muted sm:hidden print:hidden">{formatPeriod(p.periodStart, p.periodEnd)}</span>
              </td>
              <td className="hidden sm:table-cell print:table-cell">{formatPeriod(p.periodStart, p.periodEnd)}</td>
              <td className="whitespace-nowrap text-right tabular-nums">{formatFcfa(p.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2} className="hidden pt-3 text-right font-semibold sm:table-cell print:table-cell">
                {isReceipt ? 'Total payé' : 'Montant'}
              </th>
              <th scope="row" className="pt-3 text-left font-semibold sm:hidden print:hidden">{isReceipt ? 'Total payé' : 'Montant'}</th>
              <td className="whitespace-nowrap pt-3 text-right font-display text-xl font-bold tabular-nums">{formatFcfa(p.amount)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Paiement */}
        <section className="mt-8" aria-labelledby="recu-paiement">
          <h2 id="recu-paiement" className="text-xs font-semibold uppercase tracking-wide text-muted">Paiement</h2>
          <dl className="mt-1 text-sm">
            <Row label="Moyen de paiement"><PaymentMethodInline method={p.method} label={METHOD_LABEL[p.method]} size={18} /></Row>
            <Row label="Référence opérateur">{p.providerReference && <span className="font-mono">{p.providerReference}</span>}</Row>
            <Row label="Téléphone">{phone && <span className="font-mono">{phone}</span>}</Row>
            <Row label="Date du paiement">{p.paidAt ? formatDate(p.paidAt) : null}</Row>
            <Row label="Statut"><StatusPill status={p.status} /></Row>
          </dl>
        </section>

        <footer className="mt-10 border-t border-line pt-4 text-[12px] text-muted">
          <p>Montants en francs CFA (XAF).</p>
          <p>Une question sur ce document ? Écrivez à {issuer.email} en indiquant le n° {p.receiptNumber}.</p>
        </footer>
      </article>
    </>
  )
}
