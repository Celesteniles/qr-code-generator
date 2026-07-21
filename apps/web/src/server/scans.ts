import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Lecture des scans depuis Analytics Engine via l'API SQL.
//
// Analytics Engine n'a pas de binding de lecture : on interroge l'API SQL du compte
// avec un jeton API (Account Analytics: Read). Le routeur écrit les scans avec
// index1 = slug et double1 = 1 ; sum(_sample_interval) restitue le total réel
// en corrigeant l'échantillonnage.
//
// Dégradation douce : sans jeton, ou en cas d'erreur, on renvoie {} — le dashboard
// s'affiche sans les chiffres. Les stats ne doivent jamais casser la page.

const DATASET = 'link_scans'

export async function getScanCounts(): Promise<Record<string, number>> {
  const { env } = getCloudflareContext()
  const token = env.CF_ANALYTICS_TOKEN
  const account = env.CF_ACCOUNT_ID
  if (!token || !account) return {}

  const sql =
    `SELECT index1 AS slug, sum(_sample_interval) AS scans ` +
    `FROM ${DATASET} WHERE timestamp > NOW() - INTERVAL '30' DAY ` +
    `GROUP BY slug`

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`,
      { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: sql },
    )
    if (!res.ok) {
      console.error('[scans] API erreur', res.status)
      return {}
    }
    const json = (await res.json()) as { data?: { slug: string; scans: number }[] }
    const out: Record<string, number> = {}
    for (const row of json.data ?? []) out[row.slug] = Number(row.scans) || 0
    return out
  } catch (e) {
    console.error('[scans] échec de la requête', e)
    return {}
  }
}
