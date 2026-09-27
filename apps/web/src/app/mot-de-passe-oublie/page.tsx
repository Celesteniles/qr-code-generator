import type { Metadata } from 'next'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { AuthFrame } from '@/components/auth/AuthFrame'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { turnstileKeys } from '@/server/turnstile'

// Mot de passe oublié : on demande l'adresse, un lien part par e-mail.
// Page publique (accessible sans être connecté).

// Lit les clés Turnstile du Worker à chaque requête (pas de rendu au build).
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mot de passe oublié · link.cg',
  robots: { index: false },
}

export default function MotDePasseOubliePage() {
  // Même règle que /connexion : widget seulement si le serveur exige le jeton.
  const turnstileSiteKey = turnstileKeys(getCloudflareContext().env)?.siteKey ?? null

  return (
    <AuthFrame>
      <ForgotPasswordForm turnstileSiteKey={turnstileSiteKey} />
    </AuthFrame>
  )
}
