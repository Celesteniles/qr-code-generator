// Modèle d'affichage des écrans « Mes liens & QR » et « Fiche d'un lien ».
// Sérialisable : préparé côté serveur, passé aux composants client.

import type { Rule } from '@link/shared'
import type { QrDesign } from '@/lib/qr-design'

export type LinkKind = 'static' | 'app' | 'card'

export interface LinkItem {
  id: string
  slug: string
  /** Domaine du lien : link.cg ou un domaine personnalisé (go.monresto.cg). */
  host: string
  kind: LinkKind
  active: boolean
  createdAt: number
  /** Adresse complète, ex. https://link.cg/menu. */
  shortUrl: string
  /** Où mène le lien, en clair (« nscreative.cg/offres », « iPhone → apps.apple.com · … »). */
  destination: string
  /** Style enregistré du QR, ou null si l'utilisateur n'en a jamais choisi. */
  design: QrDesign | null
  /** Visites (clics + scans) sur 30 jours. */
  visits: number
}

export const SHORT_HOST = 'link.cg'

export function shortUrl(slug: string, host: string = SHORT_HOST): string {
  return `https://${host}/${slug}`
}

/** URL lisible : sans protocole, sans « www. », sans barre finale. */
export function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return prettyUrl(url)
  }
}

/** Destination d'une règle, en langage courant. */
export function describeRule(rule: Rule, cardName?: string | null): string {
  if (rule.type === 'static') return prettyUrl(rule.url)
  if (rule.type === 'app') {
    const parts: string[] = []
    if (rule.ios) parts.push(`iPhone → ${host(rule.ios)}`)
    if (rule.android) parts.push(`Android → ${host(rule.android)}`)
    parts.push(parts.length ? `sinon ${host(rule.fallback)}` : prettyUrl(rule.fallback))
    return parts.join(' · ')
  }
  return cardName ? `Carte de visite · ${cardName}` : 'Carte de visite'
}

export function typeLabel(kind: LinkKind, hasDesign: boolean): string {
  if (kind === 'card') return 'Carte'
  if (kind === 'app') return 'Lien · App'
  return hasDesign ? 'Lien court · QR' : 'Lien court'
}

export const nf = new Intl.NumberFormat('fr-FR')

export function visitsLabel(n: number): string {
  return n > 1 ? `${nf.format(n)} visites` : `${n} visite`
}
