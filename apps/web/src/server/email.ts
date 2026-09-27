import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Envoi des e-mails transactionnels (vérification d'adresse, mot de passe oublié)
// via l'API Brevo. Expéditeur : noreply@qrcode.cg — le même domaine que le site
// et les liens des e-mails : un expéditeur d'un autre domaine (nscreative.cg)
// ressemblait à du phishing et finissait en indésirables. qrcode.cg doit rester
// authentifié dans Brevo (DKIM, DMARC, SPF).
//
// Secret : BREVO_API_KEY (wrangler secret put BREVO_API_KEY). Sans lui, aucun
// e-mail ne part : l'erreur est journalisée et remontée à l'appelant, jamais
// simulée.

const ENDPOINT = 'https://api.brevo.com/v3/smtp/email'
const SENDER = { name: 'link.cg', email: 'noreply@qrcode.cg' }
/** Au-delà, on abandonne : un envoi bloqué ne doit pas figer l'inscription. */
const TIMEOUT_MS = 8000

export interface EmailMessage {
  to: string
  /** Nom du destinataire, s'il est connu. */
  name?: string
  subject: string
  html: string
  /** Version texte : lue par les messageries simples, et aide à la délivrabilité. */
  text: string
}

export class EmailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmailError'
  }
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const apiKey = getCloudflareContext().env.BREVO_API_KEY
  if (!apiKey) {
    console.error('[email] BREVO_API_KEY absente — e-mail non envoyé :', msg.subject)
    throw new EmailError('Service d\'e-mail non configuré')
  }

  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email: msg.to, ...(msg.name ? { name: msg.name } : {}) }],
        subject: msg.subject,
        htmlContent: msg.html,
        textContent: msg.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    console.error('[email] échec de l\'envoi', e)
    throw new EmailError('Envoi impossible')
  }
  if (!res.ok) {
    // Le corps de l'erreur Brevo ne contient pas la clé : on peut le journaliser.
    console.error('[email] Brevo a refusé l\'envoi', res.status, await res.text().catch(() => ''))
    throw new EmailError(`Brevo : ${res.status}`)
  }
}
