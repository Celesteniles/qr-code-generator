// Secrets Cloudflare non connus de `wrangler types` (qui ne lit que wrangler.jsonc).
// Déclaration-fusion avec l'interface globale CloudflareEnv générée.
interface CloudflareEnv {
  /** Secret Better Auth. Posé via `wrangler secret put BETTER_AUTH_SECRET`. */
  BETTER_AUTH_SECRET: string
  /** Jeton API "Account Analytics: Read" pour lire les scans. Optionnel (stats désactivées sans lui). */
  CF_ANALYTICS_TOKEN?: string
  /** Clé API Google Safe Browsing. Optionnelle : sans elle, les URLs ne sont pas vérifiées (log d'avertissement). */
  SAFE_BROWSING_KEY?: string
  /** Clé API Google Web Risk (usage commercial). Prioritaire sur SAFE_BROWSING_KEY (cf. server/safebrowsing.ts). */
  WEB_RISK_KEY?: string
  /** Clé secrète Turnstile. Avec TURNSTILE_SITE_KEY, active le captcha (cf. server/turnstile.ts). */
  TURNSTILE_SECRET_KEY?: string
  /**
   * Clé publique Turnstile. Sans elle, ni captcha ni widget. Publique, mais posée
   * comme secret (pas de var par environnement à maintenir). Si elle passe un jour
   * dans les vars de wrangler.jsonc, retirer cette ligne (`wrangler types` la typera).
   */
  TURNSTILE_SITE_KEY?: string
  /** Clé API Brevo (e-mails transactionnels, cf. server/email.ts). Sans elle, aucun e-mail ne part. */
  BREVO_API_KEY?: string
  /** Identifiant OAuth Google. Avec GOOGLE_CLIENT_SECRET, active « Continuer avec Google » (cf. server/google.ts). */
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  /**
   * Domaines personnalisés (Cloudflare for SaaS, cf. server/cf-saas.ts et
   * docs/DOMAINES.md). Les trois requis ; sans eux, la fonctionnalité est désactivée.
   * CF_ZONE_ID : identifiant de la zone link.cg (où les hostnames clients sont déclarés).
   */
  CF_ZONE_ID?: string
  /** Jeton API « Zone · SSL and Certificates · Edit », limité à la zone link.cg. */
  CF_SAAS_TOKEN?: string
  /** Cible du CNAME donnée aux clients (ex. domaines.link.cg). Publique ; secret ou var au choix. */
  CF_SAAS_CNAME_TARGET?: string
  /** Jeton API pawaPay (paiement mobile money, cf. server/pawapay.ts). Sans lui, pas de paiement en ligne. */
  PAWAPAY_API_TOKEN?: string
  /** "production" pour l'API réelle de pawaPay ; sinon sandbox. */
  PAWAPAY_ENV?: string
  /**
   * Adresses (séparées par des virgules) autorisées sur /interne/paiements
   * (anomalies de paiement). Absent ou vide : page fermée à tous.
   */
  BILLING_ADMIN_EMAILS?: string
}
