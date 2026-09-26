import { LOGO_BLUE, LOGO_DISC, LOGO_STROKE, logoStrokeWidth } from './logo-mark'

/** Symbole link.cg (disque bleu + « l » au pinceau). `size` en pixels. */
export function LogoMark({ size = 34, className }: { size?: number; className?: string }) {
  const w = logoStrokeWidth(size)
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <circle {...LOGO_DISC} fill={LOGO_BLUE} />
      <path d={LOGO_STROKE} fill="none" stroke={LOGO_BLUE} strokeWidth={w + 3} strokeLinecap="round" strokeLinejoin="round" />
      <path d={LOGO_STROKE} fill="none" stroke="#fff" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
