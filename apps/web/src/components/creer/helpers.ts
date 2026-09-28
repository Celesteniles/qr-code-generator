// Fonctions pures de l'écran Créer : adresses, liens, contraste du QR.

import type { QrDesign } from '@/lib/qr-design'

/** Domaine des liens courts (correspond à DEFAULT_DOMAIN côté serveur). */
/** Types de contenu d'un QR (contrat d'URL `?type=`). Ici, et non dans content.tsx : lu par la page serveur. */
export type ContentType =
  | 'site' | 'menu' | 'whatsapp' | 'wifi' | 'vcard' | 'app'
  | 'texte' | 'email' | 'sms' | 'appel' | 'lieu' | 'reseaux'

export const CONTENT_TYPES: ContentType[] = ['site', 'menu', 'whatsapp', 'wifi', 'vcard', 'app', 'texte', 'email', 'sms', 'appel', 'lieu', 'reseaux']

export const SHORT_HOST = 'link.cg'

/** Adresse complète d'un lien court, sur link.cg ou sur un domaine personnalisé. */
export function shortUrl(slug: string, host: string = SHORT_HOST): string {
  return `https://${host}/${slug}`
}

/** Ajoute https:// si la personne a tapé « boutique.cg/promo ». */
export function normalizeUrl(value: string): string {
  const v = value.trim()
  if (!v) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v
  if (/^[^\s/]+\.[^\s/]{2,}/.test(v)) return `https://${v}`
  return v
}

/** Lien web valide (http/https, avec un domaine). */
export function isWebUrl(value: string): boolean {
  try {
    const u = new URL(normalizeUrl(value))
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.')
  } catch {
    return false
  }
}

/** Domaine de destination, sans « www. » (seule info affichée dans l'aperçu WhatsApp). */
export function hostOf(value: string): string {
  try {
    return new URL(normalizeUrl(value)).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Minuscules, sans accents, espaces → tirets, caractères interdits retirés. */
export function slugify(value: string, max = 32): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, max)
    .replace(/[-_]+$/g, '')
}

const GENERIC_SEGMENTS = new Set(['index', 'index.html', 'index.php', 'home', 'accueil', 'fr', 'en', 'p', 'view', 'edit', 'd', 'file', 'share'])

/** Propose une adresse courte à partir d'un lien collé (dernier segment parlant, sinon le domaine). */
export function suggestSlug(value: string): string {
  const url = normalizeUrl(value)
  try {
    const u = new URL(url)
    const segments = u.pathname.split('/').filter(Boolean).map((s) => decodeURIComponent(s).replace(/\.[a-z0-9]{2,4}$/i, ''))
    const meaningful = segments.reverse().find((s) => s.length >= 3 && !GENERIC_SEGMENTS.has(s.toLowerCase()) && !/^[A-Za-z0-9_-]{20,}$/.test(s) && !/^\d+$/.test(s))
    if (meaningful) {
      const s = slugify(meaningful, 24)
      if (s.length >= 3) return s
    }
    const host = u.hostname.replace(/^www\./, '').split('.')[0]
    return slugify(host, 24)
  } catch {
    return slugify(value, 24)
  }
}

/** Numéro WhatsApp → chiffres au format international (06… au Congo → 24206…). */
export function waDigits(phone: string): string {
  let d = phone.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 9 && d.startsWith('0')) d = `242${d}`
  return d
}

export function waUrl(phone: string, message: string): string {
  const d = waDigits(phone)
  if (!d) return ''
  const text = message.trim()
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

// ── Contraste du QR ─────────────────────────────────────────────────────────

function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

export type Readability =
  | { ok: true }
  | { ok: false; reason: 'contrast' | 'inverted'; ratio: number }

/**
 * Un QR se lit bien quand le motif est nettement plus foncé que le fond.
 * Seuil : rapport de contraste ≥ 4 pour chaque couleur du motif (dégradé compris).
 * Motif clair sur fond foncé : lu par une partie seulement des téléphones.
 */
export function readability(design: QrDesign): Readability {
  const bg = luminance(design.bgColor)
  const fgs = [design.dotColor, ...(design.gradient?.enabled ? [design.gradient.color2] : [])].map(luminance)
  if (bg === null || fgs.some((l) => l === null)) return { ok: true }
  let worst = Infinity
  let inverted = false
  for (const fg of fgs as number[]) {
    const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
    worst = Math.min(worst, ratio)
    if (fg > bg) inverted = true
  }
  if (inverted) return { ok: false, reason: 'inverted', ratio: worst }
  if (worst < 4) return { ok: false, reason: 'contrast', ratio: worst }
  return { ok: true }
}
