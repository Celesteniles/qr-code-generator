'use client'

import { useEffect, useState } from 'react'
import { ArrowDownTrayIcon, LockClosedIcon, TrashIcon } from '@heroicons/react/24/outline'
import { QrCanvas } from '@/components/kit/QrCanvas'
import { toDesign } from '@/lib/qr-design'
import type { LocalQr } from '@/lib/local-qr'
import { downloadQr, qrFileName } from './qr-file'
import { forgetLocalQr } from './useLocalQrs'

const KIND_LABEL: Record<string, string> = {
  url: 'Lien', link: 'Lien', wifi: 'Wi‑Fi', vcard: 'Contact', whatsapp: 'WhatsApp', text: 'Texte',
  email: 'E‑mail', sms: 'SMS', tel: 'Téléphone', phone: 'Téléphone', menu: 'Menu',
}

function when(ts: number): string {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  if (d.toDateString() === new Date().toDateString()) return "créé aujourd'hui"
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/** QR fixe créé dans ce navigateur : téléchargeable, retirable en deux temps. */
export function LocalQrCard({ qr }: { qr: LocalQr }) {
  const [confirm, setConfirm] = useState(false)
  const design = toDesign(qr.design)

  // La demande de confirmation retombe d'elle-même si l'on ne va pas au bout.
  useEffect(() => {
    if (!confirm) return
    const t = setTimeout(() => setConfirm(false), 4000)
    return () => clearTimeout(t)
  }, [confirm])

  const kind = KIND_LABEL[qr.kind] ?? (qr.kind ? qr.kind[0].toUpperCase() + qr.kind.slice(1) : 'QR')
  const date = when(qr.createdAt)

  return (
    <article className="flex flex-col rounded-3xl bg-surface p-3 shadow-[inset_0_0_0_1px_var(--line)]">
      <div className="relative grid place-items-center rounded-[18px] px-2.5 pb-[22px] pt-12 shadow-[inset_0_0_0_1px_var(--line)]">
        <span className="pill pill-soft absolute left-2.5 top-2.5"><LockClosedIcon aria-hidden="true" />QR fixe</span>
        <div className="qr-thumb rounded-2xl p-2.5">
          <QrCanvas data={qr.data} design={design} size={132} />
        </div>
      </div>
      <div className="px-1.5 pb-1.5 pt-3.5">
        <h3 className="truncate font-display text-[17px] font-[650] tracking-[-.01em]" title={qr.label}>{qr.label || 'QR sans nom'}</h3>
        <p className="mt-0.5 truncate text-[13px] text-muted">{kind}{date ? ` · ${date}` : ''}</p>
      </div>
      <div className="mt-2.5 flex items-center gap-0.5 border-t border-line px-0.5 pt-2.5">
        <span className="mr-auto whitespace-nowrap text-[13px] text-subtle" title="Un QR fixe ne compte pas ses visites et ne se modifie pas.">Non suivi</span>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Télécharger le QR « ${qr.label} » (PNG)`}
          title="Télécharger"
          onClick={() => downloadQr(qr.data, design, 'png', qrFileName(qr.label))}
        >
          <ArrowDownTrayIcon />
        </button>
        {confirm ? (
          <button type="button" className="btn btn-danger btn-sm" onClick={() => forgetLocalQr(qr.id)} autoFocus>
            Confirmer ?
          </button>
        ) : (
          <button type="button" className="icon-btn danger" aria-label={`Retirer « ${qr.label} » de cet appareil`} title="Retirer" onClick={() => setConfirm(true)}>
            <TrashIcon />
          </button>
        )}
      </div>
    </article>
  )
}
