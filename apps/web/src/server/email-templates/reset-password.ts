import 'server-only'

// E-mail « Mot de passe oublié » : HTML simple lisible par toutes les messageries
// (tableaux, styles en ligne, pas d'image ni de police externe) + version texte.
// Gabarit autonome : pas de dépendance à un layout partagé.

export interface ResetPasswordEmail {
  subject: string
  html: string
  text: string
}

/** Le texte va dans du HTML : on neutralise les caractères actifs. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function resetPasswordEmail({ name, url, validity = '1 heure' }: {
  /** Nom du compte, s'il est connu. */
  name?: string | null
  /** Lien de réinitialisation produit par Better Auth. */
  url: string
  /** Durée de validité du lien, en toutes lettres. */
  validity?: string
}): ResetPasswordEmail {
  const hello = name?.trim() ? `Bonjour ${name.trim()},` : 'Bonjour,'
  const subject = 'Choisissez un nouveau mot de passe · link.cg'

  const text = [
    hello,
    '',
    'Vous avez demandé à changer le mot de passe de votre compte link.cg.',
    'Pour en choisir un nouveau, ouvrez ce lien :',
    '',
    url,
    '',
    `Ce lien est valable ${validity} et ne sert qu'une seule fois.`,
    '',
    'Si vous n\'avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.',
    '',
    'L\'équipe link.cg',
  ].join('\n')

  const u = esc(url)
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#efe9df;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#efe9df;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:16px;">
        <tr>
          <td style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#16161d;">
            link.cg
          </td>
        </tr>
        <tr>
          <td style="padding:8px 28px 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#16161d;">
            <p style="margin:0 0 16px 0;">${esc(hello)}</p>
            <p style="margin:0 0 24px 0;">Vous avez demandé à changer le mot de passe de votre compte link.cg. Appuyez sur le bouton pour en choisir un nouveau.</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:0 28px 24px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#16161d" style="border-radius:12px;">
                  <a href="${u}" target="_blank" style="display:inline-block;padding:14px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">Choisir un nouveau mot de passe</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#4b5563;">
            <p style="margin:0 0 8px 0;">Le bouton ne marche pas ? Copiez ce lien dans votre navigateur :</p>
            <p style="margin:0 0 16px 0;word-break:break-all;"><a href="${u}" target="_blank" style="color:#004fd6;">${u}</a></p>
            <p style="margin:0 0 16px 0;">Ce lien est valable ${esc(validity)} et ne sert qu&#39;une seule fois.</p>
            <p style="margin:0 0 24px 0;">Si vous n&#39;avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 28px 28px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b7280;">
            L&#39;équipe link.cg · Message automatique, merci de ne pas y répondre.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`

  return { subject, html, text }
}
