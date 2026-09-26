// Fiche contact (vCard 3.0) d'une carte de visite, servie par /c/[slug]/contact.vcf.
// Distincte de toVCard (@link/qr), qui doit rester identique pour les QR déjà
// imprimés : ici on échappe les textes et on ajoute site, réseaux et lien de la carte.

import { filledSocials, websiteHref, whatsappHref, type CardFields } from './card-model'
import { normalizePhone } from '@/lib/phone'
import { vcardRaw as raw, vcardText as esc } from '@link/shared'

// Toute valeur passe par esc (texte : \ , ; et retours à la ligne échappés) ou raw
// (TEL, EMAIL, URL : caractères de contrôle retirés). Un CR/LF laissé tel quel
// ouvrirait une nouvelle ligne, donc une propriété injectée dans la fiche.

export function cardVCard(fields: CardFields, cardUrl: string): string {
  const name = fields.fullName.trim()
  const [first = '', ...rest] = name.split(/\s+/)
  const lines = ['BEGIN:VCARD', 'VERSION:3.0']
  lines.push(`N:${esc(rest.join(' '))};${esc(first)};;;`)
  lines.push(`FN:${esc(name)}`)
  if (fields.org.trim()) lines.push(`ORG:${esc(fields.org.trim())}`)
  if (fields.title.trim()) lines.push(`TITLE:${esc(fields.title.trim())}`)
  const tel = raw(normalizePhone(fields.phone) ?? fields.phone)
  if (tel) lines.push(`TEL;TYPE=CELL:${tel}`)
  const email = raw(fields.email)
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${email}`)
  const site = websiteHref(fields.website)
  if (site) lines.push(`URL:${raw(site)}`)
  const wa = fields.whatsapp.trim() ? whatsappHref(fields.whatsapp) : null
  if (wa) lines.push(`URL;TYPE=WhatsApp:${raw(wa)}`)
  for (const { net, href } of filledSocials(fields.socials)) lines.push(`URL;TYPE=${net.label.replace(/[^A-Za-z]/g, '')}:${raw(href)}`)
  lines.push(`URL;TYPE=Carte:${raw(cardUrl)}`)
  lines.push('END:VCARD')
  // Fins de ligne CRLF, comme le demande la norme (certains carnets y tiennent).
  return lines.join('\r\n') + '\r\n'
}
