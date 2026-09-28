// E-mail « Vous êtes invité dans un espace link.cg », envoyé depuis l'onglet
// Équipe de /compte. Même gabarit que la confirmation d'adresse : tableaux,
// styles en ligne, seule image : le logo, et toujours une version texte.

import { brandHeader } from './brand'
import type { RenderedEmail } from './verification'

export interface InvitationEmailInput {
  /** Nom (ou adresse) de la personne qui invite. */
  inviterName: string
  /** Nom de l'espace rejoint. */
  workspaceName: string
  /** « admin » ou « member ». */
  role: 'admin' | 'member'
  /** Lien d'acceptation (contient le jeton en clair). */
  url: string
  /** Durée de validité du lien, en jours. */
  validityDays: number
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Une ligne, sans retours ni espaces en trop : le nom va dans l'objet du message. */
function oneLine(s: string, max = 80): string {
  const v = s.replace(/\s+/g, ' ').trim()
  return v.length > max ? `${v.slice(0, max - 1)}…` : v
}

export function invitationEmail({ inviterName, workspaceName, role, url, validityDays }: InvitationEmailInput): RenderedEmail {
  const inviter = oneLine(inviterName) || 'Un membre de link.cg'
  const space = oneLine(workspaceName) || 'son espace'
  const validity = validityDays === 1 ? '1 jour' : `${validityDays} jours`
  const what = role === 'admin'
    ? 'Vous pourrez y gérer les liens, les QR codes et l\'équipe.'
    : 'Vous pourrez y créer et modifier les liens et les QR codes, et suivre leurs statistiques.'
  const subject = `${inviter} vous invite sur link.cg`

  const text = [
    'Bonjour,',
    '',
    `${inviter} vous invite à rejoindre l'espace « ${space} » sur link.cg. ${what}`,
    '',
    'Pour accepter, ouvrez ce lien :',
    '',
    url,
    '',
    `Ce lien reste valable ${validity} et ne sert qu'une seule fois. Connectez-vous (ou créez votre compte) avec cette adresse e-mail : l'invitation lui est réservée.`,
    '',
    'Vous ne connaissez pas cette personne ? Ignorez ce message : rien ne se passera.',
    '',
    'L\'équipe link.cg',
    'link.cg, un produit de NS Creative',
  ].join('\n')

  const u = escapeHtml(url)
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#efe9df;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Rejoignez l'espace « ${escapeHtml(space)} » sur link.cg.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#efe9df;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:20px;border:1px solid #dcd4c6;">
<tr><td style="padding:28px 28px 8px 28px;">${brandHeader(url)}</td></tr>
<tr><td style="padding:8px 28px 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#16161d;">
<p style="margin:0 0 16px 0;">Bonjour,</p>
<p style="margin:0 0 16px 0;"><strong>${escapeHtml(inviter)}</strong> vous invite à rejoindre l'espace <strong>«&nbsp;${escapeHtml(space)}&nbsp;»</strong> sur link.cg.</p>
<p style="margin:0 0 24px 0;">${escapeHtml(what)}</p>
</td></tr>
<tr><td align="left" style="padding:0 28px 24px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="border-radius:999px;background-color:#16161d;">
<a href="${u}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">Rejoindre l'espace</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 28px 24px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#4f4c44;">
<p style="margin:0 0 8px 0;">Le bouton ne marche pas&nbsp;? Copiez ce lien dans votre navigateur&nbsp;:</p>
<p style="margin:0 0 16px 0;word-break:break-all;"><a href="${u}" target="_blank" style="color:#16161d;">${u}</a></p>
<p style="margin:0 0 16px 0;">Ce lien reste valable ${validity} et ne sert qu'une seule fois. Connectez-vous (ou créez votre compte) avec cette adresse e-mail&nbsp;: l'invitation lui est réservée.</p>
<p style="margin:0;">Vous ne connaissez pas cette personne&nbsp;? Ignorez ce message&nbsp;: rien ne se passera.</p>
</td></tr>
<tr><td style="padding:16px 28px 28px 28px;border-top:1px solid #dcd4c6;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#4f4c44;">L'équipe link.cg<br><span style="font-size:12px;color:#8a8478;">link.cg, un produit de NS Creative</span></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

  return { subject, html, text }
}
