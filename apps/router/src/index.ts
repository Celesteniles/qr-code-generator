// Worker de redirection — link.cg (et domaines personnalisés via Cloudflare for SaaS).
//
// Contraintes non négociables (voir docs/ARCHITECTURE.md §3) :
//  1. La lecture ne touche jamais D1 — uniquement KV, répliqué en périphérie.
//  2. L'analytique passe par ctx.waitUntil : elle ne bloque jamais la redirection.
//  3. Toujours 302 + no-store : un 301 mis en cache figerait la destination.

import {
  resolveLink, linkKey,
  type CompiledLink, type Resolution,
} from '@link/shared'

export interface Env {
  /** KV : clé `${hostname}:${slug}` → CompiledLink JSON. */
  LINKS: KVNamespace
  /** Analytics Engine (optionnel — la redirection marche même sans). */
  SCANS?: AnalyticsEngineDataset
  /** Base des pages de carte de visite. */
  CARD_BASE_URL: string
}

const NO_STORE = 'no-store, no-cache, must-revalidate'

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const slug = url.pathname.replace(/^\/+/, '').split('/')[0]

    // Racine et favicon : rien à rediriger.
    if (!slug || slug === 'favicon.ico') {
      return new Response('link.cg', { status: 200, headers: { 'cache-control': NO_STORE } })
    }

    const key = linkKey(url.hostname, slug)
    const raw = await env.LINKS.get(key)
    if (raw === null) return notFound()

    let link: CompiledLink
    try {
      link = JSON.parse(raw) as CompiledLink
    } catch {
      return notFound()
    }

    const resolution = resolveLink(
      link,
      { userAgent: request.headers.get('user-agent') ?? '', cardBaseUrl: env.CARD_BASE_URL },
      Date.now(),
    )

    // L'enregistrement du scan part APRÈS la réponse, sans jamais la retarder.
    ctx.waitUntil(logScan(env, request, slug, resolution))

    return toResponse(resolution)
  },
} satisfies ExportedHandler<Env>

function toResponse(r: Resolution): Response {
  switch (r.kind) {
    case 'redirect':
      return new Response(null, {
        status: 302,
        headers: { location: r.url, 'cache-control': NO_STORE },
      })
    case 'expired':
      return new Response('Ce lien a expiré.', {
        status: 410,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': NO_STORE },
      })
    case 'inactive':
      return new Response('Ce lien est désactivé.', {
        status: 410,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': NO_STORE },
      })
  }
}

function notFound(): Response {
  return new Response('Lien introuvable.', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': NO_STORE },
  })
}

async function logScan(env: Env, request: Request, slug: string, r: Resolution): Promise<void> {
  if (!env.SCANS) return
  const cf = (request as unknown as { cf?: IncomingRequestCfProperties }).cf
  env.SCANS.writeDataPoint({
    blobs: [
      slug,
      r.kind,
      cf?.country ?? 'XX',
      request.headers.get('user-agent') ?? '',
      request.headers.get('referer') ?? '',
    ],
    doubles: [1],
    indexes: [slug],
  })
}
