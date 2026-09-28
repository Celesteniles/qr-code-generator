// Journal des e-mails automatiques : garantit qu'un e-mail donné (clé) ne part
// qu'une fois, même si la tâche planifiée tourne en double (bêta + production,
// deux déclenchements rapprochés) ou s'interrompt au milieu.
//
// Protocole « au plus une fois » :
//   1. claimNotification : réserve la clé (INSERT, ou reprise d'un échec connu).
//      Seul l'appelant qui obtient true envoie.
//   2. après l'envoi : completeNotification(…, 'sent'), ou 'failed' si l'envoi a
//      été refusé AVANT de partir (clé absente, erreur HTTP) : la clé redevient
//      disponible pour une prochaine tentative.
//   3. envoi interrompu ou à l'issue incertaine (délai dépassé) : la clé reste
//      « sending » pour toujours. On préfère un rappel perdu à un rappel en double.

import { and, eq, lt, sql } from 'drizzle-orm'
import * as schema from './schema'
import type { Db } from './mutations'

/** Au-delà, un envoi refusé n'est plus retenté (adresse invalide, clé Brevo révoquée…). */
export const NOTIFICATION_MAX_ATTEMPTS = 5

/** Réserve l'envoi `key`. true : à l'appelant d'envoyer ; false : déjà envoyé, en cours ou abandonné. */
export async function claimNotification(db: Db, key: string, now: number = Date.now()): Promise<boolean> {
  const inserted = await db
    .insert(schema.notifications)
    .values({ key, status: 'sending', attempts: 1, createdAt: now, updatedAt: now })
    .onConflictDoNothing()
    .returning({ key: schema.notifications.key })
  if (inserted.length) return true
  // Échec connu (rien n'est parti) : on reprend la clé, une seule fois même en concurrence.
  const retaken = await db
    .update(schema.notifications)
    .set({ status: 'sending', attempts: sql`${schema.notifications.attempts} + 1`, updatedAt: now })
    .where(and(
      eq(schema.notifications.key, key),
      eq(schema.notifications.status, 'failed'),
      lt(schema.notifications.attempts, NOTIFICATION_MAX_ATTEMPTS),
    ))
    .returning({ key: schema.notifications.key })
  return retaken.length > 0
}

/** Issue d'un envoi réservé par claimNotification. */
export async function completeNotification(
  db: Db, key: string, status: 'sent' | 'failed', now: number = Date.now(),
): Promise<void> {
  await db
    .update(schema.notifications)
    .set({ status, updatedAt: now })
    .where(and(eq(schema.notifications.key, key), eq(schema.notifications.status, 'sending')))
}

export async function getNotification(db: Db, key: string) {
  return db.query.notifications.findFirst({ where: eq(schema.notifications.key, key) })
}
