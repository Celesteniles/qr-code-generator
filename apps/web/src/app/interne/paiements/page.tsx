import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAnomalyContext, listOpenAnomalies, maskPhone, methodForProvider } from '@link/db'
import { PLANS } from '@link/shared'
import { getDb } from '@/server/data'
import { getBillingAdmin } from '@/server/billing-admin'
import { resolveAnomalyAction } from '@/server/anomaly-actions'
import { formatDate, formatFcfa } from '@/components/facturation/format'

export const metadata: Metadata = { title: 'link.cg', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// Page réservée à l'équipe NS Creative (BILLING_ADMIN_EMAILS, cf. server/billing-admin.ts) :
// anomalies de paiement ouvertes et leur résolution. Toute autre personne reçoit
// une 404, comme pour une page inexistante (hors de la coquille de l'espace, dont
// l'écran de chargement ferait répondre 200). Procédure : docs/PAIEMENTS.md.

type Props = { searchParams: Promise<{ ok?: string; erreur?: string }> }

const KIND: Record<string, string> = {
  amount_mismatch: 'Montant ou devise inattendus',
  unknown_provider: 'Opérateur inconnu',
  receipt_failed: 'Reçu non créé',
}

const DONE: Record<string, string> = {
  granted: 'Offre accordée, reçu créé.',
  refunded: 'Anomalie close : remboursement noté.',
  dismissed: 'Anomalie classée sans suite.',
}

const ERRORS: Record<string, string> = {
  formulaire: 'Choisissez une décision et cochez la confirmation.',
  method_required: 'Opérateur inconnu : choisissez le moyen de paiement du reçu.',
  grant_failed: 'Le reçu n’a pas pu être créé. Voir les journaux du Worker.',
  not_found: 'Anomalie introuvable.',
}

export default async function AnomaliesPage({ searchParams }: Props) {
  const admin = await getBillingAdmin()
  if (!admin) notFound()
  const { ok, erreur } = await searchParams
  const db = getDb()
  const contexts = (await Promise.all((await listOpenAnomalies(db)).map((a) => getAnomalyContext(db, a)))).filter((c) => c !== null)

  return (
    <main className="mx-auto max-w-[900px] px-4 pb-14 pt-6 sm:px-8 lg:pt-9">
      <h1 className="h1">Anomalies de paiement</h1>
      <p className="lead mt-2 max-w-[70ch]">
        Dépôts encaissés par pawaPay sans que l’offre ait pu être donnée. Vérifiez le dépôt dans le tableau de bord
        pawaPay (depositId), puis tranchez. Connecté en tant que {admin}.
      </p>
      {ok && DONE[ok] && <p role="status" className="mt-5 rounded-[18px] bg-ok-tint px-4 py-3 text-sm text-ok">{DONE[ok]}</p>}
      {erreur && ERRORS[erreur] && <p role="alert" className="mt-5 rounded-[18px] bg-bad-tint px-4 py-3 text-sm text-bad">{ERRORS[erreur]}</p>}

      {!contexts.length && <p className="card mt-6 p-5 text-muted">Aucune anomalie ouverte.</p>}

      <div className="mt-6 grid gap-4">
        {contexts.map(({ anomaly: a, checkout: c, workspaceName, payer, owners }) => {
          const d = a.deposit
          const knownMethod = methodForProvider(d.provider)
          const rows: [string, string][] = [
            ['Espace', `${workspaceName || '(sans nom)'} (${a.workspaceId})`],
            ['Payeur', payer ? `${payer.name} <${payer.email}>` : 'inconnu'],
            ['Propriétaire', owners.map((o) => `${o.name} <${o.email}>`).join(', ') || 'inconnu'],
            ['Offre', `${PLANS[c.plan].label}, ${c.cycle === 'year' ? '1 an' : '1 mois'}`],
            ['Attendu', formatFcfa(c.amount)],
            ['Reçu', `${d.amount ?? '?'} ${d.currency ?? '?'}`],
            ['depositId', c.id],
            ['providerTransactionId', d.providerTransactionId ?? '(absent)'],
            ['Opérateur', d.provider ?? '(absent)'],
            ['Numéro', maskPhone(d.phoneNumber ? `+${d.phoneNumber}` : null) ?? '(absent)'],
            ['API pawaPay', c.pawapayEnv ?? '(non notée)'],
            ['Signalée le', formatDate(a.createdAt)],
          ]
          return (
            <section key={a.id} id={a.id} className="card p-5 sm:p-[26px]">
              <span className="pill pill-bad">{KIND[a.kind] ?? a.kind}</span>
              <p className="mt-3 text-sm">{a.detail}</p>
              <dl className="mt-4 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
                {rows.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted">{k}</dt>
                    <dd className="break-all">{v}</dd>
                  </div>
                ))}
              </dl>
              <form action={resolveAnomalyAction} className="mt-5 grid gap-3">
                <input type="hidden" name="id" value={a.id} />
                <fieldset className="grid gap-2">
                  <legend className="mb-1 font-semibold">Décision</legend>
                  <label className="flex items-center gap-2"><input type="radio" name="resolution" value="granted" required />Accorder l’offre (reçu du montant encaissé)</label>
                  <label className="flex items-center gap-2"><input type="radio" name="resolution" value="refunded" />Client remboursé, pas d’offre</label>
                  <label className="flex items-center gap-2"><input type="radio" name="resolution" value="dismissed" />Classer : rien n’a été encaissé</label>
                </fieldset>
                {!knownMethod && (
                  <label className="grid gap-1 text-sm">
                    Moyen de paiement du reçu (si l’offre est accordée)
                    <select name="method" className="rounded-[12px] bg-soft px-3 py-2" defaultValue="manual">
                      <option value="mtn_momo">MTN MoMo</option>
                      <option value="airtel_money">Airtel Money</option>
                      <option value="manual">Enregistré manuellement</option>
                    </select>
                  </label>
                )}
                <label className="grid gap-1 text-sm">
                  Note (conservée avec l’anomalie)
                  <textarea name="note" rows={2} maxLength={1000} className="rounded-[12px] bg-soft px-3 py-2" />
                </label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" required />J’ai vérifié le dépôt dans le tableau de bord pawaPay.</label>
                <button type="submit" className="btn btn-brand btn-sm justify-self-start">Enregistrer la décision</button>
              </form>
            </section>
          )
        })}
      </div>
    </main>
  )
}
