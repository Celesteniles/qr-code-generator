'use client'

import { useActionState, useState } from 'react'
import { EnvelopeIcon } from '@heroicons/react/24/outline'
import { updateNameAction, type AccountState } from '@/server/account'
import { Spinner } from '@/components/kit/Spinner'
import { ResultTip } from './SectionHead'

const CONTACT = 'contact@nscreative.cg'

/** « Vos informations » : nom modifiable, email affiché. */
export function ProfileForm({ name: initialName, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(updateNameAction, null)
  // Champ contrôlé : la saisie survit à la réinitialisation du formulaire par React 19.
  const [name, setName] = useState(initialName)
  const [dirty, setDirty] = useState(false)
  const showResult = state && !dirty && !pending

  return (
    <div className="grid gap-5">
      <form action={(fd) => { setDirty(false); return action(fd) }}>
        <label className="label" htmlFor="acc-name">Votre nom ou celui de votre activité</label>
        <div className="flex flex-wrap items-stretch gap-2.5">
          <input
            id="acc-name" name="name" className="input min-w-[220px] flex-1" required maxLength={80}
            autoComplete="name" placeholder="Ex. : Restaurant Mami Wata"
            value={name} onChange={(e) => { setName(e.target.value); setDirty(true) }}
          />
          <button type="submit" className="btn btn-cta h-[52px]" disabled={pending || !name.trim()} aria-busy={pending}>
            {pending ? <><Spinner />Enregistrement…</> : 'Enregistrer'}
          </button>
        </div>
        <p className="help">C&apos;est ce nom qui apparaît dans votre espace.</p>
        <div aria-live="polite">
          {showResult && state.ok && <ResultTip ok title="Nom enregistré">Votre espace affiche maintenant « {name.trim()} ».</ResultTip>}
          {showResult && !state.ok && <ResultTip ok={false} title="Le nom n'a pas changé">{state.message}</ResultTip>}
        </div>
      </form>

      <div>
        <span className="label" id="acc-email-label">Adresse email</span>
        <div className="zone flex items-center gap-3 px-4 py-3.5">
          <EnvelopeIcon className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
          <span className="min-w-0 break-all font-medium">{email}</span>
        </div>
        <p className="help"><span>
          Elle sert à vous connecter. Pour en changer, écrivez-nous depuis cette adresse à{' '}
          <a className="font-semibold text-ink underline underline-offset-2" href={`mailto:${CONTACT}?subject=${encodeURIComponent('Changer mon adresse email link.cg')}`}>{CONTACT}</a>.
        </span></p>
      </div>
    </div>
  )
}
