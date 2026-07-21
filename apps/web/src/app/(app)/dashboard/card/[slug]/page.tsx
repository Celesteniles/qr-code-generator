import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCardBySlug } from '@link/db'
import { getDb } from '@/server/data'
import { getSessionContext } from '@/server/session'
import { updateCardAction } from '@/server/actions'

export const dynamic = 'force-dynamic'

const input =
  'w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'

export default async function EditCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/login')

  const { slug } = await params
  const card = await getCardBySlug(getDb(), slug)
  if (!card) notFound()
  // Propriété : on n'édite que ses propres cartes.
  if (card.link.workspaceId !== ctx.workspaceId) notFound()
  const p = card.profile

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200">← Retour</Link>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Carte · link.cg/{slug}</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6">
        <form action={updateCardAction} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
          <input type="hidden" name="linkId" value={card.link.id} />
          <input type="hidden" name="slug" value={slug} />
          <input name="fullName" required defaultValue={p?.fullName ?? ''} placeholder="Nom complet" className={input} />
          <div className="grid grid-cols-2 gap-2">
            <input name="title" defaultValue={p?.title ?? ''} placeholder="Poste" className={input} />
            <input name="org" defaultValue={p?.org ?? ''} placeholder="Organisation" className={input} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input name="cardPhone" type="tel" defaultValue={p?.phone ?? ''} placeholder="Téléphone" className={input} />
            <input name="cardEmail" type="email" defaultValue={p?.email ?? ''} placeholder="Email" className={input} />
          </div>
          <input name="website" type="url" defaultValue={p?.socials?.[0]?.url ?? ''} placeholder="Site web" className={input} />
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2 px-5 rounded-xl">
              Enregistrer
            </button>
            <a href={`https://link.cg/${slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Voir la carte →
            </a>
          </div>
        </form>
      </main>
    </div>
  )
}
