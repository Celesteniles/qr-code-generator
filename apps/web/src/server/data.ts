import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { drizzle } from 'drizzle-orm/d1'
import { schema, type Db, type KVWriter } from '@link/db'

// Accès aux bindings Cloudflare (D1, KV) depuis le code serveur du dashboard.
// Les types viennent de cloudflare-env.d.ts (généré par `wrangler types`).
// Le dashboard écrit directement via les bindings, sans passer par apps/api ni
// détenir le jeton d'admin.

export function getDb(): Db {
  const { env } = getCloudflareContext()
  return drizzle(env.DB, { schema }) as unknown as Db
}

export function getKv(): KVWriter {
  return getCloudflareContext().env.LINKS
}
