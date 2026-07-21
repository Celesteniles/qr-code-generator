'use client'

import { useActionState, useState } from 'react'
import { createLinkAction } from '@/server/actions'
import type { CreateState } from '@/server/config'

type LinkType = 'static' | 'app' | 'card'

const TYPES: { value: LinkType; label: string }[] = [
  { value: 'static', label: 'Lien simple' },
  { value: 'app', label: 'Application' },
  { value: 'card', label: 'Carte de visite' },
]

const input =
  'w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'

export function CreateLinkForm() {
  const [state, action, pending] = useActionState<CreateState, FormData>(createLinkAction, null)
  const [type, setType] = useState<LinkType>('static')

  // Valeurs saisies renvoyées en cas d'erreur (le formulaire est réinitialisé par
  // React 19 après l'action ; defaultValue les restaure).
  const v = state && !state.ok ? state.values : undefined

  return (
    <form
      action={action}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3"
    >
      {/* Sélecteur de type */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 w-fit">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              type === t.value
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      {/* Raccourci (commun) */}
      <div>
        <label htmlFor="slug" className="block text-xs font-semibold text-zinc-500 mb-1">Raccourci</label>
        <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus-within:ring-1 focus-within:ring-blue-500">
          <span className="pl-3 pr-1 text-sm text-zinc-400 select-none">link.cg/</span>
          <input id="slug" name="slug" required pattern="[a-zA-Z0-9_-]+" placeholder="promo" defaultValue={v?.slug}
            className="flex-1 bg-transparent py-2 pr-3 text-sm focus:outline-none min-w-0" />
        </div>
      </div>

      {/* Champs selon le type */}
      {type === 'static' && (
        <div>
          <label htmlFor="url" className="block text-xs font-semibold text-zinc-500 mb-1">Destination</label>
          <input id="url" name="url" type="url" required placeholder="https://exemple.com" defaultValue={v?.url} className={input} />
        </div>
      )}

      {type === 'app' && (
        <div className="space-y-2">
          <div>
            <label htmlFor="ios" className="block text-xs font-semibold text-zinc-500 mb-1">iOS · App Store <span className="text-zinc-400 font-normal">(optionnel)</span></label>
            <input id="ios" name="ios" type="url" placeholder="https://apps.apple.com/app/id…" defaultValue={v?.ios} className={input} />
          </div>
          <div>
            <label htmlFor="android" className="block text-xs font-semibold text-zinc-500 mb-1">Android · Play Store <span className="text-zinc-400 font-normal">(optionnel)</span></label>
            <input id="android" name="android" type="url" placeholder="https://play.google.com/store/apps/details?id=…" defaultValue={v?.android} className={input} />
          </div>
          <div>
            <label htmlFor="fallback" className="block text-xs font-semibold text-zinc-500 mb-1">Repli · desktop / autre</label>
            <input id="fallback" name="fallback" type="url" required placeholder="https://exemple.com" defaultValue={v?.fallback} className={input} />
          </div>
        </div>
      )}

      {type === 'card' && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Profil affiché sur la page de la carte. Modifiable à tout moment sans réimprimer.</p>
          <input name="fullName" required placeholder="Nom complet" defaultValue={v?.fullName} className={input} />
          <div className="grid grid-cols-2 gap-2">
            <input name="title" placeholder="Poste" defaultValue={v?.title} className={input} />
            <input name="org" placeholder="Organisation" defaultValue={v?.org} className={input} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input name="cardPhone" type="tel" placeholder="Téléphone" defaultValue={v?.cardPhone} className={input} />
            <input name="cardEmail" type="email" placeholder="Email" defaultValue={v?.cardEmail} className={input} />
          </div>
          <input name="website" type="url" placeholder="Site web (optionnel)" defaultValue={v?.website} className={input} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending}
          className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold py-2 px-5 rounded-xl transition-colors">
          {pending ? 'Création…' : 'Créer le lien'}
        </button>
        {state?.ok && <span className="text-sm text-green-600 dark:text-green-400">Créé : link.cg/{state.slug}</span>}
        {state && !state.ok && <span className="text-sm text-red-600 dark:text-red-400">{state.message}</span>}
      </div>
    </form>
  )
}
