import type { DailyPoint } from '@/server/config'
import { nf } from './model'

const fmtDay = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** Visites par jour en barres simples ; le dernier jour en bleu. Rien si pas de données. */
export function VisitsChart({ points }: { points: DailyPoint[] }) {
  if (points.length === 0) return null
  const max = Math.max(1, ...points.map((p) => p.visits))
  const total = points.reduce((a, p) => a + p.visits, 0)
  const first = points[0], last = points[points.length - 1]

  return (
    <figure className="mt-5">
      <div className="flex h-[120px] items-end gap-[3px] sm:gap-[5px]" aria-hidden="true">
        {points.map((p, i) => (
          <span
            key={p.day}
            title={`${fmtDay(p.day)} : ${nf.format(p.visits)} visite${p.visits > 1 ? 's' : ''}`}
            className={`min-h-[3px] flex-1 rounded-t-md rounded-b-sm ${i === points.length - 1 ? 'bg-brand' : 'bg-sky'}`}
            style={{ height: `${(p.visits / max) * 100}%` }}
          />
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-xs text-subtle">
        <span>{fmtDay(first.day)}</span>
        <span className="sr-only">
          {nf.format(total)} visites du {fmtDay(first.day)} au {fmtDay(last.day)}, dont {nf.format(last.visits)} le dernier jour.
        </span>
        <span>{fmtDay(last.day)}</span>
      </figcaption>
    </figure>
  )
}
