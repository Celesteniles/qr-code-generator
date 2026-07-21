// Secrets Cloudflare non connus de `wrangler types` (qui ne lit que wrangler.jsonc).
// Déclaration-fusion avec l'interface globale CloudflareEnv générée.
interface CloudflareEnv {
  /** Secret Better Auth. Posé via `wrangler secret put BETTER_AUTH_SECRET`. */
  BETTER_AUTH_SECRET: string
  /** Jeton API "Account Analytics: Read" pour lire les scans. Optionnel (stats désactivées sans lui). */
  CF_ANALYTICS_TOKEN?: string
}
