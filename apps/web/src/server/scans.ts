import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { humanVisitSql } from '@link/shared'
import type { DailyPoint } from './config'
import {
  buildLinkInsights,
  buildWorkspaceInsights,
  type KeyRow,
  type LinkInsights,
  type MomentRow,
  type WorkspaceInsights,
} from './insights'

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

// Robots exclus partout : aperçus de lien (WhatsApp, Facebook, Telegram…), moteurs,
// scripts. Condition partagée avec le routeur (@link/shared).
const HUMAN = humanVisitSql('blob4')

// Mémoire courte des statistiques : Analytics Engine n'est mis à jour qu'à la
// minute, inutile de l'interroger à chaque affichage. On ne garde que des
// RÉSULTATS réussis (jamais une requête en cours : sur Workers, une promesse d'E/S
// ne peut pas être partagée entre deux requêtes) ; un échec n'est pas mémorisé.
const TTL_MS = 60_000
const MAX_ENTRIES = 200
const memo = new Map<string, { at: number; value: unknown }>()

async function remember<T>(key: string, load: () => Promise<T | null>, fallback: T): Promise<T> {
  const hit = memo.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T
  const value = await load()
  if (value === null) return fallback
  if (memo.size >= MAX_ENTRIES) memo.delete(memo.keys().next().value!)
  memo.set(key, { at: Date.now(), value })
  return value
}

async function loadScanCounts(): Promise<Record<string, number> | null> {
  const { env } = getCloudflareContext()
  const token = env.CF_ANALYTICS_TOKEN
  const account = env.CF_ACCOUNT_ID
  if (!token || !account) return {}

  const sql =
    `SELECT index1 AS slug, sum(_sample_interval) AS scans ` +
    `FROM ${DATASET} WHERE timestamp > NOW() - INTERVAL '30' DAY ` +
    `AND ${HUMAN} ` +
    `GROUP BY slug`

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`,
      { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: sql },
    )
    if (!res.ok) {
      console.error('[scans] API erreur', res.status)
      return null
    }
    const json = (await res.json()) as { data?: { slug: string; scans: number }[] }
    const out: Record<string, number> = {}
    for (const row of json.data ?? []) out[row.slug] = Number(row.scans) || 0
    return out
  } catch (e) {
    console.error('[scans] échec de la requête', e)
    return null
  }
}

/** Visites 30 j par adresse (toutes adresses), mémorisées 60 s. */
export async function getScanCounts(): Promise<Record<string, number>> {
  return remember('counts', loadScanCounts, {})
}

/**
 * Visites par jour, cumulées sur les adresses données, sur `days` jours (le plus
 * ancien d'abord, jours sans visite inclus à 0). Même dégradation douce : [] si
 * les statistiques sont indisponibles. Contrat de la refonte D (agent backend).
 */
async function loadDailyVisits(safe: string[], n: number): Promise<DailyPoint[] | null> {
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
    `AND ${HUMAN} ` +
    `GROUP BY day ORDER BY day`

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`,
      { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: sql },
    )
    if (!res.ok) {
      console.error('[scans] API erreur (jours)', res.status)
      return null
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
    return null
  }
}

/**
 * Visites par jour, cumulées sur les adresses données, sur `days` jours (le plus
 * ancien d'abord, jours sans visite inclus à 0), mémorisées 60 s. Dégradation
 * douce : [] si les statistiques sont indisponibles.
 */
export async function getDailyVisits(slugs: string[], days = 30): Promise<DailyPoint[]> {
  const safe = safeSlugs(slugs)
  const n = clampDays(days)
  if (!safe.length) return []
  return remember(`daily:${n}:${safe.join(',')}`, () => loadDailyVisits(safe, n), [])
}

// Les slugs sont injectés dans le SQL (l'API n'a pas de paramètres liés) : on ne
// garde que ceux conformes au format des slugs, donc sans guillemet possible.
function safeSlugs(slugs: string[]): string[] {
  return [...new Set(slugs.filter((s) => /^[a-zA-Z0-9_-]{1,64}$/.test(s)))].sort()
}
function clampDays(days: number): number {
  return Math.max(1, Math.min(90, Math.floor(days) || 30))
}

// ── Statistiques détaillées ──────────────────────────────────────────────────

/** Exécute une requête SQL Analytics Engine ; null en cas d'échec. */
async function runSql<T>(account: string, token: string, sql: string, what: string): Promise<T[] | null> {
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`,
      { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: sql },
    )
    if (!res.ok) {
      console.error(`[scans] API erreur (${what})`, res.status)
      return null
    }
    const json = (await res.json()) as { data?: T[] }
    return json.data ?? []
  } catch (e) {
    console.error(`[scans] échec de la requête (${what})`, e)
    return null
  }
}

/** WHERE commun : adresses, période, robots exclus. */
function insightsWhere(safe: string[], n: number): string {
  const slugs = safe.length === 1 ? `index1 = '${safe[0]}'` : `index1 IN (${safe.map((s) => `'${s}'`).join(', ')})`
  return `${slugs} AND timestamp > NOW() - INTERVAL '${n}' DAY AND ${HUMAN}`
}

/** Top des valeurs d'une colonne (clé k, visites v). */
function topSql(column: string, where: string, limit?: number, extra = ''): string {
  return (
    `SELECT ${column} AS k, sum(_sample_interval) AS v FROM ${DATASET} ` +
    `WHERE ${where}${extra} GROUP BY k ORDER BY v DESC` +
    (limit ? ` LIMIT ${limit}` : '')
  )
}

/** Requêtes des statistiques détaillées (exportées pour relecture). */
export function insightsQueries(safe: string[], n: number) {
  const where = insightsWhere(safe, n)
  return {
    // blob3 = pays (ISO-2, 'XX' si inconnu)
    countries: topSql('blob3', where, 12),
    // blob6 = ville ('' si inconnue ou ligne ancienne)
    cities: topSql('blob6', where, 8, ` AND blob6 != ''`),
    // blob4 = user-agent, analysé côté serveur (describeVisitor)
    userAgents: topSql('blob4', where, 300),
    // blob5 = referer
    sources: topSql('blob5', where, 100),
    // blob7 = canal 'qr' | 'link' ('' avant la distinction) ; couvre toutes les visites → total
    channel: topSql('blob7', where),
    // jour de la semaine × heure, en UTC (converti en heure de Brazzaville en TypeScript)
    moments:
      `SELECT toDayOfWeek(timestamp) AS d, toHour(timestamp) AS h, sum(_sample_interval) AS v ` +
      `FROM ${DATASET} WHERE ${where} GROUP BY d, h`,
  }
}

type Creds = { account: string; token: string }
function credentials(): Creds | null {
  const { env } = getCloudflareContext()
  const token = env.CF_ANALYTICS_TOKEN
  const account = env.CF_ACCOUNT_ID
  return token && account ? { account, token } : null
}

async function loadLinkInsights(safe: string[], n: number): Promise<LinkInsights | null> {
  const creds = credentials()
  if (!creds) return null
  const q = insightsQueries(safe, n)
  const run = <T>(sql: string, what: string) => runSql<T>(creds.account, creds.token, sql, what)
  const [countries, cities, userAgents, sources, channel, moments] = await Promise.all([
    run<KeyRow>(q.countries, 'pays'),
    run<KeyRow>(q.cities, 'villes'),
    run<KeyRow>(q.userAgents, 'appareils'),
    run<KeyRow>(q.sources, 'provenance'),
    run<KeyRow>(q.channel, 'canal'),
    run<MomentRow>(q.moments, 'moments'),
  ])
  if (!countries || !cities || !userAgents || !sources || !channel || !moments) return null
  return buildLinkInsights({ countries, cities, userAgents, sources, channel, moments }, n)
}

/**
 * Statistiques détaillées d'une adresse sur `days` jours (robots exclus),
 * mémorisées 60 s. null si les statistiques sont indisponibles.
 */
export async function getLinkInsights(slug: string, days = 30): Promise<LinkInsights | null> {
  const safe = safeSlugs([slug])
  const n = clampDays(days)
  if (!safe.length) return null
  return remember<LinkInsights | null>(`insights:${n}:${safe[0]}`, () => loadLinkInsights(safe, n), null)
}

async function loadWorkspaceInsights(safe: string[], n: number): Promise<WorkspaceInsights | null> {
  const creds = credentials()
  if (!creds) return null
  const q = insightsQueries(safe, n)
  const run = (sql: string, what: string) => runSql<KeyRow>(creds.account, creds.token, sql, what)
  const [countries, userAgents, channel] = await Promise.all([
    run(q.countries, 'pays, espace'),
    run(q.userAgents, 'appareils, espace'),
    run(q.channel, 'canal, espace'),
  ])
  if (!countries || !userAgents || !channel) return null
  return buildWorkspaceInsights({ countries, userAgents, channel }, n)
}

/**
 * Vue d'ensemble des visiteurs de plusieurs adresses (accueil) : pays principal,
 * part mobile, système principal, part des scans de QR. Mémorisée 60 s ; null si
 * indisponible.
 */
export async function getWorkspaceInsights(slugs: string[], days = 30): Promise<WorkspaceInsights | null> {
  const safe = safeSlugs(slugs)
  const n = clampDays(days)
  if (!safe.length) return null
  return remember<WorkspaceInsights | null>(`ws-insights:${n}:${safe.join(',')}`, () => loadWorkspaceInsights(safe, n), null)
}
