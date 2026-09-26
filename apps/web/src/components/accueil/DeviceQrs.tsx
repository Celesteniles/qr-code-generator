'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { QrCanvas } from '@/components/kit/QrCanvas'
import { readLocalQrs, type LocalQr } from '@/lib/local-qr'

// « Sur cet appareil » : QR fixes créés sans compte dans ce navigateur. Masqué
// tant que la liste est vide (ou le stockage indisponible).

const EMPTY: LocalQr[] = []
let cacheKey = ''
let cacheVal: LocalQr[] = EMPTY

function snapshot(): LocalQr[] {
  const list = readLocalQrs()
  const key = JSON.stringify(list.map((q) => q.id))
  if (key !== cacheKey) {
    cacheKey = key
    cacheVal = list.length ? list : EMPTY
  }
  return cacheVal
}

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb)
  return () => window.removeEventListener('storage', cb)
}

const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

function when(ts: number) {
  const d = new Date(ts)
  return d.toDateString() === new Date().toDateString() ? "aujourd'hui" : fmt.format(d)
}

export function DeviceQrs() {
  const qrs = useSyncExternalStore(subscribe, snapshot, () => EMPTY)
  if (qrs.length === 0) return null

  return (
    <section className="mt-12" aria-labelledby="device-qrs">
      <div className="flex items-center gap-3">
        <h2 id="device-qrs" className="h2">Sur cet appareil</h2>
        <Link className="link ml-auto text-sm" href="/liens">Tout voir <ArrowRightIcon className="h-4 w-4" /></Link>
      </div>
      <p className="mt-1 text-sm text-muted">Les QR fixes créés sans compte sont gardés dans ce navigateur.</p>
      <ul className="mt-4 flex gap-3 overflow-x-auto px-0.5 pb-3 pt-1">
        {qrs.slice(0, 8).map((q) => (
          <li key={q.id} className="w-[188px] shrink-0 rounded-[20px] bg-soft p-3 shadow-[inset_0_0_0_1px_var(--line)]">
            <div className="qr-thumb grid place-items-center">
              <QrCanvas data={q.data} design={q.design} size={148} />
            </div>
            <strong className="mt-2.5 block truncate text-sm" title={q.label}>{q.label}</strong>
            <span className="text-xs text-muted">QR fixe · {when(q.createdAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
