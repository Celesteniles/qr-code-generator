// Gabarit commun des e-mails de facturation (rappel d'échéance, alerte
// d'anomalie) : même habillage que la confirmation d'adresse et l'invitation
// (tableaux, styles en ligne, seule image : le logo).

import { brandHeader } from './brand'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Une ligne, sans retours ni espaces en trop (noms repris dans l'objet). */
export function oneLine(s: string, max = 80): string {
  const v = s.replace(/\s+/g, ' ').trim()
  return v.length > max ? `${v.slice(0, max - 1)}…` : v
}

const P = 'margin:0 0 16px 0;'

/** Paragraphes HTML (déjà échappés par l'appelant). */
export function paragraphs(items: string[]): string {
  return items.map((p) => `<p style="${P}">${p}</p>`).join('\n')
}

export function emailLayout(input: {
  subject: string
  /** Aperçu affiché par les messageries après l'objet. */
  preheader: string
  /** Corps en HTML (déjà échappé). */
  bodyHtml: string
  /** Bouton principal (URL absolue). */
  button?: { label: string; url: string }
  /** URL servant à trouver l'origine du logo (bêta ou production). */
  originUrl: string
}): string {
  const { subject, preheader, bodyHtml, button, originUrl } = input
  const buttonHtml = button
    ? `<tr><td align="left" style="padding:0 28px 24px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="border-radius:999px;background-color:#16161d;">
<a href="${escapeHtml(button.url)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(button.label)}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 28px 24px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#4f4c44;">
<p style="margin:0 0 8px 0;">Le bouton ne marche pas&nbsp;? Copiez ce lien dans votre navigateur&nbsp;:</p>
<p style="margin:0;word-break:break-all;"><a href="${escapeHtml(button.url)}" target="_blank" style="color:#16161d;">${escapeHtml(button.url)}</a></p>
</td></tr>`
    : ''
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#efe9df;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#efe9df;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:20px;border:1px solid #dcd4c6;">
<tr><td style="padding:28px 28px 8px 28px;">${brandHeader(originUrl)}</td></tr>
<tr><td style="padding:8px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#16161d;">
${bodyHtml}
</td></tr>
${buttonHtml}
<tr><td style="padding:16px 28px 28px 28px;border-top:1px solid #dcd4c6;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#4f4c44;">L’équipe link.cg<br><span style="font-size:12px;color:#8a8478;">link.cg, un produit de NS Creative</span></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
