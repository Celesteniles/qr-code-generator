'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeftIcon, LinkIcon, QrCodeIcon, UserIcon } from '@heroicons/react/24/outline'
import type { Viewer } from '@/components/kit/shell/types'
import type { ContentType } from './content'
import { SignupDrawer, SuccessDrawer, type SuccessInfo } from './drawers'
import { LinkMode } from './LinkMode'
import { publishLink, type CreateFn, type LinkPayload } from './publish'
import { QrMode } from './QrMode'

// Écran Créer (proposition D) : Lien court · QR code · Carte de visite.
// Le compte n'est demandé qu'au moment utile (lien court, QR modifiable).

export type Mode = 'lien' | 'qr'

export interface CreerProps {
  initialMode: Mode
  initialUrl: string
  initialType: ContentType | null
  /** `?type=app` en mode lien : « Selon le téléphone » présélectionné. */
  deviceRoute: boolean
  viewer: Viewer
  /** Domaines possibles pour un lien : link.cg d'abord, puis les domaines personnalisés actifs. */
  hosts: string[]
}

const MODES: { id: Mode; title: string; desc: string; icon: typeof LinkIcon; bg: string }[] = [
  { id: 'lien', title: 'Lien court', desc: 'À partager sur WhatsApp, Facebook, SMS · QR inclus', icon: LinkIcon, bg: 'bg-sky' },
  { id: 'qr', title: 'QR code', desc: 'À imprimer : affiche, menu, emballage', icon: QrCodeIcon, bg: 'bg-sun' },
]
// Mobile : trois colonnes, icône et titre seulement ; à partir de md, icône + titre + description.
const modeCls = 'flex flex-col items-center gap-2 rounded-[18px] bg-surface px-2 py-3 text-center shadow-[inset_0_0_0_1px_var(--line)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--line-strong)] md:flex-row md:gap-3.5 md:rounded-[20px] md:px-4 md:py-3.5 md:text-left'

export function Creer({ initialMode, initialUrl, initialType, deviceRoute, viewer, hosts }: CreerProps) {
  const guest = !viewer.user
  const [mode, setMode] = useState<Mode>(initialMode)
  const [signup, setSignup] = useState<LinkPayload | null>(null)
  const [success, setSuccess] = useState<SuccessInfo | null>(null)

  function switchMode(m: Mode) {
    setMode(m)
    // Garde l'onglet dans l'adresse (retour arrière, partage), sans recharger la page.
    try {
      const params = new URLSearchParams(window.location.search)
      params.set('mode', m)
      window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
    } catch { /* sans conséquence */ }
  }

  const create: CreateFn = async (payload, fileName) => {
    if (guest) { setSignup(payload); return null }
    const res = await publishLink(payload)
    if (!res.ok) return res.message
    setSuccess({ id: res.id, slug: res.slug, host: res.host, kind: payload.kind, designSaved: res.designSaved, design: payload.design, fileName })
    return null
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 px-4 py-3.5 lg:px-8 lg:py-[18px]">
        <Link className="btn btn-ghost btn-sm" href="/"><ArrowLeftIcon />Accueil</Link>
        {guest && mode === 'qr' && <span className="pill pill-soft ml-auto">QR fixe : gratuit, sans inscription</span>}
      </div>

      <div className="px-4 pb-16 pt-1 lg:px-8 lg:pb-14 lg:pt-2">
        <h1 className="h1">Que voulez-vous créer ?</h1>
        <p className="lead mt-2">Quelques questions simples. L&apos;aperçu se met à jour pendant que vous répondez.</p>

        <div className="mt-6 grid grid-cols-3 gap-2 md:gap-3" role="group" aria-label="Que voulez-vous créer ?">
          {MODES.map((m) => {
            const active = mode === m.id
            return (
              <button key={m.id} type="button" aria-pressed={active} onClick={() => switchMode(m.id)}
                className={`${modeCls} ${active ? '!bg-brand-tint !shadow-[inset_0_0_0_2px_var(--brand)]' : ''}`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] text-[#16161d] md:h-11 md:w-11 ${m.bg}`}><m.icon className="h-[22px] w-[22px]" aria-hidden="true" /></span>
                <span className="min-w-0">
                  <strong className="block font-display text-[15px] leading-tight tracking-[-.01em] md:text-[17px]">{m.title}</strong>
                  <span className="hidden text-[13px] text-muted md:block">{m.desc}</span>
                </span>
              </button>
            )
          })}
          <Link href="/carte" className={modeCls}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-coral-tint text-[#16161d] md:h-11 md:w-11"><UserIcon className="h-[22px] w-[22px]" aria-hidden="true" /></span>
            <span className="min-w-0">
              <strong className="block font-display text-[15px] leading-tight tracking-[-.01em] md:text-[17px]">Carte de visite</strong>
              <span className="hidden text-[13px] text-muted md:block">Votre profil pro en lien et QR</span>
            </span>
          </Link>
        </div>

        <div key={mode} className="anim-rise mt-6">
          {mode === 'lien'
            ? <LinkMode initialUrl={initialUrl} deviceRoute={deviceRoute} viewer={viewer} hosts={hosts} onCreate={create} />
            : <QrMode initialType={initialType ?? 'site'} initialUrl={initialUrl} viewer={viewer} hosts={hosts} onCreate={create} />}
        </div>
      </div>

      <SignupDrawer
        open={signup !== null}
        payload={signup}
        onClose={() => setSignup(null)}
        nextPath={`/creer?mode=${mode}`}
      />
      <SuccessDrawer info={success} onClose={() => setSuccess(null)} />
    </div>
  )
}
