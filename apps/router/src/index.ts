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
  /** Site de link.cg : destination de la racine et des pages d'erreur. Défaut : https://qrcode.cg */
  HOME_URL?: string
}

const NO_STORE = 'no-store, no-cache, must-revalidate'

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const slug = url.pathname.replace(/^\/+/, '').split('/')[0]

    const home = (env.HOME_URL || 'https://qrcode.cg').replace(/\/+$/, '')

    // link.cg tout court : on va sur le site. Favicon : celui du site.
    if (!slug) return redirect(home)
    if (slug === 'favicon.ico') return redirect(`${home}/favicon.ico`)

    const key = linkKey(url.hostname, slug)
    const raw = await env.LINKS.get(key)
    if (raw === null) return notFound(home)

    let link: CompiledLink
    try {
      link = JSON.parse(raw) as CompiledLink
    } catch {
      return notFound(home)
    }

    const resolution = resolveLink(
      link,
      { userAgent: request.headers.get('user-agent') ?? '', cardBaseUrl: env.CARD_BASE_URL },
      Date.now(),
    )

    // L'enregistrement du scan part APRÈS la réponse, sans jamais la retarder.
    ctx.waitUntil(logScan(env, request, url, slug, resolution))

    return toResponse(resolution, home)
  },
} satisfies ExportedHandler<Env>

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { location, 'cache-control': NO_STORE } })
}

function toResponse(r: Resolution, home: string): Response {
  switch (r.kind) {
    case 'redirect':
      return redirect(r.url)
    case 'expired':
      return page(410, home, 'Ce lien a expiré', 'Il avait une date de fin, aujourd’hui passée. Demandez un nouveau lien à la personne qui vous l’a envoyé.')
    case 'inactive':
      return page(410, home, 'Ce lien n’est plus actif', 'Son propriétaire l’a mis en pause. Il fonctionnera de nouveau dès qu’il le réactivera.')
  }
}

function notFound(home: string): Response {
  return page(404, home, 'Ce lien n’existe pas', 'Vérifiez l’adresse : une lettre de trop ou de moins suffit. Si on vous l’a envoyée, demandez-la de nouveau.')
}

// Page d'erreur autonome (aucune ressource externe) : logo link.cg, message, lien
// vers le site. Aucune donnée de la requête n'y est reprise (pas d'injection possible).
const MARK = '<svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true"><circle cx="31" cy="34" r="25" fill="#0060ff"/>' +
  '<path d="M15 48 C 24 40, 33 28, 38 17 C 41 10, 35 7, 32 13 C 28 21, 28 36, 34 42 C 39 47, 47 41, 58.5 26.5" fill="none" stroke="#0060ff" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M15 48 C 24 40, 33 28, 38 17 C 41 10, 35 7, 32 13 C 28 21, 28 36, 34 42 C 39 47, 47 41, 58.5 26.5" fill="none" stroke="#fff" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'

function page(status: number, home: string, title: string, text: string): Response {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${title} · link.cg</title><link rel="icon" href="${home}/favicon.ico">
<style>
:root{--bg:#efe9df;--card:#fff;--ink:#16161d;--muted:#4f4c44;--line:#dcd4c6}
@media (prefers-color-scheme:dark){:root{--bg:#0e0e11;--card:#1a1a1f;--ink:#f4f2ec;--muted:#bdb9ae;--line:#34343d}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px 16px;background:var(--bg);color:var(--ink);
font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{width:100%;max-width:420px;background:var(--card);border-radius:28px;padding:32px 28px;box-shadow:inset 0 0 0 1px var(--line);text-align:center}
h1{font-size:26px;line-height:1.15;letter-spacing:-.02em;margin:18px 0 8px}p{margin:0;color:var(--muted)}
a.btn{display:inline-flex;align-items:center;justify-content:center;margin-top:24px;height:50px;padding:0 24px;border-radius:999px;background:var(--ink);color:var(--bg);font-weight:600;text-decoration:none}
.foot{margin-top:18px;font-size:13px}
</style></head><body><main>${MARK}<h1>${title}</h1><p>${text}</p>
<a class="btn" href="${home}">Aller sur link.cg</a>
<p class="foot">Liens courts et QR codes, par NS Creative.</p></main></body></html>`
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': NO_STORE },
  })
}

// Colonnes de link_scans (l'ordre ne doit jamais changer : les requêtes du
// dashboard lisent blobN par position) :
//   blob1 slug · blob2 résultat · blob3 pays · blob4 user-agent · blob5 referer
//   blob6 ville · blob7 canal ('qr' = scan d'un QR, adresse suivie de « ?q » ;
//   'link' = clic). Les lignes antérieures ont blob6/blob7 vides.
// Les robots (aperçus de lien…) sont enregistrés tels quels et écartés à la
// lecture (humanVisitSql de @link/shared) : la donnée brute reste complète.
async function logScan(env: Env, request: Request, url: URL, slug: string, r: Resolution): Promise<void> {
  if (!env.SCANS) return
  const cf = (request as unknown as { cf?: IncomingRequestCfProperties }).cf
  env.SCANS.writeDataPoint({
    blobs: [
      slug,
      r.kind,
      cf?.country ?? 'XX',
      request.headers.get('user-agent') ?? '',
      request.headers.get('referer') ?? '',
      cf?.city ?? '',
      url.searchParams.has('q') ? 'qr' : 'link',
    ],
    doubles: [1],
    indexes: [slug],
  })
}
