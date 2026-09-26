import type { PaymentMethod, PaymentStatus } from '@link/db'

// Formats d'affichage de la facturation : montants en FCFA (entiers), dates à
// l'heure de Brazzaville, libellés des moyens de paiement et des états.

const TZ = 'Africa/Brazzaville'
const amountFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

/** 15000 → « 15 000 FCFA » (espaces insécables). */
export function formatFcfa(amount: number): string {
  return `${amountFmt.format(amount)}\u00a0FCFA`
}

const fmts = {
  long: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }),
  longNoYear: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: TZ }),
  short: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }),
  shortNoYear: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: TZ }),
}

/** Date lisible ; le 1er du mois s'écrit « 1er ». */
function fmt(ts: number, short: boolean, withYear = true): string {
  const f = fmts[`${short ? 'short' : 'long'}${withYear ? '' : 'NoYear'}` as keyof typeof fmts]
  return f
    .formatToParts(new Date(ts))
    .map((p) => (p.type === 'day' && p.value === '1' ? '1er' : p.value))
    .join('')
}

/** « 1er juillet 2026 » */
export function formatDate(ts: number): string {
  return fmt(ts, false)
}

/** « 15 juin 2026 » en abrégé pour les tableaux (« 3 sept. 2026 »). */
export function formatShortDate(ts: number): string {
  return fmt(ts, true)
}

/**
 * Période couverte. `end` est exclusive (début de la période suivante) : on
 * affiche la veille. « 1er juin – 30 juin 2026 », ou deux années si elles diffèrent.
 */
export function formatPeriod(start: number, end: number, short = false): string {
  const last = Math.max(start, end - 1)
  const sameYear = new Date(start + 3_600_000).getUTCFullYear() === new Date(last + 3_600_000).getUTCFullYear()
  return `${fmt(start, short, !sameYear)} – ${fmt(last, short)}`
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  airtel_money: 'Airtel Money',
  mtn_momo: 'MTN MoMo',
  manual: 'Enregistré manuellement',
}

export const STATUS: Record<PaymentStatus, { label: string; pill: string }> = {
  paid: { label: 'Payé', pill: 'pill-ok' },
  pending: { label: 'En attente', pill: 'pill-sun' },
  failed: { label: 'Échoué', pill: 'pill-bad' },
  refunded: { label: 'Remboursé', pill: 'pill-soft' },
}
