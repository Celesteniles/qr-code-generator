'use client'

import { useId, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { LinkIcon } from '@heroicons/react/24/outline'

// Raccourcisseur de l'accueil : ne raccourcit rien lui-même. Il ouvre l'écran
// Créer en mode « lien » avec le lien pré-rempli (contrat /creer?mode=lien&url=…).

export function Shortener({ placeholder = 'Collez un long lien pour le raccourcir…', className = '' }: {
  placeholder?: string
  className?: string
}) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [empty, setEmpty] = useState(false)
  const id = useId()

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const url = input.current?.value.trim() ?? ''
    if (!url) {
      setEmpty(true)
      input.current?.focus()
      return
    }
    router.push(`/creer?mode=lien&url=${encodeURIComponent(url)}`)
  }

  return (
    <div className={className}>
      <form className="shortener" onSubmit={submit} role="search" aria-label="Raccourcir un lien">
        <LinkIcon className="h-5 w-5 shrink-0 text-muted max-[560px]:hidden" aria-hidden="true" />
        <label htmlFor={id} className="sr-only">Lien à raccourcir</label>
        <input
          ref={input}
          id={id}
          name="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          placeholder={placeholder}
          aria-invalid={empty || undefined}
          aria-describedby={empty ? `${id}-err` : undefined}
          onChange={() => empty && setEmpty(false)}
        />
        <button className="btn btn-cta" type="submit">Raccourcir</button>
      </form>
      {empty && (
        <p id={`${id}-err`} className="help" role="alert">Collez d&apos;abord le lien que vous voulez raccourcir.</p>
      )}
    </div>
  )
}
