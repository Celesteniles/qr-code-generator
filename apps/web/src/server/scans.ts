import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  clampDays,
  dailyLinkVisitsSql,
  dailyVisitsSql,
  insightsQueries,
  safeStatsLinks,
  scanCountsSql,
  statsKey,
  type DailyLinkRow,
  type StatsLink,
} from '@link/shared'
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
//
// Chaque lecture reçoit les liens (slug + createdAt) et ne compte que les visites
// postérieures à la création du lien actuel : une adresse reprise après
// suppression n'hérite pas des visites de l'ancien propriétaire. Le SQL est
// construit dans @link/shared (stats-sql.ts, testé).

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

async function loadScanCounts(safe: StatsLink[]): Promise<Record<string, number> | null> {
  const creds = credentials()
  if (!creds) return {}
  const rows = await runSql<{ slug: string; scans: number }>(creds.account, creds.token, scanCountsSql(safe), 'compteurs')
  if (!rows) return null
  // Toutes les adresses demandées ont une entrée (0 sans visite) : un objet non
  // vide signale que les statistiques sont disponibles.
  const out: Record<string, number> = Object.fromEntries(safe.map((l) => [l.slug, 0]))
  for (const row of rows) if (Object.hasOwn(out, row.slug)) out[row.slug] = Number(row.scans) || 0
  return out
}

/**
 * Visites 30 j par adresse des liens donnés (chacune comptée depuis la création
 * de son lien), mémorisées 60 s. {} si les statistiques sont indisponibles.
 */
export async function getScanCounts(links: StatsLink[]): Promise<Record<string, number>> {
  const safe = safeStatsLinks(links)
  if (!safe.length) return {}
  return remember(`counts:${statsKey(safe)}`, () => loadScanCounts(safe), {})
}

/**
 * Visites par jour, cumulées sur les adresses données, sur `days` jours (le plus
 * ancien d'abord, jours sans visite inclus à 0). Même dégradation douce : [] si
 * les statistiques sont indisponibles. Contrat de la refonte D (agent backend).
 */
async function loadDailyVisits(safe: StatsLink[], n: number): Promise<DailyPoint[] | null> {
  const creds = credentials()
  if (!creds) return []

  // Série complète en UTC, du plus ancien au plus récent (aujourd'hui inclus).
  const today = new Date()
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - (n - 1) * 86_400_000
  const series = Array.from({ length: n }, (_, i) => new Date(start + i * 86_400_000).toISOString().slice(0, 10))

  const rows = await runSql<{ day: string; visits: number }>(creds.account, creds.token, dailyVisitsSql(safe, series[0]!), 'jours')
  if (!rows) return null
  // `day` arrive sous la forme « AAAA-MM-JJ HH:MM:SS » : les 10 premiers caractères suffisent.
  const byDay = new Map<string, number>()
  for (const row of rows) {
    const key = String(row.day).slice(0, 10)
    byDay.set(key, (byDay.get(key) ?? 0) + (Number(row.visits) || 0))
  }
  return series.map((day) => ({ day, visits: byDay.get(day) ?? 0 }))
}

/**
 * Visites par jour, cumulées sur les adresses données, sur `days` jours (le plus
 * ancien d'abord, jours sans visite inclus à 0), mémorisées 60 s. Dégradation
 * douce : [] si les statistiques sont indisponibles.
 */
export async function getDailyVisits(links: StatsLink[], days = 30): Promise<DailyPoint[]> {
  const safe = safeStatsLinks(links)
  const n = clampDays(days)
  if (!safe.length) return []
  return remember(`daily:${n}:${statsKey(safe)}`, () => loadDailyVisits(safe, n), [])
}

// ── Export CSV ───────────────────────────────────────────────────────────────

export type ExportRead =
  | { ok: true; rows: DailyLinkRow[] }
  /** config : jeton Analytics absent ; erreur : l'API SQL a échoué. */
  | { ok: false; reason: 'config' | 'erreur' }

/**
 * Visites par adresse, par jour (UTC) et par canal sur `days` jours, aujourd'hui
 * compris, pour l'export CSV. Pas de mémoïsation (lecture rare, à la demande),
 * et pas de dégradation muette : l'appelant distingue « non configuré » d'une
 * panne pour répondre clairement. `links` doit être borné à l'espace connecté.
 */
export async function getDailyLinkVisits(links: StatsLink[], days = 30): Promise<ExportRead> {
  const creds = credentials()
  if (!creds) return { ok: false, reason: 'config' }
  const safe = safeStatsLinks(links)
  if (!safe.length) return { ok: true, rows: [] }
  const n = clampDays(days)
  const today = new Date()
  const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - (n - 1) * 86_400_000)
  const rows = await runSql<DailyLinkRow>(creds.account, creds.token, dailyLinkVisitsSql(safe, first.toISOString().slice(0, 10)), 'export')
  return rows ? { ok: true, rows } : { ok: false, reason: 'erreur' }
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

type Creds = { account: string; token: string }
function credentials(): Creds | null {
  const { env } = getCloudflareContext()
  const token = env.CF_ANALYTICS_TOKEN
  const account = env.CF_ACCOUNT_ID
  return token && account ? { account, token } : null
}

async function loadLinkInsights(safe: StatsLink[], n: number): Promise<LinkInsights | null> {
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
export async function getLinkInsights(link: StatsLink, days = 30): Promise<LinkInsights | null> {
  const safe = safeStatsLinks([link])
  const n = clampDays(days)
  if (!safe.length) return null
  return remember<LinkInsights | null>(`insights:${n}:${statsKey(safe)}`, () => loadLinkInsights(safe, n), null)
}

async function loadWorkspaceInsights(safe: StatsLink[], n: number): Promise<WorkspaceInsights | null> {
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
export async function getWorkspaceInsights(links: StatsLink[], days = 30): Promise<WorkspaceInsights | null> {
  const safe = safeStatsLinks(links)
  const n = clampDays(days)
  if (!safe.length) return null
  return remember<WorkspaceInsights | null>(`ws-insights:${n}:${statsKey(safe)}`, () => loadWorkspaceInsights(safe, n), null)
}
