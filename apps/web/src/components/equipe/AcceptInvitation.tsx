'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { acceptInvitationAction, type TeamState } from '@/server/team'
import { signOut } from '@/lib/auth-client'
import { Spinner } from '@/components/kit/Spinner'

/** Bouton « Rejoindre l'espace ». L'acceptation est un POST : jamais au simple affichage du lien. */
export function AcceptInvitation({ token, workspaceName }: { token: string; workspaceName: string }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(acceptInvitationAction, null)
  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="token" value={token} />
      <button type="submit" className="btn btn-cta btn-lg w-full" disabled={pending} aria-busy={pending}>
        {pending ? <><Spinner />Un instant…</> : `Rejoindre « ${workspaceName} »`}
      </button>
      <div aria-live="polite">
        {state && !state.ok && (
          <p role="alert" className="mt-5 flex gap-2.5 rounded-[14px] bg-bad-tint px-3.5 py-3 text-[13px] font-medium text-bad">
            <ExclamationCircleIcon className="mt-px h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span>{state.message}</span>
          </p>
        )}
      </div>
    </form>
  )
}

/** Mauvais compte connecté : déconnexion, puis connexion qui revient sur l'invitation. */
export function SwitchAccountButton({ next }: { next: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function go() {
    setPending(true)
    setError(false)
    try {
      await signOut()
      router.push(`/connexion?next=${encodeURIComponent(next)}`)
      router.refresh()
    } catch {
      setPending(false)
      setError(true)
    }
  }

  return (
    <>
      <button type="button" className="btn btn-cta btn-lg mt-6 w-full" onClick={go} disabled={pending} aria-busy={pending}>
        {pending ? <><Spinner />Déconnexion…</> : 'Changer de compte'}
      </button>
      {error && <p className="tip bad anim-pop mt-4" role="alert">La déconnexion n’a pas abouti. Vérifiez votre connexion et réessayez.</p>}
    </>
  )
}
