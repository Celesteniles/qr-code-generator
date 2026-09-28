import { getCloudflareContext } from '@opennextjs/cloudflare'
import { UUID_RE } from '@/server/checkout'

// Adresse de retour donnée à pawaPay (cf. billing-actions.ts). pawaPay refuse le
// nom « localhost » : en local, il renvoie vers 127.0.0.1, où la session n'existe
// pas. Cette route publique, sans rien lire, renvoie donc vers la page de suivi
// du paiement sur l'adresse officielle du site (BETTER_AUTH_URL).

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params
  const base = getCloudflareContext().env.BETTER_AUTH_URL.replace(/\/+$/, '')
  const target = UUID_RE.test(id) ? `/compte/facturation/paiement/${id}` : '/compte/facturation'
  return new Response(null, { status: 303, headers: { location: `${base}${target}`, 'cache-control': 'no-store' } })
}
