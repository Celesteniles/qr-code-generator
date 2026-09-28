import Link from 'next/link'
import { Logo } from '@/components/kit/Logo'
import { MadeBy } from '@/components/kit/MadeBy'

// Pages légales (confidentialité, conditions) : hors coquille de l'espace, pour
// rester lisibles par tous — visiteurs, comptes non vérifiés, robots de Google
// (l'écran de consentement OAuth y renvoie).

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[720px]">
        <header className="mb-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Logo />
          <nav className="ml-auto flex gap-5 text-sm" aria-label="Pages légales">
            <Link href="/confidentialite" className="link">Confidentialité</Link>
            <Link href="/conditions" className="link">Conditions</Link>
          </nav>
        </header>
        <main className="legal">{children}</main>
        <MadeBy className="mt-12" />
      </div>
    </div>
  )
}
