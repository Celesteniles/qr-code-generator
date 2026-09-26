'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Illustration } from '@/components/kit/Illustration'
import { rememberTour, shouldOfferTour } from '@/lib/tour-prompt'

// Invitation à la visite guidée, montrée une seule fois au visiteur sur l'accueil.
// <dialog> natif : focus piégé, Échap, fond inerte, rendu au-dessus de tout.

const DELAY_MS = 1200
const CLOSE_MS = 180

export function TourPrompt() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!shouldOfferTour()) return
    // Laisser d'abord la page se montrer
    const t = setTimeout(() => {
      const d = dialog.current
      if (d && !d.open && !document.querySelector('dialog[open]')) d.showModal()
    }, DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  function close(state: 'dismissed' | 'seen') {
    rememberTour(state)
    setClosing(true)
    setTimeout(() => { dialog.current?.close(); setClosing(false) }, CLOSE_MS)
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="tour-prompt-title"
      aria-describedby="tour-prompt-desc"
      data-closing={closing}
      // Échap : on mémorise le refus (le navigateur ferme lui-même la boîte)
      onCancel={(e) => { e.preventDefault(); close('dismissed') }}
      // Clic sur le fond (hors de la boîte) = « Plus tard »
      onClick={(e) => { if (e.target === e.currentTarget) close('dismissed') }}
      className="anim-pop m-auto w-[min(440px,calc(100%-24px))] overflow-hidden rounded-[28px] bg-surface p-0 text-ink shadow-[0_0_0_1px_var(--line),var(--shadow-lg)] transition-[opacity,transform] duration-200 backdrop:bg-[rgba(12,12,16,.45)] backdrop:animate-[fade_.25s_ease-out] data-[closing=true]:scale-95 data-[closing=true]:opacity-0 max-sm:mb-3 max-sm:mt-auto"
    >
      <div className="relative bg-sky">
        <Illustration name="welcome" height={170} />
        <button type="button" className="icon-btn absolute right-3 top-3 bg-surface/70" onClick={() => close('dismissed')} aria-label="Fermer">
          <XMarkIcon />
        </button>
      </div>
      <div className="p-6 pt-5">
        <p className="eyebrow">Première visite ?</p>
        <h2 id="tour-prompt-title" className="h2 mt-1.5">Découvrez link.cg en 1 minute</h2>
        <p id="tour-prompt-desc" className="mt-2 text-[15px] text-muted">
          Trois questions pour trouver ce qui vous convient : un lien court à partager, un QR code à imprimer ou une carte de visite.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link href="/bienvenue" className="btn btn-cta grow" onClick={() => rememberTour('seen')} autoFocus>
            Commencer la visite <ArrowRightIcon />
          </Link>
          <button type="button" className="btn btn-ghost" onClick={() => close('dismissed')}>Plus tard</button>
        </div>
        <p className="mt-4 text-center text-xs text-subtle">Toujours accessible depuis « Visite guidée » dans le menu.</p>
      </div>
    </dialog>
  )
}
