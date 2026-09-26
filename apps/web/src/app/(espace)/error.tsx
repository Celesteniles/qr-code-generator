'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { Illustration } from '@/components/kit/Illustration'

// Échec de chargement d'un écran de l'espace : on explique, on propose de réessayer.
// Les liens déjà partagés et les QR imprimés ne dépendent pas de cette page.
export default function EspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="anim-rise grid place-items-center px-4 py-16 text-center lg:px-8" role="alert">
      <Illustration name="hello" className="w-full max-w-[280px] overflow-hidden rounded-3xl bg-sky" />
      <h1 className="h2 mt-6">Cette page n&apos;a pas pu s&apos;afficher</h1>
      <p className="lead mt-2 max-w-[46ch]">
        Un souci passager de notre côté. Vos liens et vos QR imprimés, eux, continuent de fonctionner.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <button type="button" className="btn btn-cta" onClick={reset}><ArrowPathIcon />Réessayer</button>
        <Link href="/" className="btn btn-ghost">Retour à l&apos;accueil</Link>
      </div>
    </div>
  )
}
