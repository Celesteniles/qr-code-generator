import { MIN_VISITS_FOR_TRENDS, type WorkspaceInsights } from '@/server/insights'
import { pct } from '@/components/stats/format'

// Carte compacte « Vos visiteurs » de l'accueil : quelques repères sur l'ensemble
// des liens, uniquement ceux que les données permettent d'affirmer.

export function VisitorsCard({ data }: { data: WorkspaceInsights }) {
  const facts: { label: string; value: React.ReactNode; hint?: string }[] = []
  if (data.topCountry) {
    facts.push({
      label: 'Pays principal',
      value: <>{data.topCountry.flag && <span aria-hidden="true">{data.topCountry.flag} </span>}{data.topCountry.label}</>,
      hint: `${pct(data.topCountry.share)} des visites`,
    })
  }
  if (data.mobileShare !== null) facts.push({ label: 'Sur mobile', value: pct(data.mobileShare), hint: 'des visites' })
  if (data.topSystem) facts.push({ label: 'Système principal', value: data.topSystem.label, hint: `${pct(data.topSystem.share)} des appareils` })
  if (data.qrShare !== null) facts.push({ label: 'Scans de QR', value: pct(data.qrShare), hint: 'parmi les visites récentes' })
  if (!facts.length) return null

  return (
    <section className="card mt-4 p-6" aria-labelledby="visiteurs-title">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 id="visiteurs-title" className="h3">Vos visiteurs</h3>
        <span className="text-xs text-subtle">
          {data.days} derniers jours · tous vos liens
          {data.total < MIN_VISITS_FOR_TRENDS && ' · encore peu de visites, à confirmer'}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 min-[860px]:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="rounded-2xl bg-soft px-4 py-3">
            <dt className="text-xs text-muted">{f.label}</dt>
            <dd className="mt-0.5 break-words font-display text-lg font-bold leading-snug tracking-[-.02em]">{f.value}</dd>
            {f.hint && <dd className="text-xs text-subtle">{f.hint}</dd>}
          </div>
        ))}
      </dl>
    </section>
  )
}
