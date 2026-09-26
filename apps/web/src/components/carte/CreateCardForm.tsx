'use client'

import { useActionState, useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { createLinkAction } from '@/server/actions'
import type { CreateState } from '@/server/config'

/** « Céleste Gakono » → « celeste-gakono » (adresse courte proposée). */
function toSlug(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

// Création d'une carte : l'adresse courte et le nom suffisent, le reste se
// remplit dans l'éditeur (où l'on arrive juste après).
export function CreateCardForm({ first }: { first: boolean }) {
  const router = useRouter()
  const [state, action, pending] = useActionState<CreateState, FormData>(createLinkAction, null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const id = useId()

  useEffect(() => {
    if (state?.ok) router.push(`/carte/${state.slug}`)
  }, [state, router])

  const shownSlug = slugTouched ? slug : toSlug(name)

  return (
    <form action={action} className="card p-[22px] sm:p-[26px]" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="h3">{first ? 'Créez votre carte' : 'Nouvelle carte'}</h2>
      <p className="mt-1 text-sm text-muted">Votre nom et l&apos;adresse de la carte suffisent : vous compléterez le reste juste après.</p>
      <input type="hidden" name="type" value="card" />

      <div className="mt-5">
        <label className="label" htmlFor={`${id}-name`}>Nom complet</label>
        <input id={`${id}-name`} name="fullName" className="input" required autoComplete="name"
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom et nom" />
      </div>

      <div className="mt-4">
        <label className="label" htmlFor={`${id}-slug`}>Adresse de votre carte</label>
        <div className="input-affix">
          <span className="pre" aria-hidden="true">link.cg/</span>
          <input id={`${id}-slug`} name="slug" required pattern="[a-zA-Z0-9_\-]+" maxLength={60}
            value={shownSlug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value) }}
            placeholder="votre-nom" aria-describedby={`${id}-slug-help`} autoCapitalize="none" spellCheck={false} />
        </div>
        <p id={`${id}-slug-help`} className="help">Lettres, chiffres et tirets. C&apos;est l&apos;adresse que vos contacts verront : link.cg/{shownSlug || 'votre-nom'}.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-cta" disabled={pending || !!state?.ok}>
          {pending || state?.ok ? 'Création…' : <>Créer ma carte <ArrowRightIcon /></>}
        </button>
        <p aria-live="polite" role="status" className="text-sm">
          {state && !state.ok && (
            <span className="inline-flex items-start gap-1.5 font-semibold text-bad">
              <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{state.message}
            </span>
          )}
        </p>
      </div>
    </form>
  )
}
