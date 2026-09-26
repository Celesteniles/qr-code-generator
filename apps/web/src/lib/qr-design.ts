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

// Lecture d'un design stocké (base, localStorage) : la valeur n'est pas fiable.
// On ne garde que les clés connues, avec le bon type ; le reste prend la valeur
// par défaut. Le logo ne peut être qu'une image matricielle en data URL, de taille
// bornée : la CSP n'autorise que data:/blob: pour les images, et un SVG embarqué
// est écarté par prudence.
const COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const LOGO = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/
/** Taille maximale du logo (data URL) : un fichier de 500 Ko en base64, avec marge. */
export const LOGO_MAX_CHARS = 700 * 1024
const DOT_VALUES = new Set<string>(DOT_TYPES.map((d) => d.value))
const CORNER_VALUES = new Set<string>(CORNER_TYPES.map((c) => c.value))
const CORNER_DOT_VALUES = new Set<string>(['square', 'dot'] satisfies CornerDotType[])

const color = (v: unknown): string | undefined => (typeof v === 'string' && COLOR.test(v) ? v : undefined)
const oneOf = <T extends string>(set: Set<string>, v: unknown): T | undefined =>
  typeof v === 'string' && set.has(v) ? (v as T) : undefined
const num = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined

/** true si `v` est un logo accepté (data URL png/jpeg/webp, taille bornée). */
export function isSafeLogo(v: unknown): v is string {
  return typeof v === 'string' && v.length <= LOGO_MAX_CHARS && LOGO.test(v)
}

function toGradient(raw: unknown): QrGradient | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const g = raw as Record<string, unknown>
  const color2 = color(g.color2)
  if (typeof g.enabled !== 'boolean' || !color2) return undefined
  return {
    enabled: g.enabled,
    color2,
    type: g.type === 'radial' ? 'radial' : 'linear',
    angle: num(g.angle, 0, 360) ?? 0,
  }
}

/** Normalise une valeur stockée (JSON) en QrDesign complet, clés connues uniquement. */
export function toDesign(raw: unknown): QrDesign {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const design: QrDesign = {
    dotColor: color(r.dotColor) ?? DEFAULT_DESIGN.dotColor,
    bgColor: color(r.bgColor) ?? DEFAULT_DESIGN.bgColor,
    dotType: oneOf<DotType>(DOT_VALUES, r.dotType) ?? DEFAULT_DESIGN.dotType,
    cornerSquareType: oneOf<CornerSquareType>(CORNER_VALUES, r.cornerSquareType) ?? DEFAULT_DESIGN.cornerSquareType,
    cornerDotType: oneOf<CornerDotType>(CORNER_DOT_VALUES, r.cornerDotType) ?? DEFAULT_DESIGN.cornerDotType,
  }
  const gradient = toGradient(r.gradient)
  if (gradient) design.gradient = gradient
  if (isSafeLogo(r.logo)) design.logo = r.logo
  const logoSize = num(r.logoSize, 0.05, 0.5)
  if (logoSize !== undefined) design.logoSize = logoSize
  return design
}
