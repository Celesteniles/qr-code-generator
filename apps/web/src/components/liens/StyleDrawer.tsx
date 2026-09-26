'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { ArrowPathIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { QrCanvas } from '@/components/kit/QrCanvas'
import { ShapeGlyph, type GlyphName } from '@/components/kit/ShapeGlyph'
import { saveQrDesignAction } from '@/server/actions'
import {
  DESIGN_PRESETS, DOT_TYPES, CORNER_TYPES, GRAD_DIRECTIONS, type QrDesign, type CornerSquareType,
} from '@/lib/qr-design'

// Tiroir « Style du QR » de la fiche d'un lien (porté de l'ancien LinkQr du
// dashboard) : modèles, couleur, dégradé, points, coins, logo.

const SWATCHES: { label: string; color: string; color2?: string }[] = [
  { label: 'Encre', color: '#16161d' },
  { label: 'Terre', color: '#7a2e12' },
  { label: 'Bleu', color: '#0060ff' },
  { label: 'Dégradé bleu-violet', color: '#0060ff', color2: '#7c3aed' },
  { label: 'Forêt', color: '#1f9d63' },
]

const CORNER_GLYPH: Record<CornerSquareType, GlyphName> = { square: 'c-square', 'extra-rounded': 'c-rounded', dot: 'c-dot' }
const GRAD_LABEL: Record<string, string> = { '→': 'Horizontal', '↓': 'Vertical', '↘': 'En diagonale', '◯': 'Circulaire' }

/** Taille maximale d'un logo : il est enregistré avec le style du lien. */
const LOGO_MAX = 500 * 1024

export function StyleDrawer({ linkId, data, initial, onClose, onSaved }: {
  linkId: string
  data: string
  initial: QrDesign
  onClose: () => void
  onSaved: (design: QrDesign) => void
}) {
  const [design, setDesign] = useState<QrDesign>(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  // Focus dans le tiroir à l'ouverture, Échap pour fermer, piège de tabulation simple.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeBtn.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current() }
      if (e.key === 'Tab' && panel.current) {
        const items = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
        if (!items.length) return
        const first = items[0], last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])

  const set = (patch: Partial<QrDesign>) => { setError(null); setDesign((d) => ({ ...d, ...patch })) }
  const grad = design.gradient
  const setGrad = (patch: Partial<NonNullable<QrDesign['gradient']>>) =>
    set({ gradient: { enabled: false, color2: '#7c3aed', type: 'linear', angle: 45, ...grad, ...patch } })

  const swatchOn = (s: (typeof SWATCHES)[number]) =>
    design.dotColor.toLowerCase() === s.color && (s.color2 ? !!grad?.enabled && grad.color2.toLowerCase() === s.color2 : !grad?.enabled)

  function pickSwatch(s: (typeof SWATCHES)[number]) {
    set({
      dotColor: s.color,
      gradient: s.color2
        ? { type: 'linear', angle: 45, ...grad, enabled: true, color2: s.color2 }
        : grad ? { ...grad, enabled: false } : undefined,
    })
  }

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > LOGO_MAX) { setError('Ce logo est trop lourd. Choisissez une image de moins de 500 Ko.'); return }
    const reader = new FileReader()
    reader.onload = () => set({ logo: String(reader.result) })
    reader.readAsDataURL(file)
  }

  function save() {
    startTransition(async () => {
      try {
        const res = await saveQrDesignAction(linkId, design)
        if (res.ok) onSaved(design)
        else setError("Le style n'a pas pu être enregistré. Reconnectez-vous puis réessayez.")
      } catch {
        setError("Le style n'a pas pu être enregistré. Vérifiez votre connexion puis réessayez.")
      }
    })
  }

  return (
    <div className="drawer">
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div ref={panel} className="panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="panel-head">
          <h2 id={titleId} className="h2 grow">Style du QR</h2>
          <button ref={closeBtn} type="button" className="icon-btn" onClick={onClose} aria-label="Fermer"><XMarkIcon /></button>
        </div>

        <div className="panel-body">
          <div className="board p-6">
            <div className="qrbox"><QrCanvas data={data} design={design} size={190} /></div>
          </div>

          <Heading>Modèles</Heading>
          <div className="mt-2 flex flex-wrap gap-2">
            {DESIGN_PRESETS.map((p) => (
              <button key={p.label} type="button" className="chip h-9 px-3.5 text-[13px]" onClick={() => set({ ...p.design, logo: design.logo, logoSize: design.logoSize })}>
                <span className="h-4 w-4 rounded-full" style={{ background: p.design.dotColor, boxShadow: `0 0 0 3px ${p.design.bgColor}, 0 0 0 4px var(--line)` }} aria-hidden="true" />
                {p.label}
              </button>
            ))}
          </div>

          <Heading>Couleur</Heading>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            {SWATCHES.map((s) => (
              <button
                key={s.label}
                type="button"
                className="swatch"
                aria-pressed={swatchOn(s)}
                aria-label={s.label}
                title={s.label}
                style={{ background: s.color2 ? `linear-gradient(135deg, ${s.color}, ${s.color2})` : s.color }}
                onClick={() => pickSwatch(s)}
              />
            ))}
            <ColorField label="Points" value={design.dotColor} onChange={(v) => set({ dotColor: v })} />
            <ColorField label="Fond" value={design.bgColor} onChange={(v) => set({ bgColor: v })} />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <span id={`${titleId}-grad`} className="grow text-sm font-semibold">Dégradé</span>
            <button
              type="button"
              className="switch"
              role="switch"
              aria-checked={!!grad?.enabled}
              aria-labelledby={`${titleId}-grad`}
              onClick={() => setGrad({ enabled: !grad?.enabled })}
            />
          </div>
          {grad?.enabled && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ColorField label="Seconde couleur" value={grad.color2} onChange={(v) => setGrad({ color2: v })} />
              <div className="seg" role="group" aria-label="Direction du dégradé">
                {GRAD_DIRECTIONS.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    aria-pressed={grad.type === d.type && (d.type === 'radial' || grad.angle === d.angle)}
                    aria-label={GRAD_LABEL[d.label] ?? d.label}
                    title={GRAD_LABEL[d.label] ?? d.label}
                    onClick={() => setGrad({ type: d.type, angle: d.angle })}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Heading>Points</Heading>
          <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Forme des points">
            {DOT_TYPES.map((d) => (
              <button key={d.value} type="button" className="shape" aria-pressed={design.dotType === d.value} onClick={() => set({ dotType: d.value })}>
                <ShapeGlyph name={d.value} />{d.label}
              </button>
            ))}
          </div>

          <Heading>Coins</Heading>
          <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Forme des coins">
            {CORNER_TYPES.map((c) => (
              <button
                key={c.value}
                type="button"
                className="shape"
                aria-pressed={design.cornerSquareType === c.value}
                onClick={() => set({ cornerSquareType: c.value, cornerDotType: c.value === 'square' ? 'square' : 'dot' })}
              >
                <ShapeGlyph name={CORNER_GLYPH[c.value]} />{c.label}
              </button>
            ))}
          </div>

          <Heading>Logo au centre</Heading>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="btn btn-soft btn-sm cursor-pointer focus-within:shadow-[var(--ring)]">
              <PhotoIcon aria-hidden="true" />
              {design.logo ? 'Changer le logo' : 'Ajouter un logo'}
              <input type="file" accept="image/*" onChange={onLogo} className="sr-only" />
            </label>
            {design.logo && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ logo: undefined })}>Retirer le logo</button>
            )}
          </div>

          <div className="tip blue mt-6">
            <span className="tip-ico"><ArrowPathIcon aria-hidden="true" /></span>
            <div><strong>Rien ne casse</strong>Les QR déjà imprimés continuent de fonctionner, quel que soit le style.</div>
          </div>

          {error && <p className="tip bad mt-4" role="alert">{error}</p>}
        </div>

        <div className="panel-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="button" className="btn btn-cta ml-auto" onClick={save} disabled={pending}>
            {pending ? 'Enregistrement…' : 'Enregistrer le style'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 text-sm font-semibold">{children}</div>
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 text-[13px] font-medium text-muted shadow-[inset_0_0_0_1.5px_var(--line-strong)] focus-within:shadow-[inset_0_0_0_1.5px_var(--brand),var(--ring)]">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
      />
      {label}
    </label>
  )
}
