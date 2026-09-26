import type { Metadata } from 'next'
import Link from 'next/link'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { getViewer } from '@/server/viewer'
import { GuestHome } from '@/components/accueil/GuestHome'
import { MemberHome } from '@/components/accueil/MemberHome'

// Accueil de l'espace (proposition D) : visiteur et inscrit sur la même adresse.
// Le site sert aussi de « générateur de QR code gratuit » : métadonnées SEO ici.

const DESCRIPTION =
  'Générateur de QR code gratuit et sans inscription : QR pour menu, WhatsApp, Wi‑Fi, site ou carte de visite, ' +
  'à vos couleurs, en PNG, SVG ou PDF. Raccourcissez aussi vos liens avec link.cg : liens courts et QR modifiables, avec leurs statistiques.'

export const metadata: Metadata = {
  title: 'Générateur de QR code gratuit et liens courts — link.cg',
  description: DESCRIPTION,
  openGraph: {
    title: 'Générateur de QR code gratuit et liens courts — link.cg',
    description: DESCRIPTION,
    type: 'website',
  },
}

const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Brazzaville' })

export default async function AccueilPage() {
  const { viewer, ctx } = await getViewer()
  const date = today.format(new Date())

  return (
    <>
      <div className="flex items-center gap-2.5 px-4 py-3.5 lg:px-8 lg:py-[18px]">
        {ctx ? (
          <span className="eyebrow">{date.charAt(0).toUpperCase() + date.slice(1)}</span>
        ) : (
          <>
            <span className="eyebrow"><SparklesIcon className="h-4 w-4" aria-hidden="true" />Gratuit · sans inscription</span>
            <div className="ml-auto flex items-center gap-2">
              <Link className="btn btn-ghost btn-sm" href="/bienvenue">Visite guidée</Link>
              <Link className="btn btn-soft btn-sm max-lg:hidden" href="/connexion">Se connecter</Link>
            </div>
          </>
        )}
      </div>
      <div className="px-4 pb-14 pt-1 lg:px-8 lg:pt-2">
        {ctx ? <MemberHome ctx={ctx} viewer={viewer} /> : <GuestHome />}
      </div>
    </>
  )
}
