// Construction des requêtes SQL de statistiques (Analytics Engine, jeu link_scans).
// Fonctions PURES, sans E/S : l'exécution vit dans apps/web/src/server/scans.ts.
//
// Sécurité : l'API SQL d'Analytics Engine n'a pas de paramètres liés, les valeurs
// sont donc injectées dans le texte. On n'y met que des slugs conformes au format
// (sans guillemet possible) et des dates formatées depuis des entiers validés.
//
// Réutilisation d'adresse : les visites sont rangées par slug (index1). Un slug
// libéré puis repris par un autre compte hériterait des visites de l'ancien lien.
// Chaque adresse est donc bornée à la date de création du lien ACTUEL
// (links.createdAt) : on ne compte que les visites qui lui appartiennent.
//
// Domaines personnalisés : un même slug peut exister sur link.cg et sur
// go.monresto.cg (deux espaces différents). Le routeur enregistre le hostname en
// blob8 ; un lien qui donne son `hostname` n'est compté que sur son domaine.
// Les lignes antérieures à blob8 (vide) sont toutes des visites de link.cg.

import { humanVisitSql } from './visitor'

export const SCANS_DATASET = 'link_scans'

// Robots exclus partout : aperçus de lien (WhatsApp, Facebook, Telegram…), moteurs,
// scripts. Condition partagée avec le routeur.
const HUMAN = humanVisitSql('blob4')

/** Lien dont on lit les statistiques : adresse + création (epoch ms). */
export interface StatsLink {
  slug: string
  createdAt: number
  /**
   * Domaine du lien (link.cg ou domaine personnalisé). Absent : visites de
   * l'adresse sur tous les domaines (ancien comportement, à éviter).
   */
  hostname?: string
}

/** Domaine partagé : ses visites anciennes n'ont pas de blob8. */
const SHARED_HOST = 'link.cg'
// Nom de domaine en minuscules (validé à l'ajout par @link/db) : sans guillemet possible.
const HOST_RE = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/

const SLUG_RE = /^[a-zA-Z0-9_-]{1,64}$/
// Bornes de vraisemblance des dates de création : de 2020 à 2100.
const MIN_MS = Date.UTC(2020, 0, 1)
const MAX_MS = Date.UTC(2100, 0, 1)

/**
 * Liens injectables dans le SQL : slug conforme, date de création vraisemblable.
 * Un lien sans date valide est écarté (pas de statistiques) plutôt que lu sans
 * borne : mieux vaut aucun chiffre que les visites d'un autre compte.
 * Dédoublonnés par slug (on garde la création la plus récente, la plus stricte)
 * et triés : l'ordre est stable pour la mémoïsation.
 */
export function safeStatsLinks(links: readonly StatsLink[]): StatsLink[] {
  // Clé : domaine + slug (le même slug sur deux domaines = deux adresses).
  const byKey = new Map<string, StatsLink>()
  for (const l of links) {
    if (typeof l.slug !== 'string' || !SLUG_RE.test(l.slug)) continue
    if (l.hostname !== undefined && (typeof l.hostname !== 'string' || !HOST_RE.test(l.hostname))) continue
    if (!Number.isFinite(l.createdAt)) continue
    const ms = Math.floor(l.createdAt)
    if (ms < MIN_MS || ms >= MAX_MS) continue
    const key = `${l.slug} ${l.hostname ?? ''}`
    const prev = byKey.get(key)
    byKey.set(key, {
      slug: l.slug,
      createdAt: Math.max(prev?.createdAt ?? 0, ms),
      ...(l.hostname !== undefined ? { hostname: l.hostname } : {}),
    })
  }
  return [...byKey.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, l]) => l)
}

/** Clé de mémoïsation : slug, domaine et création, pour qu'une adresse reprise ne relise pas l'ancien résultat. */
export function statsKey(links: readonly StatsLink[]): string {
  return links.map((l) => `${l.slug}${l.hostname ? `/${l.hostname}` : ''}@${l.createdAt}`).join(',')
}

/** Condition sur le domaine (blob8), vide si le lien ne donne pas son domaine. */
function hostSql(hostname: string | undefined): string {
  if (hostname === undefined) return ''
  if (!HOST_RE.test(hostname)) throw new Error(`domaine invalide : ${hostname}`)
  return hostname === SHARED_HOST
    ? ` AND blob8 IN ('', '${SHARED_HOST}')`
    : ` AND blob8 = '${hostname}'`
}

/** Date SQL « AAAA-MM-JJ HH:MM:SS » (UTC, à la seconde) depuis un epoch ms entier. */
export function sqlDateTime(ms: number): string {
  if (!Number.isInteger(ms) || ms < MIN_MS || ms >= MAX_MS) throw new Error(`date invalide : ${ms}`)
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * Condition « visites des liens actuels » : pour chaque adresse, index1 = slug ET
 * visite postérieure à la création du lien. `links` doit sortir de safeStatsLinks.
 */
export function linksScopeSql(links: readonly StatsLink[]): string {
  if (!links.length) throw new Error('aucune adresse')
  const one = (l: StatsLink) => {
    // Revérifié ici : ce texte part tel quel dans la requête.
    if (!SLUG_RE.test(l.slug)) throw new Error(`slug invalide : ${l.slug}`)
    // Création arrondie à la seconde inférieure : on ne perd aucune visite du lien.
    const since = sqlDateTime(Math.floor(l.createdAt / 1000) * 1000)
    return `(index1 = '${l.slug}'${hostSql(l.hostname)} AND timestamp >= toDateTime('${since}'))`
  }
  return links.length === 1 ? one(links[0]!) : `(${links.map(one).join(' OR ')})`
}

/** Période glissante de 1 à 90 jours (rétention d'Analytics Engine). */
export function clampDays(days: number): number {
  return Math.max(1, Math.min(90, Math.floor(days) || 30))
}

/**
 * Visites par adresse sur 30 jours (clé slug, visites scans). Deux liens d'un
 * même espace avec le même slug sur deux domaines sont additionnés sous ce slug.
 */
export function scanCountsSql(links: readonly StatsLink[]): string {
  return (
    `SELECT index1 AS slug, sum(_sample_interval) AS scans ` +
    `FROM ${SCANS_DATASET} WHERE timestamp > NOW() - INTERVAL '30' DAY ` +
    `AND ${linksScopeSql(links)} ` +
    `AND ${HUMAN} ` +
    `GROUP BY slug`
  )
}

/** Visites par jour (UTC) depuis `firstDay` (AAAA-MM-JJ), cumulées sur les adresses. */
export function dailyVisitsSql(links: readonly StatsLink[], firstDay: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDay)) throw new Error(`jour invalide : ${firstDay}`)
  return (
    `SELECT toStartOfDay(timestamp) AS day, sum(_sample_interval) AS visits ` +
    `FROM ${SCANS_DATASET} WHERE timestamp >= toDateTime('${firstDay} 00:00:00') ` +
    `AND ${linksScopeSql(links)} ` +
    `AND ${HUMAN} ` +
    `GROUP BY day ORDER BY day`
  )
}

/** WHERE commun : adresses (bornées à leur création), période, robots exclus. */
function insightsWhere(links: readonly StatsLink[], n: number): string {
  return `${linksScopeSql(links)} AND timestamp > NOW() - INTERVAL '${clampDays(n)}' DAY AND ${HUMAN}`
}

/** Top des valeurs d'une colonne (clé k, visites v). */
function topSql(column: string, where: string, limit?: number, extra = ''): string {
  return (
    `SELECT ${column} AS k, sum(_sample_interval) AS v FROM ${SCANS_DATASET} ` +
    `WHERE ${where}${extra} GROUP BY k ORDER BY v DESC` +
    (limit ? ` LIMIT ${limit}` : '')
  )
}

/** Requêtes des statistiques détaillées. `links` doit sortir de safeStatsLinks. */
export function insightsQueries(links: readonly StatsLink[], n: number) {
  const where = insightsWhere(links, n)
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
      `FROM ${SCANS_DATASET} WHERE ${where} GROUP BY d, h`,
  }
}
