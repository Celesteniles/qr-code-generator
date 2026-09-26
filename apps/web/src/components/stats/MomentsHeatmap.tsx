import { DAY_NAMES } from '@/server/insights'
import { nf, visitsText } from './format'

// Grille 7 jours × 24 heures (heure de Brazzaville). Plus la case est foncée, plus
// il y a eu de visites. Les lecteurs d'écran reçoivent un résumé par jour.

const SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const LEVELS = [0, 22, 45, 70, 100] // % de la couleur de marque mêlée au fond

function level(v: number, max: number): number {
  if (v <= 0 || max <= 0) return 0
  return Math.min(4, Math.max(1, Math.ceil((v / max) * 4)))
}

function cellStyle(lvl: number): React.CSSProperties {
  return lvl === 0
    ? { background: 'var(--soft)' }
    : { background: `color-mix(in srgb, var(--brand) ${LEVELS[lvl]}%, var(--soft))` }
}

export function MomentsHeatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(0, ...grid.flat())
  const summary = grid.map((row, d) => {
    const total = row.reduce((a, b) => a + b, 0)
    const best = row.indexOf(Math.max(...row))
    return { d, total, best }
  })

  return (
    <figure>
      <div className="grid gap-[3px] [grid-template-columns:2.25rem_repeat(24,minmax(0,1fr))]" aria-hidden="true">
        {grid.map((row, d) => (
          <div key={d} className="contents">
            <span className="self-center text-[11px] text-subtle">{SHORT[d]}</span>
            {row.map((v, h) => (
              <span
                key={h}
                className="aspect-square max-h-6 rounded-[3px] shadow-[inset_0_0_0_1px_var(--line)]"
                style={cellStyle(level(v, max))}
                title={`${DAY_NAMES[d]} ${h} h–${h + 1} h : ${visitsText(v)}`}
              />
            ))}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="whitespace-nowrap text-[10px] tabular-nums text-subtle">{h % 6 === 0 ? `${h} h` : ''}</span>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-subtle">
        <span>Heure de Brazzaville</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          Moins
          {[0, 1, 2, 3, 4].map((l) => <span key={l} className="h-3 w-3 rounded-[3px] shadow-[inset_0_0_0_1px_var(--line)]" style={cellStyle(l)} />)}
          Plus
        </span>
        <span className="sr-only">
          Visites par jour de la semaine :{' '}
          {summary.map((s) => `${DAY_NAMES[s.d]} ${nf.format(s.total)}${s.total > 0 ? `, surtout vers ${s.best} h` : ''}`).join(' ; ')}.
        </span>
      </figcaption>
    </figure>
  )
}
