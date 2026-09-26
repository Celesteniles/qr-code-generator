// Config de style d'un QR de lien. Vocabulaire aligné sur le générateur gratuit,
// pour un écosystème cohérent (mêmes formes, mêmes presets).

export type DotType = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded'
export type CornerSquareType = 'square' | 'extra-rounded' | 'dot'
export type CornerDotType = 'square' | 'dot'

export type GradientType = 'linear' | 'radial'

export interface QrGradient {
  enabled: boolean
  color2: string
  type: GradientType
  angle: number
}

export interface QrDesign {
  dotColor: string
  bgColor: string
  dotType: DotType
  cornerSquareType: CornerSquareType
  cornerDotType: CornerDotType
  gradient?: QrGradient
  /** Logo au centre, en data URL (base64). */
  logo?: string
  /** Taille du logo, 0..1. */
  logoSize?: number
}

export const DEFAULT_DESIGN: QrDesign = {
  dotColor: '#14152b',
  bgColor: '#ffffff',
  dotType: 'rounded',
  cornerSquareType: 'extra-rounded',
  cornerDotType: 'dot',
}

export const GRAD_DIRECTIONS: { label: string; angle: number; type: GradientType }[] = [
  { label: '→', angle: 0, type: 'linear' },
  { label: '↓', angle: 90, type: 'linear' },
  { label: '↘', angle: 45, type: 'linear' },
  { label: '◯', angle: 0, type: 'radial' },
]

/** Options qr-code-styling dérivées d'un design — partagées aperçu + export. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toQrOptions(design: QrDesign, data: string, size: number): any {
  const grad = design.gradient?.enabled
    ? {
        gradient: {
          type: design.gradient.type,
          rotation: (design.gradient.angle * Math.PI) / 180,
          colorStops: [
            { offset: 0, color: design.dotColor },
            { offset: 1, color: design.gradient.color2 },
          ],
        },
      }
    : {}
  return {
    // Marge proportionnelle : une marge fixe écrase les modules des petites vignettes.
    width: size, height: size, data, margin: Math.max(2, Math.round(size * 0.035)),
    qrOptions: { errorCorrectionLevel: 'H' },
    image: design.logo || undefined,
    imageOptions: { crossOrigin: 'anonymous', margin: 4, imageSize: design.logoSize ?? 0.3, hideBackgroundDots: true },
    dotsOptions: { color: design.dotColor, type: design.dotType, ...grad },
    backgroundOptions: { color: design.bgColor },
    cornersSquareOptions: { type: design.cornerSquareType, color: design.dotColor, ...grad },
    cornersDotOptions: { type: design.cornerDotType, color: design.dotColor, ...grad },
  }
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
