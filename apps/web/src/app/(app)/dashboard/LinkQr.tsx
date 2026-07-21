'use client'

import { useEffect, useRef, useState } from 'react'

// QR dynamique d'un lien : encode https://link.cg/{slug}. La destination réelle
// peut changer sans réimprimer — c'est tout l'intérêt du lien dynamique.
export function LinkQr({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)
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
        width: 180, height: 180, data: url, margin: 8,
        qrOptions: { errorCorrectionLevel: 'H' },
        dotsOptions: { color: '#18181b', type: 'rounded' },
        backgroundOptions: { color: '#ffffff' },
        cornersSquareOptions: { type: 'extra-rounded', color: '#2563eb' },
        cornersDotOptions: { type: 'dot', color: '#2563eb' },
      })
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
        qrRef.current.append(containerRef.current)
      }
    })
    return () => { cancelled = true }
  }, [open, url])

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        QR
      </button>

      {open && (
        <div className="absolute right-4 z-10 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col items-center gap-3">
          <div ref={containerRef} className="leading-none" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => qrRef.current?.download({ extension: 'png', name: `qr-${slug}` })}
              className="text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg"
            >
              PNG
            </button>
            <button
              type="button"
              onClick={() => qrRef.current?.download({ extension: 'svg', name: `qr-${slug}` })}
              className="text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg"
            >
              SVG
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
