// E-mail « Votre offre arrive à échéance », envoyé par la tâche planifiée
// (server/billing-jobs.ts) au propriétaire et aux administrateurs de l'espace,
// 7 jours avant, la veille et le jour de l'échéance. Le mobile money n'a pas de
// prélèvement automatique : sans ce rappel, l'offre retombe en Gratuit en silence.

import { PLAN_GRACE_MS, type ReminderKind } from '@link/db'
import { formatDate, formatFcfa } from '@/components/facturation/format'
import { emailLayout, escapeHtml, oneLine, paragraphs } from './layout'
import type { RenderedEmail } from './verification'

const NB = ' '

export interface RenewalReminderInput {
  kind: ReminderKind
  /** Nom du destinataire ; vide → « Bonjour, ». */
  name?: string | null
  workspaceName: string
  planLabel: string
  cycle: 'month' | 'year'
  /** Prix du renouvellement, en FCFA. */
  amount: number
  /** Fin (exclusive) de la période payée : date de l'échéance. */
  periodEnd: number
  /** Retour en Gratuit sans renouvellement. */
  downgradeAt: number
  /** Page de paiement (URL absolue). */
  url: string
  now?: number
}

export function renewalReminderEmail(input: RenewalReminderInput): RenderedEmail {
  const { kind, planLabel, amount, periodEnd, downgradeAt, url } = input
  const now = input.now ?? Date.now()
  const cleanName = oneLine(input.name ?? '')
  const hello = cleanName ? `Bonjour ${cleanName},` : 'Bonjour,'
  const space = oneLine(input.workspaceName) || 'votre espace'
  const due = formatDate(periodEnd)
  const price = `${formatFcfa(amount)} pour ${input.cycle === 'year' ? 'un an' : 'un mois'}`
  const graceDays = Math.max(1, Math.ceil((downgradeAt - Math.max(now, periodEnd)) / 86_400_000))
  const inDays = graceDays === 1 ? 'demain' : `dans ${graceDays}${NB}jours`

  const subject = kind === 'j7'
    ? `Votre offre ${planLabel} arrive à échéance le ${due}`
    : kind === 'j1'
      ? `Votre offre ${planLabel} arrive à échéance demain`
      : now < periodEnd
        ? `Votre offre ${planLabel} arrive à échéance aujourd’hui`
        : `Votre offre ${planLabel} est arrivée à échéance`

  const lead = kind === 'j0'
    ? `L’offre ${planLabel} de l’espace «${NB}${space}${NB}» ${now < periodEnd ? 'arrive' : 'est arrivée'} à échéance le ${due}.`
    : `L’offre ${planLabel} de l’espace «${NB}${space}${NB}» arrive à échéance le ${due}${kind === 'j1' ? `, demain` : ''}.`
  const why = 'Le paiement par mobile money ne se renouvelle pas tout seul : pour garder votre offre, réglez la période suivante en quelques secondes depuis votre téléphone.'
  const consequence = kind === 'j0'
    ? `Sans renouvellement, votre offre repasse en Gratuit ${inDays}, le ${formatDate(downgradeAt)}, et les avantages de l’offre ${planLabel} vous seront retirés.`
    : `Sans renouvellement, votre offre repasse en Gratuit ${Math.round(PLAN_GRACE_MS / 86_400_000)}${NB}jours après l’échéance.`
  const amountLine = `Montant${NB}: ${price}. La nouvelle période commence à la fin de la période en cours${NB}: vous ne perdez aucun jour.`

  const text = [
    hello,
    '',
    lead,
    '',
    why,
    '',
    amountLine,
    '',
    consequence,
    '',
    'Pour renouveler, ouvrez ce lien :',
    '',
    url,
    '',
    'Déjà réglé ? Ignorez ce message.',
    '',
    'L’équipe link.cg',
    'link.cg, un produit de NS Creative',
  ].join('\n').replace(/ ([:?!])/g, `${NB}$1`)

  const html = emailLayout({
    subject,
    preheader: `${price}, à régler avant le ${due}.`,
    originUrl: url,
    button: { label: 'Renouveler mon offre', url },
    bodyHtml: paragraphs([
      escapeHtml(hello),
      escapeHtml(lead),
      escapeHtml(why),
      `<strong>Montant${NB}:</strong> ${escapeHtml(price)}. La nouvelle période commence à la fin de la période en cours${NB}: vous ne perdez aucun jour.`,
      escapeHtml(consequence),
    ]) + `<p style="margin:0 0 16px 0;font-size:14px;color:#4f4c44;">Déjà réglé${NB}? Ignorez ce message.</p>`,
  })

  return { subject, html, text }
}
