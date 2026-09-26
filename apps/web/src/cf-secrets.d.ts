// Secrets Cloudflare non connus de `wrangler types` (qui ne lit que wrangler.jsonc).
// Déclaration-fusion avec l'interface globale CloudflareEnv générée.
interface CloudflareEnv {
  /** Secret Better Auth. Posé via `wrangler secret put BETTER_AUTH_SECRET`. */
  BETTER_AUTH_SECRET: string
  /** Jeton API "Account Analytics: Read" pour lire les scans. Optionnel (stats désactivées sans lui). */
  CF_ANALYTICS_TOKEN?: string
  /** Clé API Google Safe Browsing. Optionnelle : sans elle, les URLs ne sont pas vérifiées (log d'avertissement). */
  SAFE_BROWSING_KEY?: string
  /** Clé secrète Turnstile. Avec TURNSTILE_SITE_KEY, active le captcha (cf. server/turnstile.ts). */
  TURNSTILE_SECRET_KEY?: string
  /**
   * Clé publique Turnstile. Sans elle, ni captcha ni widget. Publique, mais posée
   * comme secret (pas de var par environnement à maintenir). Si elle passe un jour
   * dans les vars de wrangler.jsonc, retirer cette ligne (`wrangler types` la typera).
   */
  TURNSTILE_SITE_KEY?: string
}
