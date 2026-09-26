'use client'

import { useRef, useState } from 'react'
import { ArrowDownTrayIcon, CheckIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { QrCanvas, type QrCanvasHandle } from '@/components/kit/QrCanvas'
import { DEFAULT_DESIGN } from '@/lib/qr-design'
import { qrLinkUrl } from '@/lib/short-link'

/** Adresse courte publique d'une carte. */
export function cardShortUrl(slug: string) {
  return `https://link.cg/${slug}`
}

/** `link.cg/<slug>` + bouton copier (en-tête de l'éditeur). */
export function CopyCardLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState<null | 'ok' | 'fail'>(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(cardShortUrl(slug))
      setCopied('ok')
    } catch {
      setCopied('fail')
    }
    setTimeout(() => setCopied(null), 2500)
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="pill pill-soft min-w-0 font-mono">
        <span className="truncate">link.cg/{slug}</span>
      </span>
      <button type="button" onClick={copy} className="icon-btn" aria-label={`Copier le lien link.cg/${slug}`}>
        {copied === 'ok' ? <CheckIcon className="anim-pop text-ok" /> : <DocumentDuplicateIcon />}
      </button>
      <span className="text-xs font-semibold text-ok" aria-live="polite">
        {copied === 'ok' ? 'Lien copié' : copied === 'fail' ? <span className="text-bad">Copie impossible, sélectionnez le lien</span> : ''}
      </span>
    </div>
  )
}

/** QR de la carte, téléchargeable pour les flyers, badges, vitrines. */
export function CardQr({ slug }: { slug: string }) {
  const qr = useRef<QrCanvasHandle>(null)
  const [busy, setBusy] = useState(false)

  async function download(ext: 'png' | 'svg') {
    setBusy(true)
    try {
      await qr.current?.download(ext, `carte-${slug}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card mt-5 flex items-center gap-4 p-4" aria-labelledby="carte-qr-titre">
      <div className="qr-thumb shrink-0">
        <QrCanvas ref={qr} data={qrLinkUrl(slug)} design={DEFAULT_DESIGN} size={112} />
      </div>
      <div className="min-w-0">
        <h2 id="carte-qr-titre" className="text-sm font-semibold">Le QR de votre carte</h2>
        <p className="mt-0.5 text-[13px] text-muted">Pour vos flyers, votre badge ou votre vitrine. Il reste valable quand vous modifiez la carte.</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button type="button" className="btn btn-soft btn-sm" onClick={() => download('png')} disabled={busy}>
            <ArrowDownTrayIcon />Télécharger en PNG
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => download('svg')} disabled={busy}>
            SVG (impression)
          </button>
        </div>
      </div>
    </section>
  )
}
