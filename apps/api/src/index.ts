// API d'administration des liens — Worker Cloudflare.
//
// Sépare volontairement l'ÉCRITURE (ici, avec accès D1 + KV) de la LECTURE chaude
// (apps/router, KV seul). Le cœur métier vit dans @link/db ; ce Worker n'est que la
// coquille HTTP. Il pourra se replier dans apps/web quand celui-ci passera à un
// adaptateur Cloudflare avec bindings.
//
// Pas d'auth pour l'instant (lot suivant) — ne pas exposer publiquement en l'état.

import { drizzle } from 'drizzle-orm/d1'
import { schema, createLink } from '@link/db'
import { makeSafeBrowsingChecker } from './safebrowsing'

export interface Env {
  DB: D1Database
  LINKS: KVNamespace
  /** Clé Google Safe Browsing. Absente → vérification désactivée (voir safebrowsing.ts). */
  SAFE_BROWSING_KEY?: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/links') {
      return handleCreate(request, env)
    }
    return json({ error: 'not_found' }, 404)
  },
} satisfies ExportedHandler<Env>

async function handleCreate(request: Request, env: Env): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const db = drizzle(env.DB, { schema })
  const result = await createLink(
    { db, kv: env.LINKS, checkUrl: makeSafeBrowsingChecker(env.SAFE_BROWSING_KEY) },
    body,
  )

  if (result.ok) return json({ id: result.id, key: result.key }, 201)

  switch (result.error) {
    case 'invalid': return json({ error: 'invalid', issues: result.issues }, 422)
    case 'domain_not_found': return json({ error: 'domain_not_found' }, 404)
    case 'slug_taken': return json({ error: 'slug_taken' }, 409)
    case 'unsafe_url': return json({ error: 'unsafe_url', url: result.url }, 422)
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
