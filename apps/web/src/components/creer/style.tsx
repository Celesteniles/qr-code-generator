'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { PhotoIcon, SparklesIcon, TrashIcon } from '@heroicons/react/24/outline'
import { QrCanvas } from '@/components/kit/QrCanvas'
import { ShapeGlyph, type GlyphName } from '@/components/kit/ShapeGlyph'
import { CORNER_TYPES, DOT_TYPES, GRAD_DIRECTIONS, type CornerSquareType, type QrDesign } from '@/lib/qr-design'

// « À quoi doit-il ressembler ? » : styles prêts à l'emploi + réglages repliés
// (couleurs, dégradé, formes, logo). Porté de QrGenerator/ColorsCard + ImageCard.

const W = '#ffffff'
export const STYLE_PRESETS: { label: string; design: QrDesign }[] = [
  { label: 'Classique', design: { dotColor: '#16161d', bgColor: W, dotType: 'square', cornerSquareType: 'square', cornerDotType: 'square' } },
  { label: 'Terre', design: { dotColor: '#7a2e12', bgColor: W, dotType: 'rounded', cornerSquareType: 'extra-rounded', cornerDotType: 'dot' } },
  { label: 'Océan', design: { dotColor: '#0060ff', bgColor: W, dotType: 'dots', cornerSquareType: 'dot', cornerDotType: 'dot' } },
  { label: 'Aurore', design: { dotColor: '#0060ff', bgColor: W, dotType: 'classy', cornerSquareType: 'extra-rounded', cornerDotType: 'dot', gradient: { enabled: true, color2: '#7c3aed', type: 'linear', angle: 45 } } },
  { label: 'Forêt', design: { dotColor: '#1f9d63', bgColor: W, dotType: 'dots', cornerSquareType: 'dot', cornerDotType: 'dot' } },
]

const SWATCHES = [
  { label: 'Encre', color: '#16161d' },
  { label: 'Terre', color: '#7a2e12' },
  { label: 'Bleu NS', color: '#0060ff' },
  { label: 'Forêt', color: '#1f9d63' },
  { label: 'Framboise', color: '#d6336c' },
  { label: 'Prune', color: '#6d28d9' },
]

const CORNER_GLYPH: Record<CornerSquareType, GlyphName> = { square: 'c-square', 'extra-rounded': 'c-rounded', dot: 'c-dot' }
const DIR_LABEL: Record<string, string> = { '→': 'De gauche à droite', '↓': 'De haut en bas', '↘': 'En diagonale', '◯': 'Du centre vers les bords' }

/** Compare deux styles (hors logo) pour savoir quel preset est actif. */
function sameStyle(a: QrDesign, b: QrDesign): boolean {
  const g = (d: QrDesign) => (d.gradient?.enabled ? `${d.gradient.color2}|${d.gradient.type}|${d.gradient.angle}` : '')
  return a.dotColor === b.dotColor && a.bgColor === b.bgColor && a.dotType === b.dotType &&
    a.cornerSquareType === b.cornerSquareType && g(a) === g(b)
}

/** Réduit le logo (côté max 256 px) : le style est enregistré avec le lien. */
function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => {
      const src = String(reader.result)
      const img = new Image()
      img.onerror = () => reject(new Error('image'))
      img.onload = () => {
        const max = 256
        const k = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.max(1, Math.round(img.width * k))
        c.height = Math.max(1, Math.round(img.height * k))
        c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/png'))
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}

function SubLabel({ children, id }: { children: React.ReactNode; id?: string }) {
  return <div id={id} className="mb-2.5 text-[13px] font-semibold">{children}</div>
}

export function StyleEditor({ design, onChange }: { design: QrDesign; onChange: (d: QrDesign) => void }) {
  const file = useRef<HTMLInputElement>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const set = (patch: Partial<QrDesign>) => onChange({ ...design, ...patch })
  const grad = design.gradient ?? { enabled: false, color2: '#7c3aed', type: 'linear' as const, angle: 45 }
  const setGrad = (patch: Partial<typeof grad>) => set({ gradient: { ...grad, ...patch } })

  async function onLogo(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setLogoError(null)
    if (!f.type.startsWith('image/')) { setLogoError('Choisissez une image (PNG ou JPG).'); return }
    try {
      set({ logo: await shrinkImage(f), logoSize: design.logoSize ?? 0.3 })
    } catch {
      setLogoError('Cette image n’a pas pu être lue. Essayez un autre fichier PNG ou JPG.')
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5" role="group" aria-label="Styles prêts à l'emploi">
        {STYLE_PRESETS.map((p) => {
          const active = sameStyle(design, p.design)
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...p.design, logo: design.logo, logoSize: design.logoSize })}
              className={`grid place-items-center gap-2 rounded-[18px] p-2.5 text-xs font-semibold transition ${
                active ? 'bg-surface text-brand shadow-[inset_0_0_0_2px_var(--brand)]' : 'bg-soft text-muted hover:text-ink'
              }`}
            >
              <span className="overflow-hidden rounded-[10px] leading-none" aria-hidden="true">
                <QrCanvas data="https://link.cg" design={p.design} size={128} className="!h-16 !w-16" />
              </span>
              {p.label}
            </button>
          )
        })}
      </div>

      <details className="group mt-4">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full bg-soft px-4 py-2.5 text-sm font-semibold group-open:bg-ink group-open:text-bg [&::-webkit-details-marker]:hidden">
          <SparklesIcon className="h-4 w-4" />Plus de réglages · couleurs, formes, logo
        </summary>
        <div className="mt-5 grid gap-[22px]">
          {/* Couleur du motif */}
          <div>
            <SubLabel id="st-color">Couleur</SubLabel>
            <div className="flex flex-wrap items-center gap-2.5" role="group" aria-labelledby="st-color">
              {SWATCHES.map((s) => (
                <button key={s.color} type="button" className="swatch" style={{ background: s.color }} aria-label={s.label}
                  aria-pressed={design.dotColor === s.color} onClick={() => set({ dotColor: s.color })} />
              ))}
              <label className="swatch relative overflow-hidden" style={{ background: 'conic-gradient(#ff5f5f,#ffd84d,#48d597,#4d8dff,#b36bff,#ff5f5f)' }}
                title="Autre couleur">
                <span className="sr-only">Autre couleur du motif</span>
                <input type="color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={design.dotColor} onChange={(e) => set({ dotColor: e.target.value })} />
              </label>
              <span className="font-mono text-xs uppercase text-subtle">{design.dotColor}</span>
            </div>
          </div>

          {/* Fond */}
          <div>
            <SubLabel id="st-bg">Fond</SubLabel>
            <div className="flex flex-wrap items-center gap-2.5" role="group" aria-labelledby="st-bg">
              {[{ label: 'Blanc', color: '#ffffff' }, { label: 'Crème', color: '#fbf6ec' }, { label: 'Bleu très clair', color: '#f0f6ff' }, { label: 'Menthe', color: '#eefaf3' }].map((s) => (
                <button key={s.color} type="button" className="swatch" style={{ background: s.color, boxShadow: design.bgColor === s.color ? undefined : 'inset 0 0 0 1.5px var(--line-strong)' }}
                  aria-label={s.label} aria-pressed={design.bgColor === s.color} onClick={() => set({ bgColor: s.color })} />
              ))}
              <label className="swatch relative overflow-hidden" style={{ background: 'conic-gradient(#ff5f5f,#ffd84d,#48d597,#4d8dff,#b36bff,#ff5f5f)' }} title="Autre fond">
                <span className="sr-only">Autre couleur de fond</span>
                <input type="color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={design.bgColor} onChange={(e) => set({ bgColor: e.target.value })} />
              </label>
              <span className="font-mono text-xs uppercase text-subtle">{design.bgColor}</span>
            </div>
          </div>

          {/* Dégradé */}
          <div>
            <div className="flex items-center gap-3">
              <button type="button" role="switch" className="switch" aria-checked={grad.enabled} aria-labelledby="st-grad" onClick={() => setGrad({ enabled: !grad.enabled })} />
              <span id="st-grad" className="text-[13px] font-semibold">Dégradé de couleur</span>
            </div>
            {grad.enabled && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-[13px] text-muted">
                  <span className="swatch relative block overflow-hidden" style={{ background: grad.color2 }}>
                    <input type="color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={grad.color2} onChange={(e) => setGrad({ color2: e.target.value })} aria-label="Seconde couleur du dégradé" />
                  </span>
                  Seconde couleur
                </label>
                <div className="seg" role="group" aria-label="Sens du dégradé">
                  {GRAD_DIRECTIONS.map((d) => (
                    <button key={d.label} type="button" aria-label={DIR_LABEL[d.label] ?? d.label} title={DIR_LABEL[d.label]}
                      aria-pressed={grad.type === d.type && (d.type === 'radial' || grad.angle === d.angle)}
                      onClick={() => setGrad({ type: d.type, angle: d.angle })}>{d.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Points */}
          <div>
            <SubLabel id="st-dots">Forme des points</SubLabel>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="group" aria-labelledby="st-dots">
              {DOT_TYPES.map((t) => (
                <button key={t.value} type="button" className="shape" aria-pressed={design.dotType === t.value} onClick={() => set({ dotType: t.value })}>
                  <ShapeGlyph name={t.value} />{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Coins */}
          <div>
            <SubLabel id="st-corners">Coins</SubLabel>
            <div className="grid grid-cols-[repeat(3,72px)] gap-2" role="group" aria-labelledby="st-corners">
              {CORNER_TYPES.map((t) => (
                <button key={t.value} type="button" className="shape" aria-label={`Coins : ${t.label}`} aria-pressed={design.cornerSquareType === t.value}
                  onClick={() => set({ cornerSquareType: t.value, cornerDotType: t.value === 'square' ? 'square' : 'dot' })}>
                  <ShapeGlyph name={CORNER_GLYPH[t.value]} />{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logo */}
          <div>
            <SubLabel>Logo au centre</SubLabel>
            {design.logo ? (
              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={design.logo} alt="Votre logo" className="h-12 w-12 rounded-xl bg-white object-contain shadow-[inset_0_0_0_1px_var(--line)]" />
                  <button type="button" className="btn btn-soft btn-sm" onClick={() => file.current?.click()}><PhotoIcon />Changer</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { set({ logo: undefined }); if (file.current) file.current.value = '' }}><TrashIcon />Retirer</button>
                </div>
                <label className="block max-w-sm">
                  <span className="flex justify-between text-[13px] font-semibold">Taille du logo<span className="font-mono tabular-nums text-subtle">{Math.round((design.logoSize ?? 0.3) * 100)} %</span></span>
                  <input type="range" min={0.15} max={0.45} step={0.05} value={design.logoSize ?? 0.3} onChange={(e) => set({ logoSize: Number(e.target.value) })}
                    className="mt-2 w-full accent-[var(--brand)]" />
                </label>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-soft" onClick={() => file.current?.click()}><PhotoIcon />Ajouter mon logo</button>
                <span className="text-[13px] text-muted">PNG ou JPG · un logo carré rend mieux</span>
              </div>
            )}
            {logoError && <p className="help text-bad" role="alert">{logoError}</p>}
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" tabIndex={-1} aria-label="Fichier du logo" onChange={onLogo} />
          </div>
        </div>
      </details>
    </div>
  )
}
