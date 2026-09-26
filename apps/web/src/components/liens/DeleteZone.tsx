'use client'

import { useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { TrashIcon } from '@heroicons/react/24/outline'
import { Spinner } from '@/components/kit/Spinner'

/**
 * « Supprimer ce lien » (ou cette carte), isolé et en deux temps. `action` est une
 * action serveur qui supprime puis renvoie vers la liste.
 */
export function DeleteZone({ linkId, action, noun = 'lien' }: {
  linkId: string
  action: (formData: FormData) => Promise<void>
  noun?: 'lien' | 'carte'
}) {
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (!confirm) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setConfirm(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [confirm])

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="min-w-[240px] grow">
        <h2 className="h3">{noun === 'carte' ? 'Supprimer cette carte' : 'Supprimer ce lien'}</h2>
        <p className="mt-1 text-sm text-muted">
          {noun === 'carte'
            ? 'Vos informations sont effacées, le lien et les QR imprimés ne mèneront plus nulle part, et l’adresse sera libérée. Préférez la pause si vous hésitez.'
            : 'Le lien partagé et les QR imprimés ne mèneront plus nulle part, et l’adresse sera libérée. Préférez la pause si vous hésitez.'}
        </p>
      </div>
      {confirm ? (
        <form action={action} className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmer la suppression">
          <input type="hidden" name="id" value={linkId} />
          <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>Annuler</button>
          <ConfirmButton />
        </form>
      ) : (
        <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
          <TrashIcon aria-hidden="true" />Supprimer
        </button>
      )}
    </div>
  )
}

function ConfirmButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn-danger bg-bad-tint" disabled={pending} aria-busy={pending} autoFocus>
      {pending ? <><Spinner />Suppression…</> : <><TrashIcon aria-hidden="true" />Oui, supprimer définitivement</>}
    </button>
  )
}
