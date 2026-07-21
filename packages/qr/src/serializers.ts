// Sérialiseurs de contenu QR — fonctions pures, sans dépendance au DOM ni à React.
// Le comportement reproduit à l'identique le `buildText` d'origine du composant
// ContentCard, de sorte qu'un QR déjà imprimé reste bit-pour-bit identique.

import type { WifiInput, VCardInput, EmailInput, SmsInput, GeoInput } from './types'

export const DEFAULT_URL = 'https://example.com'

/** Échappe les caractères réservés du format WIFI: ( \ ; " , ). */
export function wifiEsc(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/"/g, '\\"')
    .replace(/,/g, '\\,')
}

/** URL nue. Vide → URL de démonstration (comportement de l'aperçu). */
export function toUrl(value: string): string {
  return value.trim() || DEFAULT_URL
}

/** Texte libre, tel quel. */
export function toText(value: string): string {
  return value
}

export function toWifi(i: WifiInput): string {
  return `WIFI:T:${i.security};S:${wifiEsc(i.ssid)};P:${wifiEsc(i.password)};H:${i.hidden};;`
}

export function toVCard(i: VCardInput): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0']
  if (i.last || i.first) {
    lines.push(`N:${i.last ?? ''};${i.first ?? ''};;;`)
    lines.push(`FN:${[i.first, i.last].filter(Boolean).join(' ')}`)
  }
  if (i.org) lines.push(`ORG:${i.org}`)
  if (i.title) lines.push(`TITLE:${i.title}`)
  if (i.phone) lines.push(`TEL:${i.phone}`)
  if (i.email) lines.push(`EMAIL:${i.email}`)
  if (i.web) lines.push(`URL:${i.web}`)
  if (i.addr) lines.push(`ADR:;;${i.addr};;;;`)
  lines.push('END:VCARD')
  return lines.join('\n')
}

export function toEmail(i: EmailInput): string {
  const params: string[] = []
  if (i.subject) params.push(`subject=${encodeURIComponent(i.subject)}`)
  if (i.body) params.push(`body=${encodeURIComponent(i.body)}`)
  return `mailto:${i.to}${params.length ? '?' + params.join('&') : ''}`
}

export function toSms(i: SmsInput): string {
  return `smsto:${i.phone}:${i.message ?? ''}`
}

export function toPhone(phone: string): string {
  return `tel:${phone}`
}

/** Coordonnées manquantes → chaîne vide (aucun QR généré). */
export function toGeo(i: GeoInput): string {
  if (!i.lat || !i.lng) return ''
  const q = i.query?.trim() ? `?q=${encodeURIComponent(i.query)}` : ''
  return `geo:${i.lat},${i.lng}${q}`
}

/** Lien profond d'application, tel quel (trimmé). */
export function toApp(url: string): string {
  return url.trim()
}

/** Lien de réseau social, tel quel (trimmé). */
export function toSocial(url: string): string {
  return url.trim()
}
