import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { getCardBySlug } from '@link/db'
import { getDb } from '@/server/data'
import { CardView } from '@/components/carte/CardView'
import { SaveContactButton } from '@/components/carte/SaveContactButton'
import { fieldsFromProfile } from '@/components/carte/card-model'

// Page publique d'une carte de visite, ouverte par les contacts (lien ou QR).
// Hors coquille de l'application : c'est la carte de la personne, pas link.cg.

export const dynamic = 'force-dynamic'

const loadCard = cache((slug: string) => getCardBySlug(getDb(), slug))

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const card = await loadCard(slug)
  const p = card?.link.active ? card.profile : null
  if (!p) return { title: 'Carte de visite · link.cg' }
  const role = [p.title, p.org].filter(Boolean).join(' · ')
  return {
    title: p.fullName,
    description: role ? `${role} — carte de visite sur link.cg` : 'Carte de visite sur link.cg',
  }
}

export default async function PublicCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const card = await loadCard(slug)
  if (!card) notFound()

  // En pause : page neutre (comme un lien en pause), sans rien révéler du profil.
  if (!card.link.active) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg px-4 py-10 text-center">
        <div className="card max-w-sm p-8">
          <h1 className="h3">Cette carte n&apos;est plus active</h1>
          <p className="mt-2 text-muted">Son propriétaire l&apos;a mise en pause. Elle sera de nouveau visible s&apos;il la réactive.</p>
          <Link href="/" className="link mt-4">Créez votre carte gratuite sur link.cg</Link>
        </div>
      </main>
    )
  }

  if (!card.profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg px-4 py-10 text-center">
        <div className="card max-w-sm p-8">
          <h1 className="h3">Cette carte n&apos;est pas encore prête</h1>
          <p className="mt-2 text-muted">Son propriétaire ne l&apos;a pas encore remplie. Réessayez un peu plus tard.</p>
          <Link href="/" className="link mt-4">Créez votre carte gratuite sur link.cg</Link>
        </div>
      </main>
    )
  }

  const fields = fieldsFromProfile(card.profile)
  return (
    <main className="min-h-screen bg-[#f6f3ee] sm:grid sm:place-items-start sm:bg-[#e9e3d8] sm:px-4 sm:py-10">
      <div className="mx-auto w-full max-w-[440px] sm:overflow-hidden sm:rounded-[32px] sm:shadow-[0_30px_70px_-30px_rgba(22,22,29,.45)]">
        <CardView fields={fields} saveButton={<SaveContactButton slug={card.link.slug} />} />
      </div>
    </main>
  )
}
