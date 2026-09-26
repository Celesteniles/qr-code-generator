'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

// Widget Cloudflare Turnstile (anti-robots), rendu seulement si une clé publique
// est fournie (cf. server/turnstile.ts). Script officiel chargé une fois, en rendu
// explicite : le widget vit dans le formulaire et survit au changement d'onglet.

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string
  reset(id: string): void
  remove(id: string): void
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

let loading: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')))
    s.onerror = () => { loading = null; s.remove(); reject(new Error('turnstile')) }
    document.head.appendChild(s)
  })
  return loading
}

export interface TurnstileHandle {
  /** Un jeton ne sert qu'une fois : à rappeler après chaque envoi. */
  reset(): void
}

export const Turnstile = forwardRef<TurnstileHandle, {
  siteKey: string
  /** Jeton valide, ou null (expiré, en erreur, pas encore prêt). */
  onToken: (token: string | null) => void
  /** Le script n'a pas pu se charger (réseau, bloqueur). */
  onUnavailable?: () => void
}>(function Turnstile({ siteKey, onToken, onUnavailable }, ref) {
  const box = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  // Rappels à jour sans re-rendre le widget à chaque rendu du parent.
  const cb = useRef({ onToken, onUnavailable })
  useEffect(() => { cb.current = { onToken, onUnavailable } })

  useImperativeHandle(ref, () => ({
    reset() {
      cb.current.onToken(null)
      if (widgetId.current) window.turnstile?.reset(widgetId.current)
    },
  }), [])

  useEffect(() => {
    let cancelled = false
    loadTurnstile().then((ts) => {
      if (cancelled || !box.current) return
      widgetId.current = ts.render(box.current, {
        sitekey: siteKey,
        language: 'fr',
        theme: 'auto',
        size: 'flexible',
        callback: (token: string) => cb.current.onToken(token),
        'expired-callback': () => cb.current.onToken(null),
        'error-callback': () => cb.current.onToken(null),
      })
    }).catch(() => { if (!cancelled) cb.current.onUnavailable?.() })
    return () => {
      cancelled = true
      if (widgetId.current) window.turnstile?.remove(widgetId.current)
      widgetId.current = null
    }
  }, [siteKey])

  // Hauteur réservée : le formulaire ne saute pas quand le widget apparaît.
  return <div ref={box} className="min-h-[65px]" />
})
