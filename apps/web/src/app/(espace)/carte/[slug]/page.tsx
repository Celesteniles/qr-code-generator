import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowTopRightOnSquareIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { getCardBySlug } from '@link/db'
import { getDb } from '@/server/data'
import { getViewer } from '@/server/viewer'
import { CardEditor } from '@/components/carte/CardEditor'
import { CardQr, CopyCardLink } from '@/components/carte/CardShare'
import { fieldsFromProfile } from '@/components/carte/card-model'

export const metadata: Metadata = { title: 'Modifier ma carte · link.cg' }

export default async function EditCartePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { ctx } = await getViewer()
  if (!ctx) redirect(`/connexion?next=${encodeURIComponent(`/carte/${slug}`)}`)

  const card = await getCardBySlug(getDb(), slug)
  // Propriété : on n'édite que ses propres cartes (404 sinon, sans rien révéler).
  if (!card || card.link.workspaceId !== ctx.workspaceId) notFound()

  return (
    <div className="px-4 py-5 sm:px-8 lg:px-10 lg:py-7">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <CopyCardLink slug={card.link.slug} />
        {!card.link.active && <span className="pill pill-bad">En pause : la carte n&apos;est pas visible</span>}
        <div className="ml-auto flex items-center gap-1">
          <Link href="/carte?liste=1" className="btn btn-ghost btn-sm"><Squares2X2Icon />Mes cartes</Link>
          <a href={`/c/${card.link.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
            <ArrowTopRightOnSquareIcon />Voir en ligne<span className="sr-only"> (nouvel onglet)</span>
          </a>
        </div>
      </div>

      <CardEditor
        linkId={card.link.id}
        slug={card.link.slug}
        initial={fieldsFromProfile(card.profile)}
        aside={<CardQr slug={card.link.slug} />}
      />
    </div>
  )
}
