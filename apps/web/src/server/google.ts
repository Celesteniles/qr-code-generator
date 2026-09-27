import 'server-only'

// Connexion avec Google (OAuth), par Better Auth. Gratuit côté Google.
//
// Activée seulement si les DEUX secrets sont posés sur le Worker :
//   GOOGLE_CLIENT_ID      (wrangler secret put GOOGLE_CLIENT_ID)
//   GOOGLE_CLIENT_SECRET  (wrangler secret put GOOGLE_CLIENT_SECRET)
// Identifiant OAuth « Application Web » créé dans Google Cloud Console, avec pour
// URI de redirection autorisée : https://<hôte>/api/auth/callback/google (bêta et
// production). Sans les secrets : pas de fournisseur côté serveur, pas de bouton
// côté formulaire — les deux décisions lisent cette même fonction.

export interface GoogleKeys {
  clientId: string
  clientSecret: string
}

export function googleKeys(env: CloudflareEnv): GoogleKeys | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim()
  return clientId && clientSecret ? { clientId, clientSecret } : null
}
