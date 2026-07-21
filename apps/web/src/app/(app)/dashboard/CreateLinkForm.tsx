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
  'w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] py-2.5 px-3.5 text-sm focus-brand'

export function CreateLinkForm() {
  const [state, action, pending] = useActionState<CreateState, FormData>(createLinkAction, null)
  const [type, setType] = useState<LinkType>('static')

  // Valeurs saisies renvoyées en cas d'erreur (le formulaire est réinitialisé par
  // React 19 après l'action ; defaultValue les restaure).
  const v = state && !state.ok ? state.values : undefined

  return (
    <form action={action} className="card-soft p-5 space-y-3">
      {/* Sélecteur de type */}
      <div className="flex gap-1 bg-black/5 dark:bg-white/10 rounded-full p-1 w-fit">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              type === t.value
                ? 'bg-brand text-white'
                : 'text-[color:var(--muted)] hover:text-brand'
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
        <div className="flex items-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] focus-within:shadow-[0_0_0_3px_rgba(0,96,255,.25)]">
          <span className="pl-3.5 pr-1 text-sm text-[color:var(--muted)] select-none">link.cg/</span>
          <input id="slug" name="slug" required pattern="[a-zA-Z0-9_-]+" placeholder="promo" defaultValue={v?.slug}
            className="flex-1 bg-transparent py-2.5 pr-3 text-sm focus:outline-none min-w-0" />
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
        <button type="submit" disabled={pending} className="btn-grad py-2.5 px-6 text-sm">
          {pending ? 'Création…' : '✨ Créer le lien'}
        </button>
        {state?.ok && <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Créé : link.cg/{state.slug}</span>}
        {state && !state.ok && <span className="text-sm text-red-500">{state.message}</span>}
      </div>
    </form>
  )
}
