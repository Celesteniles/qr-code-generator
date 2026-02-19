// ── Types ─────────────────────────────────────────────────────────────────────

export type Lang = 'fr' | 'en'
export type DotType = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded'
export type CornerSquareType = 'square' | 'extra-rounded' | 'dot'
export type CornerDotType = 'square' | 'dot'
export type GradientType = 'linear' | 'radial'

export interface QrConfig {
  dotColor: string
  bgColor: string
  dotType: DotType
  cornerSquareType: CornerSquareType
  cornerDotType: CornerDotType
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const PREVIEW_SIZE = 280

export const PRESET_CONFIGS: QrConfig[] = [
  { dotColor: '#000000', bgColor: '#ffffff', dotType: 'square',        cornerSquareType: 'square',        cornerDotType: 'square' },
  { dotColor: '#18181b', bgColor: '#fafafa', dotType: 'rounded',       cornerSquareType: 'extra-rounded', cornerDotType: 'dot'    },
  { dotColor: '#1d4ed8', bgColor: '#eff6ff', dotType: 'extra-rounded', cornerSquareType: 'extra-rounded', cornerDotType: 'dot'    },
  { dotColor: '#e2e8f0', bgColor: '#0f172a', dotType: 'dots',          cornerSquareType: 'dot',           cornerDotType: 'dot'    },
]

export const GRAD_DIRS: { label: string; angle: number; type: GradientType }[] = [
  { label: '→', angle: 0,   type: 'linear' },
  { label: '↓', angle: 90,  type: 'linear' },
  { label: '↘', angle: 45,  type: 'linear' },
  { label: '↙', angle: 135, type: 'linear' },
  { label: '◯', angle: 0,   type: 'radial' },
]
