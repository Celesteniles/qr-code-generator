// Fiche contact (vCard 3.0) d'une carte de visite, servie par /c/[slug]/contact.vcf.
// Distincte de toVCard (@link/qr), qui doit rester identique pour les QR déjà
// imprimés : ici on échappe les textes et on ajoute site, réseaux et lien de la carte.

import { filledSocials, phoneDigits, websiteHref, whatsappHref, type CardFields } from './card-model'

/** Échappe une valeur texte vCard (\ , ; et retours à la ligne). */
function esc(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

/**
 * Numéro au format international quand on le reconnaît : un numéro congolais saisi
 * en local (06 123 45 67) devient +242061234567, joignable depuis l'étranger et
 * reconnu par WhatsApp. Sinon, tel que saisi.
 */
function intlPhone(raw: string): string {
  const v = raw.trim()
  const d = phoneDigits(v)
  if (/^\+/.test(v) || raw.trim().startsWith('00')) return d ? `+${d}` : v
  if (d.length === 9 && d.startsWith('0')) return `+242${d}`
  return v
}

export function cardVCard(fields: CardFields, cardUrl: string): string {
  const name = fields.fullName.trim()
  const [first = '', ...rest] = name.split(/\s+/)
  const lines = ['BEGIN:VCARD', 'VERSION:3.0']
  lines.push(`N:${esc(rest.join(' '))};${esc(first)};;;`)
  lines.push(`FN:${esc(name)}`)
  if (fields.org.trim()) lines.push(`ORG:${esc(fields.org.trim())}`)
  if (fields.title.trim()) lines.push(`TITLE:${esc(fields.title.trim())}`)
  if (fields.phone.trim()) lines.push(`TEL;TYPE=CELL:${intlPhone(fields.phone)}`)
  if (fields.email.trim()) lines.push(`EMAIL;TYPE=INTERNET:${fields.email.trim()}`)
  const site = websiteHref(fields.website)
  if (site) lines.push(`URL:${site}`)
  const wa = fields.whatsapp.trim() ? whatsappHref(fields.whatsapp) : null
  if (wa) lines.push(`URL;TYPE=WhatsApp:${wa}`)
  for (const { net, href } of filledSocials(fields.socials)) lines.push(`URL;TYPE=${net.label.replace(/[^A-Za-z]/g, '')}:${href}`)
  lines.push(`URL;TYPE=Carte:${cardUrl}`)
  lines.push('END:VCARD')
  // Fins de ligne CRLF, comme le demande la norme (certains carnets y tiennent).
  return lines.join('\r\n') + '\r\n'
}
