'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { readLocalQrs, removeLocalQr, type LocalQr } from '@/lib/local-qr'

// QR fixes gardés dans ce navigateur (lib/local-qr), exposés comme un petit store
// externe : relu à chaque changement, y compris depuis un autre onglet.

const EVENT = 'linkcg:local-qr'

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(EVENT, onChange)
  }
}

// Instantané sous forme de chaîne : stable d'un rendu à l'autre tant que rien ne change.
const snapshot = () => JSON.stringify(readLocalQrs())
const serverSnapshot = () => null

/** null tant que le navigateur n'a pas été lu (rendu serveur, hydratation). */
export function useLocalQrs(): LocalQr[] | null {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  return useMemo(() => (raw === null ? null : (JSON.parse(raw) as LocalQr[])), [raw])
}

export function forgetLocalQr(id: string) {
  removeLocalQr(id)
  window.dispatchEvent(new Event(EVENT))
}
