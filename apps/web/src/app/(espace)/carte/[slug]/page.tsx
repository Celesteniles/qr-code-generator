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
import { ActiveSwitch } from '@/components/liens/ActiveSwitch'
import { DeleteZone } from '@/components/liens/DeleteZone'
import { deleteLinkAction } from '@/server/actions'

export const metadata: Metadata = { title: 'Modifier ma carte · link.cg' }

/** Supprime la carte puis revient aux cartes. */
async function deleteAndLeave(formData: FormData) {
  'use server'
  await deleteLinkAction(formData)
  redirect('/carte?liste=1')
}

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
        footer={
          <div className="mt-12 grid gap-4" aria-label="Gérer la carte" role="region">
            <section className="card p-[22px] sm:p-[26px]">
              <ActiveSwitch linkId={card.link.id} active={card.link.active} noun="carte" />
            </section>
            <section className="rounded-[26px] p-[22px] shadow-[inset_0_0_0_1.5px_var(--bad-tint)] sm:p-[26px]">
              <DeleteZone linkId={card.link.id} action={deleteAndLeave} noun="carte" />
            </section>
          </div>
        }
      />
    </div>
  )
}
