import 'server-only'

// Cloudflare Turnstile (anti-robots) à l'inscription et à la connexion.
//
// Activé seulement si les DEUX clés sont posées sur le Worker :
//   TURNSTILE_SITE_KEY    — clé publique (wrangler secret put TURNSTILE_SITE_KEY :
//                           publique, mais un secret évite une var par environnement)
//   TURNSTILE_SECRET_KEY  — clé secrète (wrangler secret put TURNSTILE_SECRET_KEY)
// Ajouter --env production pour qrcode.cg. Le widget (hostnames beta.qrcode.cg et
// qrcode.cg) se crée dans le tableau de bord Cloudflare, rubrique Turnstile.
// Sans elles : pas de plugin captcha côté Better Auth, pas de widget côté
// formulaire, l'inscription marche comme avant (la bêta n'est pas cassée tant que
// le widget n'est pas créé). Les deux décisions lisent cette même fonction : le
// serveur n'exige jamais un jeton que le formulaire ne sait pas produire.

export interface TurnstileKeys {
  siteKey: string
  secretKey: string
}

export function turnstileKeys(env: CloudflareEnv): TurnstileKeys | null {
  const siteKey = env.TURNSTILE_SITE_KEY?.trim()
  const secretKey = env.TURNSTILE_SECRET_KEY?.trim()
  return siteKey && secretKey ? { siteKey, secretKey } : null
}
