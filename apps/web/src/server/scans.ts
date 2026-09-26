import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { DailyPoint } from './config'

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

/**
 * Visites par jour, cumulées sur les adresses données, sur `days` jours (le plus
 * ancien d'abord, jours sans visite inclus à 0). Même dégradation douce : [] si
 * les statistiques sont indisponibles. Contrat de la refonte D (agent backend).
 */
export async function getDailyVisits(slugs: string[], days = 30): Promise<DailyPoint[]> {
  // Les slugs sont injectés dans le SQL (l'API n'a pas de paramètres liés) : on
  // ne garde que ceux conformes au format des slugs, donc sans guillemet possible.
  const safe = [...new Set(slugs.filter((s) => /^[a-zA-Z0-9_-]{1,64}$/.test(s)))]
  const n = Math.max(1, Math.min(90, Math.floor(days) || 30))
  if (!safe.length) return []

  const { env } = getCloudflareContext()
  const token = env.CF_ANALYTICS_TOKEN
  const account = env.CF_ACCOUNT_ID
  if (!token || !account) return []

  // Série complète en UTC, du plus ancien au plus récent (aujourd'hui inclus).
  const today = new Date()
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - (n - 1) * 86_400_000
  const series = Array.from({ length: n }, (_, i) => new Date(start + i * 86_400_000).toISOString().slice(0, 10))

  const sql =
    `SELECT toStartOfDay(timestamp) AS day, sum(_sample_interval) AS visits ` +
    `FROM ${DATASET} WHERE timestamp >= toDateTime('${series[0]} 00:00:00') ` +
    `AND index1 IN (${safe.map((s) => `'${s}'`).join(', ')}) ` +
    `GROUP BY day ORDER BY day`

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`,
      { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: sql },
    )
    if (!res.ok) {
      console.error('[scans] API erreur (jours)', res.status)
      return []
    }
    const json = (await res.json()) as { data?: { day: string; visits: number }[] }
    // `day` arrive sous la forme « AAAA-MM-JJ HH:MM:SS » : les 10 premiers caractères suffisent.
    const byDay = new Map<string, number>()
    for (const row of json.data ?? []) {
      const key = String(row.day).slice(0, 10)
      byDay.set(key, (byDay.get(key) ?? 0) + (Number(row.visits) || 0))
    }
    return series.map((day) => ({ day, visits: byDay.get(day) ?? 0 }))
  } catch (e) {
    console.error('[scans] échec de la requête (jours)', e)
    return []
  }
}
