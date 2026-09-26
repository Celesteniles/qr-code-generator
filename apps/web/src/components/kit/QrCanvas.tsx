'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { toQrOptions, type QrDesign } from '@/lib/qr-design'

// Aperçu QR réel (qr-code-styling), partagé par Créer, la fiche d'un lien et les
// vignettes. Le style vient de lib/qr-design (même vocabulaire que les liens).

export interface QrCanvasHandle {
  /** Télécharge le QR à la taille demandée (indépendante de l'aperçu). */
  download: (ext: 'png' | 'svg', name: string, size?: number) => Promise<void>
}

export const QrCanvas = forwardRef<QrCanvasHandle, {
  data: string
  design: QrDesign
  size?: number
  className?: string
}>(function QrCanvas({ data, design, size = 240, className = '' }, ref) {
  const box = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qr = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (cancelled || !box.current) return
      if (!qr.current) {
        qr.current = new QRCodeStyling(toQrOptions(design, data, size))
        box.current.innerHTML = ''
        qr.current.append(box.current)
      } else {
        qr.current.update(toQrOptions(design, data, size))
      }
    })
    return () => { cancelled = true }
  }, [data, design, size])

  useImperativeHandle(ref, () => ({
    async download(ext, name, exportSize = 1024) {
      const { default: QRCodeStyling } = await import('qr-code-styling')
      const out = new QRCodeStyling(toQrOptions(design, data, exportSize))
      await out.download({ extension: ext, name })
    },
  }), [data, design])

  return (
    <div
      ref={box}
      className={`leading-none [&_canvas]:h-auto [&_canvas]:max-w-full ${className}`}
      style={{ width: size, maxWidth: '100%', aspectRatio: '1' }}
      role="img"
      aria-label="Aperçu du QR code"
    />
  )
})
