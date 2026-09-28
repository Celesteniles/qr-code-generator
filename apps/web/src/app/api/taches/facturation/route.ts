import { isInternalTaskRequest } from '@/lib/internal-task'
import { runBillingJobs } from '@/server/billing-jobs'

// Tâche planifiée de la facturation (rappels d'échéance, rattrapage des paiements
// en attente, alertes d'anomalie). Appelée uniquement par le Cron Trigger, en
// interne (custom-worker.ts) : toute autre requête reçoit 404, comme une route
// inexistante. Voir server/billing-jobs.ts.

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  if (!isInternalTaskRequest(request)) return new Response('Not Found', { status: 404 })
  const report = await runBillingJobs()
  console.info('[taches] facturation', JSON.stringify(report))
  return Response.json(report)
}
