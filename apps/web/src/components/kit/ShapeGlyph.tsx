// Pictogrammes des formes de QR (points et coins) : montrer plutôt que nommer.

export type GlyphName =
  | 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded'
  | 'c-square' | 'c-rounded' | 'c-dot'

const CELLS = [[0, 0], [1, 0], [0, 1], [2, 1], [1, 2], [2, 2], [0, 2]]

export function ShapeGlyph({ name }: { name: GlyphName }) {
  const c = 9, g = 1.5
  if (name.startsWith('c-')) {
    const R = name === 'c-square' ? 0 : name === 'c-dot' ? 12 : 6
    const r = name === 'c-square' ? 0 : name === 'c-dot' ? 5 : 2.5
    return (
      <svg viewBox="0 0 30 30" fill="currentColor" aria-hidden="true">
        <rect x="3" y="3" width="24" height="24" rx={R} fill="none" stroke="currentColor" strokeWidth="3.5" />
        <rect x="10" y="10" width="10" height="10" rx={r} />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 30 30" fill="currentColor" aria-hidden="true">
      {CELLS.map(([x, y]) => {
        const px = g + x * c + x * 0.75, py = g + y * c + y * 0.75
        const key = `${x}-${y}`
        if (name === 'dots') return <circle key={key} cx={px + c / 2} cy={py + c / 2} r={c / 2 - 0.3} />
        if (name === 'square') return <rect key={key} x={px} y={py} width={c} height={c} />
        if (name === 'rounded') return <rect key={key} x={px} y={py} width={c} height={c} rx={2.4} />
        if (name === 'extra-rounded') return <rect key={key} x={px} y={py} width={c} height={c} rx={4} />
        const k = name === 'classy' ? 4.5 : 6
        return <path key={key} d={`M${px} ${py + k}a${k} ${k} 0 0 1 ${k} -${k}h${c - k}v${c - k}a${k} ${k} 0 0 1 -${k} ${k}h-${c - k}z`} />
      })}
    </svg>
  )
}
