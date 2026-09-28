import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  claimNotification, completeNotification, listDueReminders, listOpenAnomalies, listStaleCheckouts, reminderKey,
} from '@link/db'
import { PLANS } from '@link/shared'
import { getDb } from './data'
import { EmailError, sendEmail } from './email'
import { getPawapayConfig } from './pawapay'
import { notifyAnomaly, reconcileCheckout, siteOrigin } from './checkout'
import { renewalReminderEmail } from './email-templates/renewal-reminder'

// Tâche planifiée de la facturation (Cron Trigger, toutes les heures ; cf.
// custom-worker.ts et /api/taches/facturation). Chaque étape est rejouable :
// la décision vit dans @link/db, l'envoi est réservé par claimNotification.
//   1. rattrapage des paiements en attente (callback perdu, page fermée) ;
//   2. alertes d'anomalie restées en échec ;
//   3. rappels d'échéance, entre 8 h et 20 h à Brazzaville, seulement si
//      BILLING_REMINDERS = "true" (un seul Worker les envoie : la bêta et la
//      production partagent la base, et le lien doit pointer vers le vrai site).

/** Rappels envoyés seulement de 8 h à 20 h (heure de Brazzaville, UTC+1). */
const REMINDER_HOURS = { from: 8, to: 20 }

export interface BillingJobsReport {
  checkouts: { checked: number; changed: number }
  anomalyAlerts: number
  reminders: { due: number; sent: number; failed: number; skipped: string | null }
}

export async function runBillingJobs(now: number = Date.now()): Promise<BillingJobsReport> {
  const db = getDb()
  const report: BillingJobsReport = {
    checkouts: { checked: 0, changed: 0 },
    anomalyAlerts: 0,
    reminders: { due: 0, sent: 0, failed: 0, skipped: null },
  }

  // 1. Tentatives en attente, relues chez pawaPay (celles de NOTRE API pawaPay).
  const cfg = getPawapayConfig()
  if (cfg) {
    const stale = await listStaleCheckouts(db, { env: cfg.sandbox ? 'sandbox' : 'production', now })
    for (const c of stale) {
      try {
        const res = await reconcileCheckout(c.id, { stale: true })
        report.checkouts.checked++
        if (res?.changed) report.checkouts.changed++
      } catch (e) {
        console.error('[taches] rapprochement', c.id, e)
      }
    }
  }

  // 2. Alertes d'anomalie refusées par Brevo lors d'un premier essai.
  for (const a of await listOpenAnomalies(db)) {
    try {
      if (await notifyAnomaly(a.id)) report.anomalyAlerts++
    } catch (e) {
      console.error('[taches] alerte d’anomalie', a.id, e)
    }
  }

  // 3. Rappels d'échéance.
  const hour = new Date(now + 60 * 60 * 1000).getUTCHours()
  if (getCloudflareContext().env.BILLING_REMINDERS !== 'true') report.reminders.skipped = 'désactivés (BILLING_REMINDERS)'
  else if (hour < REMINDER_HOURS.from || hour >= REMINDER_HOURS.to) report.reminders.skipped = 'hors horaires'
  else await sendReminders(now, report)

  return report
}

async function sendReminders(now: number, report: BillingJobsReport): Promise<void> {
  const db = getDb()
  const due = await listDueReminders(db, now)
  const origin = siteOrigin()
  for (const r of due) {
    const url = `${origin}/compte/facturation/payer?offre=${r.plan}&cycle=${r.cycle}`
    for (const to of r.recipients) {
      report.reminders.due++
      const key = reminderKey(r, to.userId)
      if (!(await claimNotification(db, key, now))) continue
      const mail = renewalReminderEmail({
        kind: r.kind, name: to.name, workspaceName: r.workspaceName, planLabel: PLANS[r.plan].label,
        cycle: r.cycle, amount: r.amount, periodEnd: r.periodEnd, downgradeAt: r.downgradeAt, url, now,
      })
      try {
        await sendEmail({ to: to.email, name: to.name || undefined, ...mail })
        await completeNotification(db, key, 'sent')
        report.reminders.sent++
      } catch (e) {
        report.reminders.failed++
        console.error('[taches] rappel d’échéance non envoyé', key, e)
        // Issue incertaine : la clé reste réservée, le rappel n'est jamais renvoyé.
        if (!(e instanceof EmailError && e.maybeSent)) await completeNotification(db, key, 'failed')
      }
    }
  }
}
