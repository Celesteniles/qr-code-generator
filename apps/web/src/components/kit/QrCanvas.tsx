'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
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
  // Squelette jusqu'au premier dessin (la bibliothèque est chargée à la demande)
  const [ready, setReady] = useState(false)

  // Clé stable : un style recréé à l'identique (nouvel objet à chaque rendu du
  // parent, ex. frappe dans la recherche) ne provoque pas de nouveau dessin.
  const optionsKey = JSON.stringify([data, size, design])

  useEffect(() => {
    let cancelled = false
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (cancelled || !box.current) return
      if (!qr.current) {
        qr.current = new QRCodeStyling(toQrOptions(design, data, size))
        box.current.innerHTML = ''
        qr.current.append(box.current)
        setReady(true)
      } else {
        qr.current.update(toQrOptions(design, data, size))
      }
    })
    return () => { cancelled = true }
    // design/data/size sont couverts par optionsKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey])

  useImperativeHandle(ref, () => ({
    async download(ext, name, exportSize = 1024) {
      const { default: QRCodeStyling } = await import('qr-code-styling')
      const out = new QRCodeStyling(toQrOptions(design, data, exportSize))
      await out.download({ extension: ext, name })
    },
  }), [data, design])

  return (
    <div
      className={`relative leading-none ${className}`}
      style={{ width: size, maxWidth: '100%', aspectRatio: '1' }}
      role="img"
      aria-label="Aperçu du QR code"
      aria-busy={!ready}
    >
      {!ready && <div className="skeleton absolute inset-0 rounded-[10px]" aria-hidden="true" />}
      <div
        ref={box}
        className={`h-full w-full transition-opacity duration-300 [&_canvas]:h-auto [&_canvas]:max-w-full ${ready ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
})
