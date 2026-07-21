import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Config OpenNext par défaut : suffisante pour un dashboard SSR + server actions.
// Cache incrémental / tags à configurer plus tard si besoin (KV/R2).
export default defineCloudflareConfig()
