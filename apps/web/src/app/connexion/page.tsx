import type { Metadata } from 'next'
import { PLANS } from '@link/shared'
import { Logo } from '@/components/kit/Logo'
import { UseCases } from '@/components/auth/UseCases'
import { AuthPanel } from '@/components/auth/AuthPanel'
import { safeNext } from '@/components/auth/safe-next'

// Connexion et inscription sur un seul écran (hors coquille) :
// visuel à gauche sur grand écran, formulaire à droite.

export const metadata: Metadata = {
  title: 'Connexion · link.cg',
  robots: { index: false },
}

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[]; next?: string | string[] }>
}) {
  const sp = await searchParams
  const mode = (Array.isArray(sp.mode) ? sp.mode[0] : sp.mode) === 'inscription' ? 'inscription' : 'connexion'
  const next = safeNext(sp.next)

  return (
    <div className="grid min-h-screen gap-3 p-3 lg:grid-cols-2">
      {/* Vitrine « Pour qui ? » : tient dans la hauteur de l'écran, sans texte coupé */}
      <aside className="relative hidden flex-col overflow-hidden rounded-[30px] bg-sky p-8 lg:sticky lg:top-3 lg:flex lg:h-[calc(100vh-24px)] xl:p-10">
        <Logo />
        <UseCases />
        <p className="mt-5 text-[13px] text-muted">
          Paiement Airtel Money ou MTN MoMo · Aucune publicité pour vos clients
        </p>
      </aside>

      <main className="grid place-items-center px-2 py-8 sm:px-5">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <AuthPanel initialMode={mode} next={next} freeLinks={PLANS.free.maxLinks} />
        </div>
      </main>
    </div>
  )
}
