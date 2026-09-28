'use client'

import { useActionState, useState } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { inviteMemberAction, type TeamState } from '@/server/team'
import { Spinner } from '@/components/kit/Spinner'
import { ResultTip } from '@/components/compte/SectionHead'

/** « Inviter une personne » : adresse e-mail + rôle. */
export function InviteForm({ validityDays }: { validityDays: number }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(inviteMemberAction, null)
  // Champs contrôlés : la saisie survit à la réinitialisation du formulaire par React 19.
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [dirty, setDirty] = useState(false)
  const showResult = state && !dirty && !pending

  // Invitation partie : champ vidé, prêt pour la suivante (ajusté au rendu, sans effet).
  const [seen, setSeen] = useState(state)
  if (state !== seen) {
    setSeen(state)
    if (state?.ok) { setEmail(''); setRole('member') }
  }

  return (
    <form action={(fd) => { setDirty(false); return action(fd) }}>
      <label className="label" htmlFor="team-email">Adresse e-mail de la personne</label>
      <input
        id="team-email" name="email" type="email" className="input w-full" required maxLength={254}
        autoComplete="off" inputMode="email" placeholder="Ex. : collegue@entreprise.cg"
        value={email} onChange={(e) => { setEmail(e.target.value); setDirty(true) }}
      />

      <fieldset className="mt-4">
        <legend className="label">Son rôle</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            ['member', 'Membre', 'Crée et modifie les liens, voit les statistiques.'],
            ['admin', 'Administrateur', 'Comme un membre, et gère aussi l’équipe et la facturation.'],
          ] as const).map(([value, label, help]) => (
            <label key={value}
              className="zone flex cursor-pointer items-start gap-3 px-4 py-3 has-[:checked]:bg-brand-tint/60 has-[:checked]:shadow-[inset_0_0_0_1.5px_var(--brand)]">
              <input type="radio" name="role" value={value} className="mt-1 accent-[var(--brand)]"
                checked={role === value} onChange={() => { setRole(value); setDirty(true) }} />
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-[13px] text-muted">{help}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" className="btn btn-cta mt-5" disabled={pending || !email.trim()} aria-busy={pending}>
        {pending ? <><Spinner />Envoi…</> : <><PaperAirplaneIcon aria-hidden="true" />Envoyer l’invitation</>}
      </button>
      <p className="help">
        La personne reçoit un lien valable {validityDays} jours. Elle devra se connecter, ou créer son compte, avec cette adresse.
      </p>

      <div aria-live="polite">
        {showResult && state.ok && <ResultTip ok title="Invitation envoyée">{state.message}</ResultTip>}
        {showResult && !state.ok && <ResultTip ok={false} title="Pas d’invitation envoyée">{state.message}</ResultTip>}
      </div>
    </form>
  )
}
