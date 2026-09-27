import type { Metadata } from 'next'
import { AuthFrame } from '@/components/auth/AuthFrame'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

// Arrivée depuis le lien de l'e-mail « mot de passe oublié ». Better Auth vérifie
// le jeton puis redirige ici avec ?token=… (valide) ou ?error=INVALID_TOKEN
// (expiré, déjà utilisé, inconnu). Page publique (accessible sans être connecté).

export const metadata: Metadata = {
  title: 'Nouveau mot de passe · link.cg',
  robots: { index: false },
  // Le jeton est dans l'adresse : ne pas le transmettre aux sites tiers.
  referrer: 'no-referrer',
}

export default async function ReinitialiserPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>
}) {
  const sp = await searchParams
  const token = Array.isArray(sp.token) ? sp.token[0] : sp.token
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error

  return (
    <AuthFrame>
      <ResetPasswordForm token={!error && token ? token : null} />
    </AuthFrame>
  )
}
