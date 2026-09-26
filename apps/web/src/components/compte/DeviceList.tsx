'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { ArrowRightStartOnRectangleIcon, ComputerDesktopIcon, DevicePhoneMobileIcon, DeviceTabletIcon } from '@heroicons/react/24/outline'
import { revokeOtherSessionsAction, revokeSessionAction, type AccountState } from '@/server/account'
import { Spinner } from '@/components/kit/Spinner'
import { ResultTip } from './SectionHead'
import type { DeviceItem } from './devices'

const ICONS = { phone: DevicePhoneMobileIcon, tablet: DeviceTabletIcon, computer: ComputerDesktopIcon }

/** Échap annule une confirmation en cours. */
function useEscape(active: boolean, cancel: () => void) {
  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') cancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, cancel])
}

/** « Appareils connectés » : sessions actives, déconnexion en deux temps. */
export function DeviceList({ devices }: { devices: DeviceItem[] }) {
  const [one, revokeOne] = useActionState<AccountState, FormData>(revokeSessionAction, null)
  const [all, revokeAll] = useActionState<AccountState, FormData>(revokeOtherSessionsAction, null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  // Dernier résultat affiché (l'une ou l'autre action).
  const [last, setLast] = useState<'one' | 'all' | null>(null)
  const others = devices.filter((d) => !d.current)
  const state = last === 'one' ? one : last === 'all' ? all : null

  useEscape(confirmId !== null || confirmAll, () => { setConfirmId(null); setConfirmAll(false) })

  return (
    <div>
      <ul className="grid gap-2.5" aria-label="Appareils connectés">
        {devices.map((d) => {
          const Icon = ICONS[d.kind]
          const asking = confirmId === d.id
          return (
            <li key={d.id} className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] px-4 py-3.5 ${d.current ? 'bg-brand-tint/60 shadow-[inset_0_0_0_1.5px_var(--brand-tint)]' : 'zone'}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl [&_svg]:h-5 [&_svg]:w-5 ${d.current ? 'bg-surface text-brand' : 'bg-surface text-muted'}`} aria-hidden="true">
                <Icon />
              </span>
              <div className="min-w-[180px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{d.label}</span>
                  {d.current && <span className="pill pill-ok"><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />Cet appareil</span>}
                </div>
                <p className="mt-0.5 text-[13px] text-muted">
                  {d.current ? 'Actif maintenant' : `Actif ${d.lastActive}`}
                  {' · '}Connecté le {d.createdAt}
                  {d.ip && <> · <span className="whitespace-nowrap">IP {d.ip}</span></>}
                </p>
              </div>
              {!d.current && (asking ? (
                <form action={(fd) => { setLast('one'); return revokeOne(fd) }}
                  className="flex flex-wrap items-center gap-2" role="group" aria-label={`Confirmer la déconnexion de ${d.label}`}>
                  <input type="hidden" name="id" value={d.id} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)}>Annuler</button>
                  <SubmitButton label="Oui, déconnecter" pendingLabel="Déconnexion…" />
                </form>
              ) : (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => { setConfirmAll(false); setConfirmId(d.id) }}>
                  <ArrowRightStartOnRectangleIcon aria-hidden="true" />Déconnecter
                </button>
              ))}
            </li>
          )
        })}
      </ul>

      {others.length === 0 && (
        <p className="mt-4 text-sm text-muted">Aucun autre appareil n&apos;est connecté à votre compte.</p>
      )}

      {others.length > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {confirmAll ? (
            <form action={(fd) => { setLast('all'); return revokeAll(fd) }}
              className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmer la déconnexion des autres appareils">
              <span className="text-sm font-medium">Déconnecter {others.length} appareils ?</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmAll(false)}>Annuler</button>
              <SubmitButton label="Oui, tous les déconnecter" pendingLabel="Déconnexion…" />
            </form>
          ) : (
            <button type="button" className="btn btn-soft btn-sm" onClick={() => { setConfirmId(null); setConfirmAll(true) }}>
              <ArrowRightStartOnRectangleIcon aria-hidden="true" />Déconnecter tous les autres appareils
            </button>
          )}
        </div>
      )}

      <div aria-live="polite">
        {state?.ok && <ResultTip ok title="C'est fait">{state.message}</ResultTip>}
        {state && !state.ok && <ResultTip ok={false} title="Rien n'a changé">{state.message}</ResultTip>}
      </div>
    </div>
  )
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn-danger btn-sm bg-bad-tint" disabled={pending} aria-busy={pending} autoFocus>
      {pending ? <><Spinner />{pendingLabel}</> : label}
    </button>
  )
}
