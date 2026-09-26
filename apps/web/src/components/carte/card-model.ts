// Modèle d'affichage d'une carte de visite, partagé par l'éditeur (aperçu en
// direct) et la page publique /c/[slug] : les deux affichent exactement la même
// chose à partir des mêmes champs.

import type { CardProfile } from '@link/db'

/** Champs d'une carte tels que saisis dans l'éditeur. */
export interface CardFields {
  fullName: string
  title: string
  org: string
  phone: string
  /** Numéro WhatsApp (chiffres, avec ou sans +). Vide = pas de bouton WhatsApp. */
  whatsapp: string
  email: string
  website: string
  /** Couleur du bandeau, #rrggbb. */
  theme: string
}

/** Bleu NS : couleur par défaut du bandeau. */
export const DEFAULT_THEME = '#0060ff'

/**
 * Palette proposée. Teintes assez foncées pour que le texte blanc du bandeau
 * reste lisible (contraste ≥ 4,5:1).
 */
export const THEMES: { label: string; value: string }[] = [
  { label: 'Bleu NS', value: '#0060ff' },
  { label: 'Encre', value: '#16161d' },
  { label: 'Corail', value: '#c8472d' },
  { label: 'Forêt', value: '#17804f' },
  { label: 'Violet', value: '#7c3aed' },
]

const HEX = /^#[0-9a-f]{6}$/i

/** Couleur valide ou bleu NS. */
export function safeTheme(theme: string | null | undefined): string {
  return theme && HEX.test(theme) ? theme.toLowerCase() : DEFAULT_THEME
}

/** Texte lisible sur le bandeau : blanc sur fond foncé, encre sur fond clair. */
export function textOn(hex: string): '#ffffff' | '#16161d' {
  const n = parseInt(safeTheme(hex).slice(1), 16)
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  // Contraste avec le blanc ≥ 4,5 ⇔ L ≤ 0,183.
  return L <= 0.183 ? '#ffffff' : '#16161d'
}

export function cardInitials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

/** Chiffres d'un numéro (pour wa.me). */
export function phoneDigits(raw: string): string {
  let d = raw.replace(/[^\d]/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  return d
}

/**
 * Lien WhatsApp. Même règle que le serveur : un numéro congolais saisi en local
 * (06 123 45 67) reçoit l'indicatif 242.
 */
export function whatsappHref(raw: string): string | null {
  let d = phoneDigits(raw)
  if (d.length === 9 && d.startsWith('0')) d = '242' + d
  return d.length >= 8 && d.length <= 15 ? `https://wa.me/${d}` : null
}

/** Adresse web cliquable (« nscreative.cg » → « https://nscreative.cg »). */
export function websiteHref(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

/** Adresse web lisible, sans protocole ni barre finale. */
export function websiteLabel(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

/** Profil en base → champs de l'éditeur. */
export function fieldsFromProfile(p: CardProfile | null): CardFields {
  const socials = p?.socials ?? []
  const wa = socials.find((s) => s.label === 'WhatsApp')?.url ?? ''
  const site = socials.find((s) => s.label === 'Site web') ?? socials.find((s) => s.label !== 'WhatsApp')
  const waDigits = wa.replace(/^https?:\/\/wa\.me\//i, '').replace(/[^\d]/g, '')
  return {
    fullName: p?.fullName ?? '',
    title: p?.title ?? '',
    org: p?.org ?? '',
    phone: p?.phone ?? '',
    whatsapp: waDigits ? `+${waDigits}` : '',
    email: p?.email ?? '',
    website: site?.url ?? '',
    theme: safeTheme(p?.theme),
  }
}
