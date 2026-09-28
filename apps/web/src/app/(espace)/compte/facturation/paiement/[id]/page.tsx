import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { canManageBilling, getCheckout } from '@link/db'
import { PLANS } from '@link/shared'
import { getViewer } from '@/server/viewer'
import { getDb } from '@/server/data'
import { UUID_RE, reconcileCheckout } from '@/server/checkout'
import { AutoRefresh } from '@/components/facturation/AutoRefresh'
import { formatFcfa } from '@/components/facturation/format'

export const metadata: Metadata = { title: 'Paiement — link.cg', robots: { index: false } }

type Props = { params: Promise<{ id: string }> }

// Page de retour de pawaPay. Elle relit le dépôt chez pawaPay à chaque affichage
// (utile si le callback n'est pas encore arrivé, ou en local où il n'arrive pas),
// et se recharge seule tant que le paiement est en attente.

const FAILURES: Record<string, string> = {
  INSUFFICIENT_BALANCE: 'Le solde de votre compte mobile money est insuffisant.',
  PAYMENT_NOT_APPROVED: 'Le paiement n’a pas été validé sur votre téléphone.',
  PAYER_NOT_FOUND: 'Ce numéro n’a pas de compte mobile money actif.',
}

export default async function PaiementPage({ params }: Props) {
  const { id } = await params
  const { ctx } = await getViewer()
  if (!ctx) redirect(`/connexion?next=${encodeURIComponent(`/compte/facturation/paiement/${id}`)}`)
  if (!canManageBilling(ctx.role)) redirect('/compte')
  if (!UUID_RE.test(id)) notFound()

  // Tentative d'un autre espace : même réponse qu'une tentative inconnue.
  const own = await getCheckout(getDb(), id)
  if (!own || own.workspaceId !== ctx.workspaceId) notFound()
  const checkout = (await reconcileCheckout(id)) ?? own
  const label = PLANS[checkout.plan].label

  return (
    <div className="px-4 pb-14 pt-6 sm:px-8 lg:px-10 lg:pt-9">
      <div className="card mx-auto max-w-[560px] p-6 text-center sm:p-8" aria-live="polite">
        {checkout.status === 'completed' ? (
          <>
            <span className="pill pill-ok">Paiement reçu</span>
            <h1 className="h1 mt-4">Bienvenue en {label}</h1>
            <p className="lead mt-2">{formatFcfa(checkout.amount)} réglés. Votre offre est active dès maintenant.</p>
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {checkout.paymentId && <Link className="btn btn-soft" href={`/compte/facturation/${checkout.paymentId}`}>Voir le reçu</Link>}
              <Link className="btn btn-brand" href="/liens">Mes liens</Link>
            </div>
          </>
        ) : checkout.status === 'failed' ? (
          <>
            <span className="pill pill-bad">Paiement non abouti</span>
            <h1 className="h1 mt-4">Le paiement n’est pas passé</h1>
            <p className="lead mt-2">
              {FAILURES[checkout.failureCode ?? ''] ?? 'L’opérateur a refusé ou interrompu le paiement.'} Aucun montant n’a été prélevé.
            </p>
            <Link className="btn btn-brand mt-6 w-full" href={`/compte/facturation/payer?offre=${checkout.plan}&cycle=${checkout.cycle}`}>Réessayer</Link>
          </>
        ) : (
          <>
            <AutoRefresh />
            <span className="pill pill-sun">En attente</span>
            <h1 className="h1 mt-4">Validez le paiement sur votre téléphone</h1>
            <p className="lead mt-2">
              Composez votre code secret mobile money pour confirmer {formatFcfa(checkout.amount)}. Cette page se met à jour toute seule.
            </p>
            <Link className="btn btn-ghost btn-sm mt-6" href="/compte/facturation">Revenir plus tard</Link>
          </>
        )}
      </div>
    </div>
  )
}
