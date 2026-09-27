// E-mail « Confirmez votre adresse » envoyé à l'inscription (et sur demande depuis
// /verifier-email). HTML volontairement sobre pour passer partout (Gmail, Outlook,
// messageries des opérateurs) : tableaux, styles en ligne, seule image : le logo.
// Une version texte accompagne toujours le HTML.

import { brandHeader } from './brand'

export interface VerificationEmailInput {
  /** Nom saisi à l'inscription ; vide → « Bonjour, ». */
  name?: string | null
  /** Lien de confirmation (contient le jeton). */
  url: string
  /** Durée de validité du lien, en heures. */
  validityHours: number
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function verificationEmail({ name, url, validityHours }: VerificationEmailInput): RenderedEmail {
  const cleanName = (name ?? '').replace(/\s+/g, ' ').trim()
  const hello = cleanName ? `Bonjour ${cleanName},` : 'Bonjour,'
  const validity = validityHours === 1 ? '1 heure' : `${validityHours} heures`
  const subject = 'Confirmez votre adresse e-mail · link.cg'

  const text = [
    hello,
    '',
    'Merci d\'avoir créé votre espace sur link.cg. Pour l\'utiliser, confirmez votre adresse e-mail en ouvrant ce lien :',
    '',
    url,
    '',
    `Ce lien reste valable ${validity}. Passé ce délai, connectez-vous et demandez-en un nouveau.`,
    '',
    'Si vous n\'êtes pas à l\'origine de cette inscription, ignorez ce message : aucun compte ne sera activé.',
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
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Un clic pour confirmer votre adresse et accéder à votre espace link.cg.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#efe9df;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:20px;border:1px solid #dcd4c6;">
<tr><td style="padding:28px 28px 8px 28px;">${brandHeader(url)}</td></tr>
<tr><td style="padding:8px 28px 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#16161d;">
<p style="margin:0 0 16px 0;">${escapeHtml(hello)}</p>
<p style="margin:0 0 24px 0;">Merci d'avoir créé votre espace sur link.cg. Pour l'utiliser, confirmez votre adresse e-mail&nbsp;:</p>
</td></tr>
<tr><td align="left" style="padding:0 28px 24px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="border-radius:999px;background-color:#16161d;">
<a href="${u}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">Confirmer mon adresse</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 28px 24px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#4f4c44;">
<p style="margin:0 0 8px 0;">Le bouton ne marche pas&nbsp;? Copiez ce lien dans votre navigateur&nbsp;:</p>
<p style="margin:0 0 16px 0;word-break:break-all;"><a href="${u}" target="_blank" style="color:#16161d;">${u}</a></p>
<p style="margin:0 0 16px 0;">Ce lien reste valable ${validity}. Passé ce délai, connectez-vous et demandez-en un nouveau.</p>
<p style="margin:0;">Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message&nbsp;: aucun compte ne sera activé.</p>
</td></tr>
<tr><td style="padding:16px 28px 28px 28px;border-top:1px solid #dcd4c6;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#4f4c44;">L'équipe link.cg<br><span style="font-size:12px;color:#8a8478;">link.cg, un produit de NS Creative</span></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

  return { subject, html, text }
}
