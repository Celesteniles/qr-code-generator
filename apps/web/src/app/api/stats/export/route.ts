import { PLANS, clampDays, statsExportCsv, statsExportFilename, type ExportLink } from '@link/shared'
import { getWorkspacePlan } from '@/server/billing'
import { getSessionContext } from '@/server/session'
import { getWorkspaceLinks } from '@/server/links'
import { getDailyLinkVisits } from '@/server/scans'
import { describeRule, shortUrl } from '@/components/liens/model'

// Export CSV des statistiques (paliers avec `statsExport` : Business, Entreprise).
//
//   GET /api/stats/export            tous les liens de l'espace, 30 jours
//   GET /api/stats/export?jours=90   période de 1 à 90 jours (rétention d'Analytics Engine)
//   GET /api/stats/export?lien=<id>  un seul lien de l'espace
//
// Anti-IDOR : les liens viennent TOUJOURS de l'espace de la session ; `lien` ne
// fait que filtrer cette liste (un id d'un autre espace donne 404). Réponses
// d'erreur en texte clair : le bouton est un simple lien de téléchargement, le
// message s'affiche tel quel dans le navigateur.

export const dynamic = 'force-dynamic'

const KIND_LABELS = { static: 'Lien court', app: 'Lien · App', card: 'Carte de visite' } as const

function text(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export async function GET(request: Request): Promise<Response> {
  const ctx = await getSessionContext()
  if (!ctx) return text(401, 'Connectez-vous pour exporter vos statistiques.')

  const plan = await getWorkspacePlan(ctx.workspaceId)
  if (!plan.statsExport) {
    return text(403, `L’export des statistiques est réservé aux offres ${PLANS.business.label} et ${PLANS.enterprise.label}. Votre offre actuelle : ${plan.label}. Voir les offres : /offres`)
  }

  const params = new URL(request.url).searchParams
  const days = clampDays(Number(params.get('jours') ?? 30))
  const only = params.get('lien')

  const all = await getWorkspaceLinks(ctx.workspaceId)
  const links = only ? all.filter((l) => l.id === only) : all
  if (only && !links.length) return text(404, 'Lien introuvable.')

  const read = await getDailyLinkVisits(links, days)
  if (!read.ok) {
    return read.reason === 'config'
      ? text(503, 'Les statistiques ne sont pas encore disponibles sur ce service : l’export est impossible pour le moment.')
      : text(502, 'Les statistiques n’ont pas pu être lues. Réessayez dans quelques minutes.')
  }

  const described: ExportLink[] = links.map((l) => ({
    slug: l.slug,
    shortUrl: shortUrl(l.slug),
    type: KIND_LABELS[l.kind],
    // Adresse complète pour un lien simple : plus utile qu'une version abrégée dans un tableur.
    destination: l.rule.type === 'static' ? l.rule.url : describeRule(l.rule),
  }))
  const today = new Date().toISOString().slice(0, 10)
  const file = statsExportFilename(today, days, only ? links[0]!.slug : undefined)

  return new Response(statsExportCsv(described, read.rows), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${file}"`,
      'cache-control': 'no-store',
    },
  })
}
