import type { Metadata } from 'next'
import { Logo } from '@/components/kit/Logo'
import { NotFoundContent } from '@/components/kit/NotFoundContent'

// Adresse inconnue (hors de l'espace) : page autonome, aux couleurs de link.cg.
export const metadata: Metadata = { title: 'Page introuvable · link.cg', robots: { index: false } }

export default function NotFound() {
  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr] bg-bg px-4 py-5 sm:px-8">
      <div><Logo /></div>
      <div className="grid place-items-center py-10">
        <NotFoundContent />
      </div>
    </main>
  )
}
