import Link from 'next/link'
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline'
import { LogoMark } from './LogoMark'

/** Contenu de la page 404 (page autonome et version dans l'espace). */
export function NotFoundContent() {
  return (
    <div className="anim-rise mx-auto grid max-w-[460px] justify-items-center text-center">
      <div className="relative">
        <LogoMark size={96} />
        <span className="absolute -right-3 -top-2 rounded-full bg-surface px-2.5 py-0.5 font-display text-sm font-bold text-muted shadow-[inset_0_0_0_1px_var(--line)]">404</span>
      </div>
      <h1 className="h1 mt-6">Cette page n&apos;existe pas</h1>
      <p className="lead mt-3">
        L&apos;adresse est peut-être mal tapée, ou la page a été déplacée. Vos liens et vos QR, eux, fonctionnent toujours.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-cta btn-lg"><ArrowLeftIcon aria-hidden="true" />Retour à l&apos;accueil</Link>
        <Link href="/creer" className="btn btn-soft btn-lg"><PlusIcon aria-hidden="true" />Créer un lien ou un QR</Link>
      </div>
    </div>
  )
}
