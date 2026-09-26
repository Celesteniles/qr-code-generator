import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { getViewer } from '@/server/viewer'
import { getOwnReceipt } from '@/server/billing'
import { ISSUER, SERVICE_NAME } from '@/server/billing-config'
import { Receipt } from '@/components/facturation/Receipt'
import { PrintButton } from '@/components/facturation/PrintButton'

type Props = { params: Promise<{ id: string }> }

// Le titre sert aussi de nom de fichier par défaut à « Enregistrer en PDF ».
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { ctx } = await getViewer()
  const data = ctx ? await getOwnReceipt(ctx.workspaceId, id) : null
  return { title: data ? `Reçu ${data.payment.receiptNumber} — link.cg` : 'Reçu — link.cg' }
}

export default async function RecuPage({ params }: Props) {
  const { id } = await params
  const { ctx } = await getViewer()
  if (!ctx) redirect(`/connexion?next=${encodeURIComponent(`/compte/facturation/${id}`)}`)

  // Paiement absent ou d'un autre espace : même réponse, 404.
  const data = await getOwnReceipt(ctx.workspaceId, id)
  if (!data) notFound()

  return (
    <div className="receipt-page px-4 pb-14 pt-6 sm:px-8 lg:px-10 lg:pt-9">
      <div className="mx-auto mb-5 flex max-w-[820px] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/compte/facturation" className="btn btn-ghost btn-sm -ml-3"><ArrowLeftIcon aria-hidden="true" />Facturation</Link>
        <PrintButton />
      </div>
      <Receipt
        payment={data.payment}
        client={{ name: data.workspaceName || ctx.name || ctx.email, email: ctx.email }}
        issuer={ISSUER}
        serviceName={SERVICE_NAME}
      />
    </div>
  )
}
