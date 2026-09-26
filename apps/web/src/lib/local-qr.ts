// Historique des QR fixes créés sans compte, gardé dans ce navigateur.
// Commodité pour le visiteur uniquement : jamais une source de vérité, et la page
// doit s'afficher correctement si le stockage est vide ou indisponible.

import type { QrDesign } from './qr-design'

export interface LocalQr {
  id: string
  /** Nom lisible (« nscreative.cg/promo », « Wi-Fi NS-Studio »). */
  label: string
  /** Type de contenu : url, wifi, vcard, whatsapp… */
  kind: string
  /** Contenu encodé dans le QR. */
  data: string
  design: QrDesign
  createdAt: number
}

const KEY = 'linkcg.local-qr.v1'
const MAX = 30

export function readLocalQrs(): LocalQr[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as LocalQr[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

/** Ajoute (ou remplace, même contenu) un QR en tête de liste. */
export function saveLocalQr(qr: Omit<LocalQr, 'id' | 'createdAt'>): LocalQr | null {
  const entry: LocalQr = { ...qr, id: crypto.randomUUID(), createdAt: Date.now() }
  try {
    const list = readLocalQrs().filter((q) => q.data !== qr.data)
    localStorage.setItem(KEY, JSON.stringify([entry, ...list].slice(0, MAX)))
    return entry
  } catch {
    return null
  }
}

export function removeLocalQr(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(readLocalQrs().filter((q) => q.id !== id)))
  } catch {
    // stockage indisponible : rien à faire
  }
}
