import { Logo } from '@/components/kit/Logo'
import { UseCases } from './UseCases'

/**
 * Présentation des écrans d'accès hors coquille (mot de passe oublié,
 * réinitialisation) : la même que /connexion — vitrine à gauche sur grand écran,
 * formulaire à droite.
 */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen gap-3 p-3 lg:grid-cols-2">
      <aside className="relative hidden flex-col overflow-hidden rounded-[30px] bg-sky p-8 lg:sticky lg:top-3 lg:flex lg:h-[calc(100vh-24px)] xl:p-10">
        <UseCases />
      </aside>

      <main className="grid place-items-center px-2 py-8 sm:px-5">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden"><Logo /></div>
          {children}
        </div>
      </main>
    </div>
  )
}
