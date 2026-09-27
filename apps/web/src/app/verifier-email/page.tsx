import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { Logo } from '@/components/kit/Logo'
import { MadeBy } from '@/components/kit/MadeBy'
import { VerifyEmailPanel } from '@/components/auth/VerifyEmailPanel'
import { safeNext } from '@/components/auth/safe-next'
import { verifyEmailPath } from '@/components/auth/verify-path'
import { getSessionState } from '@/server/session'

// « Vérifiez votre adresse e-mail » : passage obligé d'un compte non vérifié
// (cf. server/viewer.ts). Sert aussi de retour au lien reçu par e-mail : Better
// Auth y renvoie après /verify-email, avec ?error=… si le lien n'est plus bon.
// Une fois l'adresse vérifiée, on repart vers `next` (par défaut la visite guidée).

export const metadata: Metadata = {
  title: 'Vérifiez votre adresse e-mail · link.cg',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

/** Code d'erreur Better Auth → phrase utile. */
function linkProblem(code: string | undefined): string | null {
  if (!code) return null
  if (code === 'TOKEN_EXPIRED') return 'Ce lien de confirmation a expiré. Demandez-en un nouveau ci-dessous.'
  if (code === 'USER_NOT_FOUND') return 'Ce lien ne correspond à aucun compte. Il a peut-être été supprimé.'
  if (code === 'INVALID_USER') return 'Ce lien concerne un autre compte que celui connecté ici. Déconnectez-vous, puis rouvrez le lien.'
  return 'Ce lien de confirmation n\'est pas valide. Il a peut-être été coupé en deux par votre messagerie : demandez-en un nouveau.'
}

export default async function VerifierEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>
}) {
  const sp = await searchParams
  const rawNext = safeNext(sp.next)
  // Après confirmation : la visite guidée, sauf destination précise demandée
  // (jamais cette page elle-même, qui bouclerait).
  const next = rawNext === '/' || rawNext.startsWith('/verifier-email') ? '/bienvenue' : rawNext
  const problem = linkProblem(Array.isArray(sp.error) ? sp.error[0] : sp.error)
  const state = await getSessionState()

  if (state.kind === 'ready') redirect(next)
  if (state.kind === 'guest' && !problem) {
    redirect(`/connexion?next=${encodeURIComponent(verifyEmailPath(next))}`)
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 sm:px-5">
      <div className="w-full max-w-[440px]">
        <div className="mb-8"><Logo /></div>
        {state.kind === 'unverified' ? (
          <VerifyEmailPanel email={state.email} next={next} problem={problem} />
        ) : (
          // Lien ouvert sans être connecté (autre appareil, navigateur de la messagerie)
          <section>
            <h1 className="h1">Lien de confirmation</h1>
            <p role="alert" className="mt-5 flex gap-2.5 rounded-[14px] bg-bad-tint px-3.5 py-3 text-[13px] font-medium text-bad">
              <ExclamationCircleIcon className="mt-px h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span>{problem}</span>
            </p>
            <p className="lead mt-5">Connectez-vous : vous pourrez recevoir un nouveau lien.</p>
            <Link href={`/connexion?next=${encodeURIComponent(verifyEmailPath(next))}`}
              className="btn btn-cta btn-lg mt-6 w-full">Se connecter</Link>
          </section>
        )}
        <MadeBy className="mt-8" />
      </div>
    </main>
  )
}
