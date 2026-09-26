// Modèle d'affichage d'une carte de visite, partagé par l'éditeur (aperçu en
// direct) et la page publique /c/[slug] : les deux affichent exactement la même
// chose à partir des mêmes champs.

import type { CardProfile } from '@link/db'
import { normalizePhone } from '@/lib/phone'

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
  /** Réseaux sociaux : « @nom » ou lien, par réseau. Vide = pas de bouton. */
  socials: Record<SocialKey, string>
  /** Couleur du bandeau, #rrggbb. */
  theme: string
}

// ── Réseaux sociaux ──────────────────────────────────────────────────────────

export type SocialKey = 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'youtube' | 'x'

export interface SocialNetwork {
  key: SocialKey
  /** Nom affiché, et libellé enregistré en base (socials[].label). */
  label: string
  /** Adresse d'un profil, à laquelle on ajoute le nom saisi. */
  base: string
  /** Domaines acceptés pour un lien collé (sans « www. » ni « m. »). */
  hosts: string[]
  /** Couleur du logo sur fond blanc. */
  color: string
  placeholder: string
}

/** Dans l'ordre d'affichage : les plus utilisés au Congo d'abord. */
export const SOCIAL_NETWORKS: SocialNetwork[] = [
  { key: 'facebook', label: 'Facebook', base: 'https://www.facebook.com/', hosts: ['facebook.com', 'fb.com', 'fb.me'], color: '#0866ff', placeholder: 'votrepage ou lien' },
  { key: 'tiktok', label: 'TikTok', base: 'https://www.tiktok.com/@', hosts: ['tiktok.com'], color: '#000000', placeholder: '@votrenom ou lien' },
  { key: 'instagram', label: 'Instagram', base: 'https://www.instagram.com/', hosts: ['instagram.com', 'instagr.am'], color: '#e1306c', placeholder: '@votrenom ou lien' },
  { key: 'linkedin', label: 'LinkedIn', base: 'https://www.linkedin.com/in/', hosts: ['linkedin.com'], color: '#0a66c2', placeholder: 'Lien de votre profil' },
  { key: 'youtube', label: 'YouTube', base: 'https://www.youtube.com/@', hosts: ['youtube.com', 'youtu.be'], color: '#ff0000', placeholder: '@votrechaine ou lien' },
  { key: 'x', label: 'X (Twitter)', base: 'https://x.com/', hosts: ['x.com', 'twitter.com'], color: '#000000', placeholder: '@votrenom ou lien' },
]

export const EMPTY_SOCIALS: Record<SocialKey, string> = {
  facebook: '', instagram: '', tiktok: '', linkedin: '', youtube: '', x: '',
}

const HANDLE = /^@?([\p{L}\p{N}._-]{1,100})$/u

/** Domaine d'une adresse, sans « www. », « m. », « web. ». */
function bareHost(url: URL): string {
  return url.hostname.toLowerCase().replace(/^(www|m|web|mobile)\./, '')
}

/**
 * Lien du profil à partir de ce que la personne a saisi : un nom (« @nscreative »,
 * « nscreative ») ou un lien collé, qui doit alors pointer vers le bon réseau.
 * null si la saisie n'est ni l'un ni l'autre.
 */
export function socialHref(key: SocialKey, raw: string): string | null {
  const net = SOCIAL_NETWORKS.find((n) => n.key === key)
  const v = raw.trim()
  if (!net || !v) return null
  // Un nom peut contenir des points (« ns.creative ») ; « facebook.com » seul, en
  // revanche, est un lien sans profil.
  const handle = HANDLE.exec(v)
  if (handle) {
    const bare = handle[1].toLowerCase().replace(/^(www|m|web)\./, '')
    return net.hosts.includes(bare) ? null : net.base + encodeURIComponent(handle[1])
  }
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
    const host = bareHost(url)
    if (!net.hosts.some((h) => host === h || host.endsWith(`.${h}`))) return null
    if (url.pathname.replace(/\/+$/, '') === '') return null
    url.protocol = 'https:'
    url.hash = ''
    // Paramètres de suivi (?igsh=, ?si=…) inutiles ; sauf « profile.php?id= » sur Facebook.
    if (!url.pathname.endsWith('profile.php')) url.search = ''
    return url.toString()
  } catch {
    return null
  }
}

/** Libellé court d'un profil : « @nom » quand on le reconnaît, sinon le réseau. */
export function socialHandle(key: SocialKey, href: string): string {
  const net = SOCIAL_NETWORKS.find((n) => n.key === key)
  if (!net) return href
  try {
    const url = new URL(href)
    const parts = url.pathname.split('/').filter(Boolean)
    const last = decodeURIComponent(parts[parts.length - 1] ?? '')
    if (!last || last === 'profile.php') return net.label
    return last.startsWith('@') ? last : `@${last}`
  } catch {
    return net.label
  }
}

/** Réseaux remplis d'une carte, dans l'ordre d'affichage, avec leur lien. */
export function filledSocials(socials: Record<SocialKey, string>): { net: SocialNetwork; href: string }[] {
  return SOCIAL_NETWORKS.flatMap((net) => {
    const href = socialHref(net.key, socials[net.key] ?? '')
    return href ? [{ net, href }] : []
  })
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

/**
 * Lien WhatsApp. Même règle que le serveur : numéro normalisé au format
 * international, un numéro saisi sans indicatif étant compris comme congolais.
 */
export function whatsappHref(raw: string): string | null {
  const e164 = normalizePhone(raw)
  return e164 ? `https://wa.me/${e164.slice(1)}` : null
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
  const known = new Set(['WhatsApp', ...SOCIAL_NETWORKS.map((n) => n.label)])
  const site = socials.find((s) => s.label === 'Site web') ?? socials.find((s) => !known.has(s.label))
  const networks = { ...EMPTY_SOCIALS }
  for (const n of SOCIAL_NETWORKS) {
    const url = socials.find((s) => s.label === n.label)?.url
    // Affiché sans « https:// » ni « www. » : plus lisible, et relu tel quel.
    if (url) networks[n.key] = url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')
  }
  const waDigits = wa.replace(/^https?:\/\/wa\.me\//i, '').replace(/[^\d]/g, '')
  return {
    fullName: p?.fullName ?? '',
    title: p?.title ?? '',
    org: p?.org ?? '',
    phone: p?.phone ?? '',
    whatsapp: waDigits ? `+${waDigits}` : '',
    email: p?.email ?? '',
    website: site?.url ?? '',
    socials: networks,
    theme: safeTheme(p?.theme),
  }
}
