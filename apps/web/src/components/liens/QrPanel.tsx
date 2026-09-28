'use client'

import { useCallback, useRef, useState } from 'react'
import { ArrowDownTrayIcon, ChatBubbleOvalLeftEllipsisIcon, ShareIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { QrCanvas, type QrCanvasHandle } from '@/components/kit/QrCanvas'
import { DEFAULT_DESIGN, type QrDesign } from '@/lib/qr-design'
import { CopyButton } from './CopyButton'
import { StyleDrawer } from './StyleDrawer'
import { qrFileName } from './qr-file'
import { qrLinkUrl } from '@/lib/short-link'

/** Colonne gauche de la fiche : le QR, l'adresse courte, partager, télécharger, style. */
export function QrPanel({ linkId, slug, host, url, initialDesign }: {
  linkId: string
  slug: string
  /** Domaine du lien (link.cg ou domaine personnalisé). */
  host: string
  url: string
  initialDesign: QrDesign | null
}) {
  const [design, setDesign] = useState<QrDesign>(initialDesign ?? DEFAULT_DESIGN)
  const [styling, setStyling] = useState(false)
  const [saved, setSaved] = useState(false)
  const qr = useRef<QrCanvasHandle>(null)
  const name = qrFileName(slug)

  const close = useCallback(() => setStyling(false), [])
  const onSaved = useCallback((d: QrDesign) => {
    setDesign(d)
    setStyling(false)
    setSaved(true)
  }, [])

  async function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ url }) } catch { /* partage annulé */ }
    } else {
      try { await navigator.clipboard.writeText(url) } catch { /* presse-papiers indisponible */ }
    }
  }

  return (
    // Tablette : QR à gauche, actions à droite (pas de boutons étirés sur toute la
    // largeur) ; téléphone et grand écran (colonne latérale) : l'un sous l'autre.
    <div className="grid gap-3.5 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:items-center md:gap-6 xl:grid-cols-1 xl:gap-3.5">
      <div className="board">
        <div className="qrbox"><QrCanvas ref={qr} data={qrLinkUrl(slug, host)} design={design} size={240} /></div>
      </div>

      <div className="grid min-w-0 gap-3.5">

      <div className="flex items-center gap-1.5 rounded-full bg-soft py-1.5 pl-4 pr-1.5 font-mono text-[13px]">
        <span className="min-w-0 flex-1 truncate">{host}/{slug}</span>
        <CopyButton text={url} />
        <button type="button" className="icon-btn" onClick={share} aria-label="Partager le lien" title="Partager"><ShareIcon /></button>
      </div>

      <a
        className="btn btn-whatsapp btn-lg w-full"
        href={`https://wa.me/?text=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ChatBubbleOvalLeftEllipsisIcon aria-hidden="true" />Partager le lien sur WhatsApp
      </a>
      <button type="button" className="btn btn-cta btn-lg w-full" onClick={() => qr.current?.download('png', name)}>
        <ArrowDownTrayIcon aria-hidden="true" />Télécharger le QR
      </button>
      <p className="-mt-1.5 text-center text-xs text-subtle">
        Image PNG haute définition.{' '}
        <button type="button" className="link text-xs" onClick={() => qr.current?.download('svg', name)}>
          Version SVG pour l&apos;imprimeur
        </button>
      </p>
      <button type="button" className="btn btn-soft w-full" onClick={() => { setSaved(false); setStyling(true) }} aria-haspopup="dialog">
        <SparklesIcon aria-hidden="true" />Changer le style
      </button>
      <p className="text-center text-xs text-subtle" aria-live="polite">
        {saved
          ? 'Nouveau style enregistré. Les QR déjà imprimés continuent de fonctionner.'
          : 'Changer le style crée un nouveau visuel : réimprimez seulement si vous le souhaitez. Le lien, lui, ne change jamais.'}
      </p>
      </div>

      {styling && <StyleDrawer linkId={linkId} data={qrLinkUrl(slug, host)} initial={design} onClose={close} onSaved={onSaved} />}
    </div>
  )
}
