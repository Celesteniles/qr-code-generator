import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { normalizeEmail } from '@link/db'
import { getVerifiedSession } from './session'

// Accès à la page réservée /interne/paiements (anomalies de paiement), pour
// l'équipe NS Creative. Liste d'adresses dans le secret BILLING_ADMIN_EMAILS
// (séparées par des virgules), comparée à l'adresse VÉRIFIÉE de la session.
// Fermé par défaut : secret absent ou vide → personne. Pas de rôle en base : la
// liste ne peut changer que par un redéploiement du secret.

export function billingAdminEmails(): Set<string> {
  const raw = getCloudflareContext().env.BILLING_ADMIN_EMAILS ?? ''
  return new Set(raw.split(',').map(normalizeEmail).filter((e) => e.includes('@')))
}

/** Adresse de l'administrateur connecté, ou null (non connecté, non vérifié, non autorisé). */
export async function getBillingAdmin(): Promise<string | null> {
  const allowed = billingAdminEmails()
  if (!allowed.size) return null
  const session = await getVerifiedSession()
  if (!session) return null
  const email = normalizeEmail(session.user.email)
  return allowed.has(email) ? email : null
}
