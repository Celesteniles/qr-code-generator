import { UUID_RE, reconcileCheckout } from '@/server/checkout'

// Callback des dépôts pawaPay (URL à déclarer dans le tableau de bord pawaPay :
// https://<domaine>/api/pawapay/callback). Le corps ne sert qu'à connaître le
// depositId : le statut est relu chez pawaPay (reconcileCheckout), un callback
// forgé ne peut donc rien débloquer. Toujours 200, sauf si la relecture a échoué
// (pawaPay renverra alors le callback).

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { depositId?: unknown } | null
  const id = typeof body?.depositId === 'string' ? body.depositId : ''
  if (!UUID_RE.test(id)) return new Response(null, { status: 200 })
  const res = await reconcileCheckout(id)
  // Tentative inconnue : pas pour nous (ou déjà purgée) — rien à renvoyer.
  if (!res) return new Response(null, { status: 200 })
  return new Response(null, { status: res.checkout.status === 'pending' ? 503 : 200 })
}
