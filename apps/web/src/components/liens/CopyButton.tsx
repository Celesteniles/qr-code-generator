'use client'

import { useEffect, useState } from 'react'
import { CheckIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'

/** Bouton icône « Copier le lien », avec confirmation visible et annoncée. */
export function CopyButton({ text, label = 'Copier le lien', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(t)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : rien à faire de plus.
    }
  }

  return (
    <button type="button" className={`icon-btn relative z-10 ${className}`} onClick={copy} aria-label={copied ? 'Lien copié' : label} title={copied ? 'Copié' : label}>
      {copied ? <CheckIcon className="anim-pop text-ok" /> : <DocumentDuplicateIcon />}
      <span className="sr-only" aria-live="polite">{copied ? 'Lien copié' : ''}</span>
    </button>
  )
}
