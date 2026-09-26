import type { Share } from '@/server/insights'
import { nf, pct, visitsText } from './format'

// Liste « libellé · barre de proportion · % et nombre ». Le texte (pourcentage et
// nombre) est toujours écrit : la barre n'est qu'un repère visuel, masqué aux
// lecteurs d'écran.

export function ShareList({ title, items, max = 8, tone = 'brand', note }: {
  title: string
  items: Share[]
  max?: number
  tone?: 'brand' | 'leaf' | 'coral'
  note?: React.ReactNode
}) {
  if (items.length === 0) return null
  const shown = items.slice(0, max)
  const bar = tone === 'leaf' ? 'bg-leaf' : tone === 'coral' ? 'bg-coral' : 'bg-brand'
  return (
    <div>
      <h4 className="text-[13px] font-semibold text-muted">{title}</h4>
      <ul className="mt-2 grid gap-2.5">
        {shown.map((s) => (
          <li key={s.key} className="grid gap-1">
            <div className="flex items-baseline gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate" title={s.label}>
                {s.flag && <span className="mr-1.5" aria-hidden="true">{s.flag}</span>}
                {s.label}
              </span>
              <span className="shrink-0 tabular-nums">
                <b className="font-semibold">{pct(s.share)}</b>
                <span className="text-subtle"> · {nf.format(s.visits)}</span>
                <span className="sr-only"> ({visitsText(s.visits)})</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-soft" aria-hidden="true">
              <span className={`block h-full rounded-full ${bar}`} style={{ width: `${Math.max(1.5, Math.min(100, s.share * 100))}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {note && <p className="mt-2.5 text-xs text-subtle">{note}</p>}
    </div>
  )
}
