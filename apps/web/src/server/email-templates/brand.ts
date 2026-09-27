// En-tête des e-mails : logo link.cg (PNG, Gmail n'affiche pas le SVG) + nom.
// L'image est servie par l'app elle-même (public/email/logo.png) ; son adresse
// suit celle du lien de l'e-mail, pour pointer vers la bêta ou la production.
// Si la messagerie bloque les images, le nom écrit reste lisible à côté.

export function brandHeader(linkUrl: string): string {
  let origin = 'https://qrcode.cg'
  try {
    origin = new URL(linkUrl).origin
  } catch {
    // Lien illisible : on garde l'adresse de production pour l'image.
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:10px;vertical-align:middle;"><img src="${origin}/email/logo.png" width="36" height="36" alt="" style="display:block;border:0;outline:none;"></td>
<td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:21px;font-weight:bold;letter-spacing:-0.5px;color:#16161d;">link<span style="color:#0060ff;">.cg</span></td>
</tr></table>`
}
