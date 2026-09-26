import type { Metadata } from 'next'
import { PLANS } from '@link/shared'
import { Logo } from '@/components/kit/Logo'
import { Illustration } from '@/components/kit/Illustration'
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
      <aside className="relative hidden flex-col overflow-hidden rounded-[30px] bg-sky p-10 lg:flex">
        <Logo />
        <Illustration name="modifiable" className="my-auto max-w-[520px] self-center" />
        <div className="max-w-[40ch]">
          <p className="eyebrow">Exemple d&apos;usage</p>
          <p className="mt-2 font-display text-[22px] font-semibold leading-[1.25] tracking-[-.02em]">
            Un restaurant imprime le QR de son menu sur chaque table. Les plats et les prix changent :
            il met à jour le lien, les QR imprimés restent les mêmes.
          </p>
        </div>
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
