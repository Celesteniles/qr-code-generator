// Limites de débit par espace de travail, sans nouvelle infra : on compte en D1
// les liens créés (ou modifiés) dans l'heure glissante. Objectif anti-abus : un
// compte ne doit pas pouvoir fabriquer des liens de phishing en rafale et faire
// bloquer link.cg entier par Google ou WhatsApp (et avec lui tous les QR imprimés).
//
// Limites connues, acceptées :
//   - un lien supprimé ne compte plus (suppression physique) ; le plafond du palier
//     (PLANS.maxLinks) borne de toute façon le nombre de liens vivants ;
//   - pour les changements de destination, on compte les LIENS modifiés dans
//     l'heure (colonne updated_at), pas chaque modification : changer dix fois le
//     même lien ne compte qu'une fois. Chaque changement passe quand même par
//     Safe Browsing.
//   - lecture puis écriture non atomiques : deux requêtes simultanées peuvent
//     dépasser la limite d'une unité. Sans conséquence ici.

import { and, eq, gt, gte, sql } from 'drizzle-orm'
import * as schema from './schema'
import type { Db } from './mutations'

export const THROTTLE_WINDOW_MS = 60 * 60 * 1000

/** Liens créés par heure glissante, selon le palier. */
export const LINK_CREATIONS_PER_HOUR = { free: 20, pro: 100, enterprise: 300 } as const
/** Liens dont la destination change, par heure glissante, selon le palier. */
export const LINK_UPDATES_PER_HOUR = { free: 30, pro: 150, enterprise: 500 } as const

export type ThrottlePlan = keyof typeof LINK_CREATIONS_PER_HOUR

export type ThrottleResult =
  | { ok: true }
  /** `retryInMinutes` : délai avant qu'une place se libère (au moins 1). */
  | { ok: false; max: number; retryInMinutes: number }

/** Décision pure : `count` événements dans la fenêtre, le plus ancien à `oldest`. */
export function decideThrottle(count: number, oldest: number | null, max: number, now: number): ThrottleResult {
  if (count < max) return { ok: true }
  const freeAt = (oldest ?? now) + THROTTLE_WINDOW_MS
  return { ok: false, max, retryInMinutes: Math.max(1, Math.ceil((freeAt - now) / 60_000)) }
}

/** Liens créés par l'espace depuis `since` (ms) : nombre et plus ancienne création. */
async function createdSince(db: Db, workspaceId: string, since: number) {
  const [row] = await db
    .select({ count: sql<number>`count(*)`, oldest: sql<number | null>`min(${schema.links.createdAt})` })
    .from(schema.links)
    .where(and(eq(schema.links.workspaceId, workspaceId), gte(schema.links.createdAt, since)))
  return { count: Number(row?.count ?? 0), oldest: row?.oldest ?? null }
}

/**
 * Liens de l'espace modifiés depuis `since` (hors création : updated_at > created_at).
 * Inclut les mises en pause/réactivations, qui touchent aussi updated_at.
 */
async function updatedSince(db: Db, workspaceId: string, since: number) {
  const [row] = await db
    .select({ count: sql<number>`count(*)`, oldest: sql<number | null>`min(${schema.links.updatedAt})` })
    .from(schema.links)
    .where(and(
      eq(schema.links.workspaceId, workspaceId),
      gte(schema.links.updatedAt, since),
      gt(schema.links.updatedAt, schema.links.createdAt),
    ))
  return { count: Number(row?.count ?? 0), oldest: row?.oldest ?? null }
}

/** L'espace peut-il créer un lien maintenant ? Une seule requête D1. */
export async function checkLinkCreationRate(
  db: Db, workspaceId: string, plan: ThrottlePlan, now = Date.now(),
): Promise<ThrottleResult> {
  const { count, oldest } = await createdSince(db, workspaceId, now - THROTTLE_WINDOW_MS)
  return decideThrottle(count, oldest, LINK_CREATIONS_PER_HOUR[plan], now)
}

/**
 * L'espace peut-il changer la destination de `linkId` maintenant ? Un lien déjà
 * modifié dans l'heure est déjà compté : on le laisse passer (corriger une faute
 * de frappe juste après un changement ne doit pas être bloqué).
 */
export async function checkLinkUpdateRate(
  db: Db, workspaceId: string, plan: ThrottlePlan, link: { createdAt: number; updatedAt: number }, now = Date.now(),
): Promise<ThrottleResult> {
  const since = now - THROTTLE_WINDOW_MS
  if (link.updatedAt >= since && link.updatedAt > link.createdAt) return { ok: true }
  const { count, oldest } = await updatedSince(db, workspaceId, since)
  return decideThrottle(count, oldest, LINK_UPDATES_PER_HOUR[plan], now)
}
