'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import { signOut } from '@/lib/auth-client'
import { Spinner } from '../Spinner'

// Déconnexion avec confirmation : un clic de trop ne doit pas faire perdre la
// session. <dialog> natif (calque supérieur, focus piégé, Échap = annuler).

const CLOSE_MS = 180

export function SignOutButton({ withLabel = false }: { withLabel?: boolean }) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const [closing, setClosing] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  function open() {
    setError(false)
    dialog.current?.showModal()
  }

  function cancel() {
    if (pending) return
    setClosing(true)
    setTimeout(() => { dialog.current?.close(); setClosing(false) }, CLOSE_MS)
  }

  async function confirm() {
    setPending(true)
    setError(false)
    try {
      await signOut()
      router.push('/')
      router.refresh()
    } catch {
      setPending(false)
      setError(true)
    }
  }

  return (
    <>
      {withLabel ? (
        <button type="button" onClick={open} className="btn btn-ghost btn-sm w-full justify-start">
          <ArrowRightStartOnRectangleIcon />Se déconnecter
        </button>
      ) : (
        <button type="button" onClick={open} className="icon-btn" aria-label="Se déconnecter">
          <ArrowRightStartOnRectangleIcon />
        </button>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="signout-title"
        aria-describedby="signout-desc"
        data-closing={closing}
        onCancel={(e) => { e.preventDefault(); cancel() }}
        onClick={(e) => { if (e.target === e.currentTarget) cancel() }}
        className="anim-pop m-auto w-[min(400px,calc(100%-24px))] rounded-[26px] bg-surface p-6 text-ink shadow-[0_0_0_1px_var(--line),var(--shadow-lg)] transition-[opacity,transform] duration-200 backdrop:bg-[rgba(12,12,16,.45)] backdrop:animate-[fade_.25s_ease-out] data-[closing=true]:scale-95 data-[closing=true]:opacity-0 max-sm:mb-3 max-sm:mt-auto"
      >
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-soft text-ink shadow-[inset_0_0_0_1px_var(--line)]" aria-hidden="true">
          <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
        </span>
        <h2 id="signout-title" className="h2 mt-4">Se déconnecter ?</h2>
        <p id="signout-desc" className="mt-2 text-[15px] text-muted">
          Vous quitterez votre espace sur cet appareil. Vos liens et vos QR imprimés continuent de fonctionner.
        </p>
        {error && (
          <p className="tip bad anim-pop mt-4" role="alert">La déconnexion n&apos;a pas abouti. Vérifiez votre connexion et réessayez.</p>
        )}
        <div className="mt-6 flex flex-wrap-reverse gap-2 sm:flex-nowrap">
          <button type="button" className="btn btn-ghost grow" onClick={cancel} disabled={pending} autoFocus>Annuler</button>
          <button type="button" className="btn btn-cta grow" onClick={confirm} disabled={pending} aria-busy={pending}>
            {pending ? <><Spinner />Déconnexion…</> : 'Se déconnecter'}
          </button>
        </div>
      </dialog>
    </>
  )
}
