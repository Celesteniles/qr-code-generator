'use client'

import { useId, useOptimistic, useTransition } from 'react'
import { toggleLinkAction } from '@/server/actions'

/** « Lien en ligne » : met le lien (et son QR) en pause ou le réactive. */
export function ActiveSwitch({ linkId, active }: { linkId: string; active: boolean }) {
  const [pending, startTransition] = useTransition()
  const [on, setOn] = useOptimistic(active)
  const titleId = useId()
  const descId = useId()

  function toggle() {
    const next = !on
    startTransition(async () => {
      setOn(next)
      const fd = new FormData()
      fd.set('id', linkId)
      fd.set('active', String(next))
      await toggleLinkAction(fd)
    })
  }

  return (
    <div className="flex items-start gap-4">
      <div className="grow">
        <h2 id={titleId} className="h3">{on ? 'Lien en ligne' : 'Lien en pause'}</h2>
        <p id={descId} className="mt-1 text-sm text-muted">
          En pause, le lien et son QR affichent une page neutre « Ce lien n&apos;est plus actif » au lieu d&apos;une erreur.
          Vous pouvez le réactiver quand vous voulez.
        </p>
      </div>
      <button
        type="button"
        className="switch mt-1"
        role="switch"
        aria-checked={on}
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-busy={pending}
        onClick={toggle}
        disabled={pending}
      />
    </div>
  )
}
