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
}

const MODES: { id: Mode; title: string; desc: string; icon: typeof LinkIcon; bg: string }[] = [
  { id: 'lien', title: 'Lien court', desc: 'À partager sur WhatsApp, Facebook, SMS · QR inclus', icon: LinkIcon, bg: 'bg-sky' },
  { id: 'qr', title: 'QR code', desc: 'À imprimer : affiche, menu, emballage', icon: QrCodeIcon, bg: 'bg-sun' },
]
const modeCls = 'flex items-center gap-3.5 rounded-[20px] bg-surface px-4 py-3.5 text-left shadow-[inset_0_0_0_1.5px_var(--line-strong)] transition-shadow hover:shadow-[inset_0_0_0_1.5px_var(--ink)]'

export function Creer({ initialMode, initialUrl, initialType, deviceRoute, viewer }: CreerProps) {
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
    setSuccess({ id: res.id, slug: res.slug, kind: payload.kind, designSaved: res.designSaved, design: payload.design, fileName })
    return null
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 px-4 py-3.5 lg:px-8 lg:py-[18px]">
        <Link className="btn btn-ghost btn-sm" href="/"><ArrowLeftIcon />Accueil</Link>
        {guest && mode === 'qr' && <span className="pill pill-soft ml-auto">QR fixe : gratuit, sans inscription</span>}
      </div>

      <div className="px-4 pb-16 pt-1 lg:px-8 lg:pb-14 lg:pt-2">
        <h1 className="h1">Que voulez-vous créer ?</h1>
        <p className="lead mt-2">Quelques questions simples. L&apos;aperçu se met à jour pendant que vous répondez.</p>

        <div className="mt-6 grid gap-3 md:grid-cols-3" role="group" aria-label="Que voulez-vous créer ?">
          {MODES.map((m) => {
            const active = mode === m.id
            return (
              <button key={m.id} type="button" aria-pressed={active} onClick={() => switchMode(m.id)}
                className={`${modeCls} ${active ? '!bg-soft !shadow-[inset_0_0_0_2px_var(--ink)]' : ''}`}>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-[#16161d] ${m.bg}`}><m.icon className="h-[22px] w-[22px]" /></span>
                <span className="min-w-0">
                  <strong className="block font-display text-[17px] tracking-[-.01em]">{m.title}</strong>
                  <span className="block text-[13px] text-muted">{m.desc}</span>
                </span>
              </button>
            )
          })}
          <Link href="/carte" className={modeCls}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-coral-tint text-[#16161d]"><UserIcon className="h-[22px] w-[22px]" /></span>
            <span className="min-w-0">
              <strong className="block font-display text-[17px] tracking-[-.01em]">Carte de visite</strong>
              <span className="block text-[13px] text-muted">Votre profil pro en lien et QR</span>
            </span>
          </Link>
        </div>

        <div className="mt-6">
          {mode === 'lien'
            ? <LinkMode initialUrl={initialUrl} deviceRoute={deviceRoute} viewer={viewer} onCreate={create} />
            : <QrMode initialType={initialType ?? 'site'} initialUrl={initialUrl} viewer={viewer} onCreate={create} />}
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
