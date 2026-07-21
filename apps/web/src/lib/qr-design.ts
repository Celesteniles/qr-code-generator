// Config de style d'un QR de lien. Vocabulaire aligné sur le générateur gratuit,
// pour un écosystème cohérent (mêmes formes, mêmes presets).

export type DotType = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded'
export type CornerSquareType = 'square' | 'extra-rounded' | 'dot'
export type CornerDotType = 'square' | 'dot'

export interface QrDesign {
  dotColor: string
  bgColor: string
  dotType: DotType
  cornerSquareType: CornerSquareType
  cornerDotType: CornerDotType
}

export const DEFAULT_DESIGN: QrDesign = {
  dotColor: '#14152b',
  bgColor: '#ffffff',
  dotType: 'rounded',
  cornerSquareType: 'extra-rounded',
  cornerDotType: 'dot',
}

export const DESIGN_PRESETS: { label: string; design: QrDesign }[] = [
  { label: 'Encre', design: DEFAULT_DESIGN },
  { label: 'Océan', design: { dotColor: '#0060ff', bgColor: '#f0f6ff', dotType: 'extra-rounded', cornerSquareType: 'extra-rounded', cornerDotType: 'dot' } },
  { label: 'Violet', design: { dotColor: '#6d28d9', bgColor: '#f7f2ff', dotType: 'classy-rounded', cornerSquareType: 'extra-rounded', cornerDotType: 'dot' } },
  { label: 'Nuit', design: { dotColor: '#e2e8f0', bgColor: '#0b0b1a', dotType: 'dots', cornerSquareType: 'dot', cornerDotType: 'dot' } },
]

export const DOT_TYPES: { value: DotType; label: string }[] = [
  { value: 'square', label: 'Carré' },
  { value: 'rounded', label: 'Arrondi' },
  { value: 'dots', label: 'Points' },
  { value: 'classy', label: 'Élégant' },
  { value: 'classy-rounded', label: 'Élégant +' },
  { value: 'extra-rounded', label: 'Très rond' },
]

export const CORNER_TYPES: { value: CornerSquareType; label: string }[] = [
  { value: 'square', label: 'Carré' },
  { value: 'extra-rounded', label: 'Arrondi' },
  { value: 'dot', label: 'Point' },
]

/** Normalise une valeur stockée (JSON) en QrDesign complet. */
export function toDesign(raw: unknown): QrDesign {
  const r = (raw ?? {}) as Partial<QrDesign>
  return { ...DEFAULT_DESIGN, ...r }
}
