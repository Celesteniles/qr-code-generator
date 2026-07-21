'use client'

import { useEffect, useRef, useState } from 'react'
import { saveQrDesignAction } from '@/server/actions'
import {
  toDesign, DESIGN_PRESETS, DOT_TYPES, CORNER_TYPES, type QrDesign,
} from '@/lib/qr-design'

// Studio QR d'un lien : le QR de link.cg/{slug}, stylable comme dans le générateur
// (presets, couleurs, formes), sauvegardé par lien. Beau ET dynamique.
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
      qrRef.current = new QRCodeStyling({
        width: 190, height: 190, data: url, margin: 8,
        qrOptions: { errorCorrectionLevel: 'H' },
        dotsOptions: { color: design.dotColor, type: design.dotType },
        backgroundOptions: { color: design.bgColor },
        cornersSquareOptions: { type: design.cornerSquareType, color: design.dotColor },
        cornersDotOptions: { type: design.cornerDotType, color: design.dotColor },
      })
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
        qrRef.current.append(containerRef.current)
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Rafraîchit l'aperçu à chaque changement de style.
  useEffect(() => {
    qrRef.current?.update({
      dotsOptions: { color: design.dotColor, type: design.dotType },
      backgroundOptions: { color: design.bgColor },
      cornersSquareOptions: { type: design.cornerSquareType, color: design.dotColor },
      cornersDotOptions: { type: design.cornerDotType, color: design.dotColor },
    })
    setSaved(false)
  }, [design])

  async function save() {
    const res = await saveQrDesignAction(linkId, design)
    if (res.ok) setSaved(true)
  }

  const set = (patch: Partial<QrDesign>) => setDesign((d) => ({ ...d, ...patch }))

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-bold text-brand hover:opacity-80 transition"
      >
        QR
      </button>

      {open && (
        <div className="absolute right-3 top-14 z-20 w-72 card-soft p-4 flex flex-col gap-3">
          <div className="flex justify-center">
            <div ref={containerRef} className="leading-none [&_canvas]:rounded-2xl" />
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {DESIGN_PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => setDesign(p.design)}
                style={{ background: p.design.bgColor, color: p.design.dotColor }}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-[color:var(--border)] hover:scale-105 transition">
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

          {/* Forme des points */}
          <div className="grid grid-cols-3 gap-1.5">
            {DOT_TYPES.map((d) => (
              <button key={d.value} type="button" onClick={() => set({ dotType: d.value })}
                className={`py-1 rounded-lg text-[11px] font-semibold border transition ${
                  design.dotType === d.value ? 'bg-grad text-white border-transparent' : 'border-[color:var(--border)] text-[color:var(--muted)] hover:border-brand'
                }`}>
                {d.label}
              </button>
            ))}
          </div>

          {/* Coins */}
          <div className="grid grid-cols-3 gap-1.5">
            {CORNER_TYPES.map((c) => (
              <button key={c.value} type="button" onClick={() => set({ cornerSquareType: c.value })}
                className={`py-1 rounded-lg text-[11px] font-semibold border transition ${
                  design.cornerSquareType === c.value ? 'bg-grad text-white border-transparent' : 'border-[color:var(--border)] text-[color:var(--muted)] hover:border-brand'
                }`}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={save} className="btn-grad flex-1 py-2 text-xs">
              {saved ? '✓ Enregistré' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => qrRef.current?.download({ extension: 'png', name: `qr-${slug}` })}
              className="px-3 py-2 rounded-full border border-[color:var(--border)] text-xs font-semibold hover:border-brand hover:text-brand transition">PNG</button>
            <button type="button" onClick={() => qrRef.current?.download({ extension: 'svg', name: `qr-${slug}` })}
              className="px-3 py-2 rounded-full border border-[color:var(--border)] text-xs font-semibold hover:border-brand hover:text-brand transition">SVG</button>
          </div>
        </div>
      )}
    </div>
  )
}
