// Alerte interne « Anomalie de paiement », envoyée à NS Creative (ISSUER.email)
// dès qu'un dépôt pawaPay encaissé n'a pas pu donner l'offre. Contient tout ce
// qu'il faut pour trancher sans ouvrir la base ; procédure : docs/PAIEMENTS.md.

import { maskPhone, type AnomalyContext } from '@link/db'
import { PLANS } from '@link/shared'
import { formatDate, formatFcfa } from '@/components/facturation/format'
import { emailLayout, escapeHtml, oneLine } from './layout'
import type { RenderedEmail } from './verification'

const NB = ' '

const KIND_LABEL: Record<AnomalyContext['anomaly']['kind'], string> = {
  amount_mismatch: 'Montant ou devise inattendus',
  unknown_provider: 'Opérateur inconnu',
  receipt_failed: 'Reçu non créé',
}

export function paymentAnomalyEmail(ctx: AnomalyContext, adminUrl: string): RenderedEmail {
  const { anomaly, checkout, payer, owners } = ctx
  const d = anomaly.deposit
  const space = oneLine(ctx.workspaceName) || '(sans nom)'
  const subject = `Anomalie de paiement : ${KIND_LABEL[anomaly.kind]} (${space})`.replace(/ ([:?!])/g, `${NB}$1`)
  const person = (p: { name: string; email: string } | null) => (p ? `${oneLine(p.name) || '(sans nom)'} <${p.email}>` : 'inconnu')

  const rows: [string, string][] = [
    ['Anomalie', `${KIND_LABEL[anomaly.kind]} : ${anomaly.detail}`],
    ['Espace', `${space} (${anomaly.workspaceId})`],
    ['Payeur (compte)', person(payer)],
    ['Propriétaire', owners.length ? owners.map(person).join(', ') : 'inconnu'],
    ['Offre demandée', `${PLANS[checkout.plan].label}, ${checkout.cycle === 'year' ? '1 an' : '1 mois'}`],
    ['Montant attendu', formatFcfa(checkout.amount)],
    ['Montant reçu', `${d.amount ?? '?'} ${d.currency ?? '?'}`],
    ['depositId', checkout.id],
    ['providerTransactionId', d.providerTransactionId ?? '(absent)'],
    ['Opérateur', d.provider ?? '(absent)'],
    ['Numéro', maskPhone(d.phoneNumber ? `+${d.phoneNumber}` : null) ?? '(absent)'],
    ['API pawaPay', checkout.pawapayEnv ?? '(non notée)'],
    ['Paiement lancé le', formatDate(checkout.createdAt)],
  ].map(([k, v]) => [k, v.replace(/ ([:?!])/g, `${NB}$1`)])

  const intro = 'pawaPay a confirmé un dépôt, mais l’offre n’a PAS été donnée automatiquement. Le client voit « paiement reçu, en cours de vérification ». À trancher : accorder l’offre, ou rembourser.'
  const text = [
    'Bonjour,',
    '',
    intro,
    '',
    ...rows.map(([k, v]) => `${k} : ${v}`.replace(/ :/, `${NB}:`)),
    '',
    'Traiter l’anomalie :',
    adminUrl,
    '',
    'Procédure : docs/PAIEMENTS.md (dépôt link.cg).',
  ].join('\n')

  const table = rows
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#4f4c44;vertical-align:top;white-space:nowrap;">${escapeHtml(k)}</td><td style="padding:4px 0;word-break:break-all;">${escapeHtml(v)}</td></tr>`)
    .join('\n')
  const html = emailLayout({
    subject,
    preheader: `${formatFcfa(checkout.amount)} attendus, ${d.amount ?? '?'} ${d.currency ?? '?'} reçus : à traiter.`,
    originUrl: adminUrl,
    button: { label: 'Traiter l’anomalie', url: adminUrl },
    bodyHtml: `<p style="margin:0 0 16px 0;">${escapeHtml(intro)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:20px;margin:0 0 16px 0;">${table}</table>`,
  })
  return { subject, html, text }
}
