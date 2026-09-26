'use client'

import { useId, useState, useTransition, type ReactNode } from 'react'
import { CheckIcon, ExclamationCircleIcon, EyeIcon } from '@heroicons/react/24/outline'
import { updateCardAction } from '@/server/actions'
import { CardView } from './CardView'
import { cardInitials, THEMES, type CardFields } from './card-model'

type Status = { kind: 'idle' } | { kind: 'saved' } | { kind: 'error'; message: string }

// Éditeur de carte : sections-questions à gauche, aperçu téléphone en direct à
// droite (le même composant que la page publique).
export function CardEditor({ linkId, slug, initial, aside }: {
  linkId: string
  slug: string
  initial: CardFields
  /** Contenu sous l'aperçu (QR de la carte). */
  aside?: ReactNode
}) {
  const [fields, setFields] = useState<CardFields>(initial)
  const [saved, setSaved] = useState(() => JSON.stringify(initial))
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [pending, startTransition] = useTransition()
  const id = useId()
  const dirty = JSON.stringify(fields) !== saved

  function set<K extends keyof CardFields>(key: K, value: CardFields[K]) {
    setFields((f) => ({ ...f, [key]: value }))
    if (status.kind !== 'idle') setStatus({ kind: 'idle' })
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const snapshot = fields
    const data = new FormData()
    data.set('linkId', linkId)
    data.set('slug', slug)
    data.set('fullName', snapshot.fullName)
    data.set('title', snapshot.title)
    data.set('org', snapshot.org)
    data.set('cardPhone', snapshot.phone)
    data.set('whatsapp', snapshot.whatsapp)
    data.set('cardEmail', snapshot.email)
    data.set('website', snapshot.website)
    // Toujours envoyé : le profil est remplacé en entier à l'enregistrement.
    data.set('theme', snapshot.theme)
    startTransition(async () => {
      try {
        const res = await updateCardAction(data)
        if (res.ok) {
          setSaved(JSON.stringify(snapshot))
          setStatus({ kind: 'saved' })
        } else {
          setStatus({ kind: 'error', message: res.message ?? 'L\'enregistrement n\'a pas abouti. Réessayez dans un instant.' })
        }
      } catch {
        setStatus({ kind: 'error', message: 'Connexion impossible. Vérifiez votre réseau, puis réessayez : vos changements sont toujours là.' })
      }
    })
  }

  const f = (name: string) => `${id}-${name}`

  return (
    <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_380px]">
      <form onSubmit={onSubmit}>
        <h1 className="h1">Votre carte de visite</h1>
        <p className="lead mt-2 max-w-[62ch]">
          Un lien pour votre bio et votre signature, un QR pour vos flyers et votre badge : on vous appelle, on vous écrit,
          on vous enregistre. Modifiable à tout moment, sans réimprimer.
        </p>

        <section className="card mt-6 p-[22px] sm:p-[26px]" aria-labelledby={f('qui')}>
          <h2 id={f('qui')} className="h3">Qui êtes-vous ?</h2>
          <div className="mt-4 flex items-center gap-4">
            <span className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-[24px] bg-coral font-display text-[26px] font-bold text-white" aria-hidden="true">
              {cardInitials(fields.fullName) || '•'}
            </span>
            <p className="help mt-0">Vos initiales s&apos;affichent en haut de la carte, à partir de votre nom.</p>
          </div>
          <div className="mt-6">
            <label className="label" htmlFor={f('name')}>Nom complet</label>
            <input id={f('name')} className="input" required autoComplete="name" value={fields.fullName}
              onChange={(e) => set('fullName', e.target.value)} placeholder="Prénom et nom" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor={f('title')}>Fonction <span className="opt">· optionnel</span></label>
                <input id={f('title')} className="input" autoComplete="organization-title" value={fields.title}
                  onChange={(e) => set('title', e.target.value)} placeholder="Ex. : Gérante" />
              </div>
              <div>
                <label className="label" htmlFor={f('org')}>Entreprise <span className="opt">· optionnel</span></label>
                <input id={f('org')} className="input" autoComplete="organization" value={fields.org}
                  onChange={(e) => set('org', e.target.value)} placeholder="Ex. : Boutique Mbote" />
              </div>
            </div>
          </div>
        </section>

        <section className="card mt-4 p-[22px] sm:p-[26px]" aria-labelledby={f('joindre')}>
          <h2 id={f('joindre')} className="h3">Comment vous joindre ?</h2>
          <p className="mt-1 text-sm text-muted">Chaque info remplie devient un bouton sur la carte.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={f('phone')}>Téléphone</label>
              <input id={f('phone')} className="input" type="tel" inputMode="tel" autoComplete="tel" value={fields.phone}
                onChange={(e) => set('phone', e.target.value)} placeholder="06 123 45 67" />
            </div>
            <div>
              <label className="label" htmlFor={f('wa')}>WhatsApp <span className="opt">· optionnel</span></label>
              <input id={f('wa')} className="input" type="tel" inputMode="tel" value={fields.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)} placeholder="06 123 45 67" aria-describedby={f('wa-help')} />
              <p id={f('wa-help')} className="help">
                {fields.phone.trim() && !fields.whatsapp.trim() ? (
                  <button type="button" className="link text-[13px]" onClick={() => set('whatsapp', fields.phone)}>
                    Même numéro que le téléphone
                  </button>
                ) : 'Ajoute un bouton WhatsApp sur la carte.'}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <label className="label" htmlFor={f('email')}>Email</label>
            <input id={f('email')} className="input" type="email" autoComplete="email" value={fields.email}
              onChange={(e) => set('email', e.target.value)} placeholder="vous@exemple.cg" />
          </div>
          <div className="mt-4">
            <label className="label" htmlFor={f('web')}>Site web <span className="opt">· optionnel</span></label>
            <input id={f('web')} className="input" type="text" inputMode="url" autoComplete="url" value={fields.website}
              onChange={(e) => set('website', e.target.value)} placeholder="votresite.cg" />
          </div>
        </section>

        <section className="card mt-4 p-[22px] sm:p-[26px]" aria-labelledby={f('couleur')}>
          <h2 id={f('couleur')} className="h3">Votre couleur</h2>
          <p className="mt-1 text-sm text-muted">Elle habille le haut de votre carte.</p>
          <div className="mt-4 flex flex-wrap gap-3" role="group" aria-labelledby={f('couleur')}>
            {THEMES.map((t) => (
              <button key={t.value} type="button" className="swatch" style={{ background: t.value }}
                aria-pressed={fields.theme === t.value} aria-label={t.label} title={t.label}
                onClick={() => set('theme', t.value)} />
            ))}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="submit" className="btn btn-cta btn-lg" disabled={pending}>
            {pending ? 'Enregistrement…' : 'Enregistrer les changements'}
          </button>
          <p className="text-sm" aria-live="polite" role="status">
            {status.kind === 'saved' ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-ok">
                <CheckIcon className="h-4 w-4" aria-hidden="true" />C&apos;est enregistré. Vos contacts voient la nouvelle version immédiatement.
              </span>
            ) : status.kind === 'error' ? (
              <span className="inline-flex items-start gap-1.5 font-semibold text-bad">
                <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{status.message}
              </span>
            ) : dirty ? (
              <span className="text-muted">Changements pas encore enregistrés.</span>
            ) : (
              <span className="text-muted">Vos contacts voient la nouvelle version dès l&apos;enregistrement.</span>
            )}
          </p>
        </div>
      </form>

      <aside className="xl:sticky xl:top-6" aria-label="Aperçu de votre carte">
        <p className="eyebrow flex justify-center"><EyeIcon className="h-4 w-4" aria-hidden="true" />Ce que voient vos contacts</p>
        <div className="mx-auto mt-3 w-[340px] max-w-full rounded-[46px] bg-[#16161d] p-3 shadow-[var(--shadow-lg)]">
          <div className="min-h-[600px] overflow-hidden rounded-[36px] bg-[#f6f3ee]">
            <CardView fields={fields} interactive={false} />
          </div>
        </div>
        {aside}
      </aside>
    </div>
  )
}
