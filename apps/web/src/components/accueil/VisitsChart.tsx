'use client'

import { useState } from 'react'

// Carte « Visites par jour » : barres simples sur 7 ou 30 jours. Les points
// viennent de getDailyVisits (le plus ancien d'abord) ; la carte n'est rendue
// par l'accueil que s'il y a des points.

export interface VisitPoint { day: string; visits: number }

const fmtDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const fmtNum = new Intl.NumberFormat('fr-FR')

function label(day: string) {
  const d = new Date(`${day}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? day : fmtDay.format(d)
}

export function VisitsChart({ points }: { points: VisitPoint[] }) {
  const [range, setRange] = useState<7 | 30>(30)
  const shown = points.slice(-range)
  const max = Math.max(1, ...shown.map((p) => p.visits))
  const total = shown.reduce((a, p) => a + p.visits, 0)

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="h3">Visites par jour</h3>
        <div className="seg ml-auto" role="group" aria-label="Période">
          {([7, 30] as const).map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r} j</button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-subtle">Clics sur vos liens + scans de vos QR, hors robots · {fmtNum.format(total)} sur la période</p>
      <div className="mt-[18px] flex h-[110px] items-end gap-[5px]" aria-hidden="true">
        {shown.map((p, i) => (
          <span
            key={p.day}
            title={`${label(p.day)} : ${fmtNum.format(p.visits)}`}
            className={`flex-1 rounded-[6px_6px_3px_3px] ${i === shown.length - 1 ? 'bg-brand' : 'bg-soft shadow-[inset_0_0_0_1px_var(--line)]'}`}
            style={{ height: `${Math.max(3, (p.visits / max) * 100)}%` }}
          />
        ))}
      </div>
      {shown.length > 0 && (
        <div className="mt-2 flex text-xs text-subtle">
          <span>{label(shown[0].day)}</span>
          <span className="ml-auto">Aujourd&apos;hui</span>
        </div>
      )}
      <p className="sr-only">
        {fmtNum.format(total)} visites sur les {shown.length} derniers jours, dont {fmtNum.format(shown.at(-1)?.visits ?? 0)} aujourd&apos;hui.
      </p>
    </div>
  )
}
