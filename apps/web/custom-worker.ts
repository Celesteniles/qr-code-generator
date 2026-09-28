// Point d'entrée du Worker (wrangler.jsonc → main) : le Worker généré par OpenNext
// pour les requêtes, plus un gestionnaire `scheduled` pour les Cron Triggers.
// Modèle documenté : https://opennext.js.org/cloudflare/howtos/custom-worker
//
// La tâche ne réimplémente rien : elle appelle la route /api/taches/facturation
// de l'app, en interne (handler.fetch, sans réseau), pour réutiliser le code
// serveur de Next (D1, Brevo, pawaPay) dans son contexte habituel. Le jeton à
// usage unique (src/lib/internal-task.ts) réserve cette route au Cron Trigger.

// `.open-next/worker.js` n'existe qu'après opennextjs-cloudflare build : @ts-ignore
// (et non @ts-expect-error, qui échouerait une fois le fichier généré).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as handler } from './.open-next/worker.js'
import { INTERNAL_TASK_HEADER, issueInternalTaskToken, revokeInternalTaskToken } from './src/lib/internal-task'

export default {
  // www.qrcode.cg → qrcode.cg, même chemin. Ici plutôt que dans next.config.ts :
  // la règle `/:path*` de Next renvoyait la racine vers « /:path* » littéral.
  fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    const url = new URL(request.url)
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4)
      return Response.redirect(url.toString(), 308)
    }
    return handler.fetch(request, env, ctx)
  },

  async scheduled(controller, env, ctx) {
    const token = issueInternalTaskToken()
    try {
      const url = `${env.BETTER_AUTH_URL.replace(/\/+$/, '')}/api/taches/facturation`
      const res: Response = await handler.fetch(
        new Request(url, { method: 'POST', headers: { [INTERNAL_TASK_HEADER]: token } }),
        env,
        ctx,
      )
      const body = await res.text()
      if (!res.ok) throw new Error(`tâche facturation (${controller.cron}) : HTTP ${res.status} ${body.slice(0, 300)}`)
    } finally {
      revokeInternalTaskToken(token)
    }
  },
} satisfies ExportedHandler<CloudflareEnv>
