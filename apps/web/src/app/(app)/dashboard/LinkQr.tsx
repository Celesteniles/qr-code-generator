'use client'

import { useEffect, useRef, useState } from 'react'
import { saveQrDesignAction } from '@/server/actions'
import {
  toDesign, toQrOptions, DESIGN_PRESETS, DOT_TYPES, CORNER_TYPES, GRAD_DIRECTIONS, type QrDesign,
} from '@/lib/qr-design'

// Studio QR d'un lien : QR de link.cg/{slug} stylable comme le générateur — presets,
// couleurs, formes, dégradé, logo — sauvegardé par lien. Beau ET dynamique.
export function LinkQr({ slug, linkId, initialDesign }: { slug: string; linkId: string; initialDesign: unknown }) {
  const [open, setOpen] = useState(false)
  const [design, setDesign] = useState<QrDesign>(() => toDesign(initialDesign))
  const [saved, setSaved] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrRef = useRef<any>(null)

  const url = `https://link.cg/${slug}`

  useEffect(() => {
    if (!open) return
    let cancelled = false
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (cancelled) return
      qrRef.current = new QRCodeStyling(toQrOptions(design, url, 190))
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
        qrRef.current.append(containerRef.current)
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    qrRef.current?.update(toQrOptions(design, url, 190))
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design])

  const set = (patch: Partial<QrDesign>) => setDesign((d) => ({ ...d, ...patch }))
  const setGrad = (patch: Partial<NonNullable<QrDesign['gradient']>>) =>
    setDesign((d) => ({ ...d, gradient: { enabled: false, color2: '#0060ff', type: 'linear', angle: 0, ...d.gradient, ...patch } }))

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set({ logo: String(reader.result) })
    reader.readAsDataURL(file)
  }

  async function save() {
    const res = await saveQrDesignAction(linkId, design)
    if (res.ok) setSaved(true)
  }

  const grad = design.gradient
  const btn = (active: boolean) =>
    `py-1 rounded-lg text-[11px] font-semibold border transition ${
      active ? 'bg-brand text-white border-transparent' : 'border-[color:var(--border)] text-[color:var(--muted)] hover:border-brand'
    }`

  return (
    <div className="shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-bold text-brand hover:opacity-80 transition">
        QR
      </button>

      {open && (
        <div className="absolute right-3 top-14 z-20 w-72 card-soft p-4 flex flex-col gap-3 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-center">
            <div ref={containerRef} className="leading-none [&_canvas]:rounded-2xl" />
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {DESIGN_PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => setDesign((d) => ({ ...d, ...p.design }))}
                style={{ background: p.design.bgColor, color: p.design.dotColor }}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-[color:var(--border)] hover:opacity-90 transition">
                {p.label}
              </button>
            ))}
          </div>

          {/* Couleurs */}
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="color" value={design.dotColor} onChange={(e) => set({ dotColor: e.target.value })}
                className="w-7 h-7 rounded-lg border border-[color:var(--border)] cursor-pointer bg-transparent" />
              <span className="text-[color:var(--muted)]">Points</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="color" value={design.bgColor} onChange={(e) => set({ bgColor: e.target.value })}
                className="w-7 h-7 rounded-lg border border-[color:var(--border)] cursor-pointer bg-transparent" />
              <span className="text-[color:var(--muted)]">Fond</span>
            </label>
          </div>

          {/* Dégradé */}
          <div className="border-t border-[color:var(--border)] pt-2">
            <label className="flex items-center justify-between text-xs cursor-pointer mb-1.5">
              <span className="font-semibold text-[color:var(--foreground)]">Dégradé</span>
              <input type="checkbox" checked={!!grad?.enabled} onChange={(e) => setGrad({ enabled: e.target.checked })} className="accent-[color:var(--brand)]" />
            </label>
            {grad?.enabled && (
              <div className="flex items-center gap-2">
                <input type="color" value={grad.color2} onChange={(e) => setGrad({ color2: e.target.value })}
                  className="w-7 h-7 rounded-lg border border-[color:var(--border)] cursor-pointer bg-transparent" />
                <div className="flex gap-1">
                  {GRAD_DIRECTIONS.map((d) => (
                    <button key={d.label} type="button" onClick={() => setGrad({ type: d.type, angle: d.angle })}
                      className={`w-7 h-7 rounded-lg text-sm ${btn(grad.type === d.type && grad.angle === d.angle)}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Forme des points */}
          <div className="grid grid-cols-3 gap-1.5">
            {DOT_TYPES.map((d) => (
              <button key={d.value} type="button" onClick={() => set({ dotType: d.value })} className={btn(design.dotType === d.value)}>
                {d.label}
              </button>
            ))}
          </div>

          {/* Coins */}
          <div className="grid grid-cols-3 gap-1.5">
            {CORNER_TYPES.map((c) => (
              <button key={c.value} type="button" onClick={() => set({ cornerSquareType: c.value })} className={btn(design.cornerSquareType === c.value)}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Logo */}
          <div className="border-t border-[color:var(--border)] pt-2 flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-brand cursor-pointer hover:opacity-80">
              {design.logo ? 'Changer le logo' : 'Ajouter un logo'}
              <input type="file" accept="image/*" onChange={onLogo} className="hidden" />
            </label>
            {design.logo && (
              <button type="button" onClick={() => set({ logo: undefined })} className="text-xs text-[color:var(--muted)] hover:text-red-500">
                retirer
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={save} className="btn-grad flex-1 py-2 text-xs">
              {saved ? '✓ Enregistré' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => qrRef.current?.download({ extension: 'png', name: `qr-${slug}` })}
              className="px-3 py-2 rounded-xl border border-[color:var(--border)] text-xs font-semibold hover:border-brand hover:text-brand transition">PNG</button>
            <button type="button" onClick={() => qrRef.current?.download({ extension: 'svg', name: `qr-${slug}` })}
              className="px-3 py-2 rounded-xl border border-[color:var(--border)] text-xs font-semibold hover:border-brand hover:text-brand transition">SVG</button>
          </div>
        </div>
      )}
    </div>
  )
}
