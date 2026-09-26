'use client'

import { useActionState, useState } from 'react'
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { updateLinkDestinationAction } from '@/server/actions'
import type { UpdateDestinationState } from '@/server/config'
import { Spinner } from '@/components/kit/Spinner'

export type DestinationValues =
  | { type: 'static'; url: string }
  | { type: 'app'; fallback: string; ios?: string; android?: string }

/** « Où mène ce lien ? » : lien simple, ou destination selon le téléphone. */
export function DestinationForm({ linkId, initial }: { linkId: string; initial: DestinationValues }) {
  const [state, action, pending] = useActionState<UpdateDestinationState, FormData>(updateLinkDestinationAction, null)
  const [mode, setMode] = useState<'static' | 'app'>(initial.type)
  // Champs contrôlés : la saisie survit à la réinitialisation du formulaire par React 19.
  const [url, setUrl] = useState(initial.type === 'static' ? initial.url : initial.fallback)
  const [ios, setIos] = useState(initial.type === 'app' ? initial.ios ?? '' : '')
  const [android, setAndroid] = useState(initial.type === 'app' ? initial.android ?? '' : '')
  const [dirty, setDirty] = useState(false)
  const edit = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => { setter(e.target.value); setDirty(true) }

  const showResult = state && !dirty && !pending

  return (
    <form action={(fd) => { setDirty(false); return action(fd) }}>
      <input type="hidden" name="id" value={linkId} />
      <input type="hidden" name="type" value={mode} />

      <div className="seg mb-4" role="group" aria-label="Type de destination">
        <button type="button" aria-pressed={mode === 'static'} onClick={() => { setMode('static'); setDirty(true) }}>Un seul lien</button>
        <button type="button" aria-pressed={mode === 'app'} onClick={() => { setMode('app'); setDirty(true) }}>Selon le téléphone</button>
      </div>

      {mode === 'static' ? (
        <div className="flex flex-wrap items-stretch gap-2.5">
          <label className="sr-only" htmlFor="dest-url">Adresse de destination</label>
          <input
            id="dest-url" name="url" type="url" required inputMode="url" autoComplete="url"
            className="input min-w-[220px] flex-1" placeholder="https://…" value={url} onChange={edit(setUrl)}
          />
          <button type="submit" className="btn btn-cta h-[52px]" disabled={pending} aria-busy={pending}>{pending ? <><Spinner />Mise à jour…</> : 'Mettre à jour'}</button>
        </div>
      ) : (
        <div className="grid gap-4">
          <div>
            <label className="label" htmlFor="dest-ios">Sur iPhone <span className="opt">(facultatif)</span></label>
            <input id="dest-ios" name="ios" type="url" inputMode="url" className="input" placeholder="https://apps.apple.com/…" value={ios} onChange={edit(setIos)} />
          </div>
          <div>
            <label className="label" htmlFor="dest-android">Sur Android <span className="opt">(facultatif)</span></label>
            <input id="dest-android" name="android" type="url" inputMode="url" className="input" placeholder="https://play.google.com/…" value={android} onChange={edit(setAndroid)} />
          </div>
          <div>
            <label className="label" htmlFor="dest-fallback">Pour tous les autres</label>
            <input id="dest-fallback" name="fallback" type="url" required inputMode="url" className="input" placeholder="https://…" value={url} onChange={edit(setUrl)} />
            <p className="help">Ordinateurs et téléphones non reconnus ouvrent cette adresse.</p>
          </div>
          <div>
            <button type="submit" className="btn btn-cta" disabled={pending} aria-busy={pending}>{pending ? <><Spinner />Mise à jour…</> : 'Mettre à jour'}</button>
          </div>
        </div>
      )}

      <div aria-live="polite">
        {showResult && state.ok && (
          <div className="tip mint anim-pop mt-4">
            <span className="tip-ico"><CheckIcon aria-hidden="true" /></span>
            <div><strong>Destination mise à jour</strong>Le lien partagé et le QR imprimé mènent maintenant à la nouvelle adresse.</div>
          </div>
        )}
        {showResult && !state.ok && (
          <div className="tip bad anim-pop mt-4" role="alert">
            <span className="tip-ico"><ExclamationTriangleIcon aria-hidden="true" /></span>
            <div><strong>La destination n&apos;a pas changé</strong>{state.message}</div>
          </div>
        )}
      </div>
    </form>
  )
}
