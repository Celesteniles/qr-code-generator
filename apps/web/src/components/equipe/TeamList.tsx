'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { ArrowPathIcon, ClockIcon, EnvelopeIcon, UserMinusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { inviteMemberAction, removeMemberAction, revokeInvitationAction, type TeamState } from '@/server/team'
import { Spinner } from '@/components/kit/Spinner'
import { ResultTip } from '@/components/compte/SectionHead'
import { initials } from '@/components/kit/shell/types'
import { ROLE_LABEL, type MemberItem, type InvitationItem } from './model'

/** Échap annule une confirmation en cours. */
function useEscape(active: boolean, cancel: () => void) {
  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') cancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, cancel])
}

/** Membres et invitations en attente ; retrait et annulation en deux temps. */
export function TeamList({ members, invitations, canManage }: {
  members: MemberItem[]
  invitations: InvitationItem[]
  /** Owner/admin : boutons de gestion. Un simple membre ne voit que « Quitter ». */
  canManage: boolean
}) {
  const [removed, remove] = useActionState<TeamState, FormData>(removeMemberAction, null)
  const [revoked, revoke] = useActionState<TeamState, FormData>(revokeInvitationAction, null)
  const [resent, resend] = useActionState<TeamState, FormData>(inviteMemberAction, null)
  // Élément en attente de confirmation : `m:<userId>` ou `i:<invitationId>`.
  const [confirm, setConfirm] = useState<string | null>(null)
  const [last, setLast] = useState<'remove' | 'revoke' | 'resend' | null>(null)
  const state = last === 'remove' ? removed : last === 'revoke' ? revoked : last === 'resend' ? resent : null

  useEscape(confirm !== null, () => setConfirm(null))

  return (
    <div>
      <ul className="grid gap-2.5" aria-label="Membres de l’espace">
        {members.map((m) => {
          const asking = confirm === `m:${m.userId}`
          const canRemove = m.role !== 'owner' && (canManage || m.self)
          const label = m.name || m.email || 'Compte supprimé'
          return (
            <li key={m.userId} className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] px-4 py-3.5 ${m.self ? 'bg-brand-tint/60 shadow-[inset_0_0_0_1.5px_var(--brand-tint)]' : 'zone'}`}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coral text-[13px] font-bold text-white" aria-hidden="true">
                {initials(label)}
              </span>
              <div className="min-w-[180px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{label}</span>
                  <span className={`pill ${m.role === 'owner' ? 'pill-brand' : 'pill-soft'}`}>{ROLE_LABEL[m.role]}</span>
                  {m.self && <span className="pill pill-ok"><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />Vous</span>}
                </div>
                {m.name && m.email && <p className="mt-0.5 break-all text-[13px] text-muted">{m.email}</p>}
              </div>
              {canRemove && (asking ? (
                <form action={(fd) => { setLast('remove'); return remove(fd) }}
                  className="flex flex-wrap items-center gap-2" role="group"
                  aria-label={m.self ? 'Confirmer : quitter l’espace' : `Confirmer le retrait de ${label}`}>
                  <input type="hidden" name="userId" value={m.userId} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>Annuler</button>
                  <DangerSubmit label={m.self ? 'Oui, quitter' : 'Oui, retirer'} pendingLabel={m.self ? 'Départ…' : 'Retrait…'} />
                </form>
              ) : (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirm(`m:${m.userId}`)}>
                  <UserMinusIcon aria-hidden="true" />{m.self ? 'Quitter l’espace' : 'Retirer'}
                </button>
              ))}
            </li>
          )
        })}

        {invitations.map((i) => {
          const asking = confirm === `i:${i.id}`
          return (
            <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] border-[1.5px] border-dashed border-line-strong px-4 py-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-soft text-muted [&_svg]:h-5 [&_svg]:w-5" aria-hidden="true">
                <EnvelopeIcon />
              </span>
              <div className="min-w-[180px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="break-all font-semibold">{i.email}</span>
                  <span className="pill pill-soft">{ROLE_LABEL[i.role]}</span>
                  {i.expired
                    ? <span className="pill pill-bad">Expirée</span>
                    : <span className="pill pill-sun"><ClockIcon aria-hidden="true" />En attente</span>}
                </div>
                <p className="mt-0.5 text-[13px] text-muted">
                  {i.expired ? `Lien expiré le ${i.expiresOn}` : `Invitation envoyée le ${i.sentOn} · valable jusqu’au ${i.expiresOn}`}
                </p>
              </div>
              {canManage && (asking ? (
                <form action={(fd) => { setLast('revoke'); return revoke(fd) }}
                  className="flex flex-wrap items-center gap-2" role="group" aria-label={`Confirmer l’annulation de l’invitation de ${i.email}`}>
                  <input type="hidden" name="id" value={i.id} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>Garder</button>
                  <DangerSubmit label="Oui, annuler" pendingLabel="Annulation…" />
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <form action={(fd) => { setLast('resend'); return resend(fd) }}>
                    <input type="hidden" name="email" value={i.email} />
                    <input type="hidden" name="role" value={i.role} />
                    <SoftSubmit label="Renvoyer" pendingLabel="Envoi…" />
                  </form>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirm(`i:${i.id}`)}>
                    <XMarkIcon aria-hidden="true" />Annuler
                  </button>
                </div>
              ))}
            </li>
          )
        })}
      </ul>

      <div aria-live="polite">
        {state?.ok && <ResultTip ok title="C’est fait">{state.message}</ResultTip>}
        {state && !state.ok && <ResultTip ok={false} title="Rien n’a changé">{state.message}</ResultTip>}
      </div>
    </div>
  )
}

function DangerSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn-danger btn-sm bg-bad-tint" disabled={pending} aria-busy={pending} autoFocus>
      {pending ? <><Spinner />{pendingLabel}</> : label}
    </button>
  )
}

function SoftSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn-soft btn-sm" disabled={pending} aria-busy={pending}>
      {pending ? <><Spinner />{pendingLabel}</> : <><ArrowPathIcon aria-hidden="true" />{label}</>}
    </button>
  )
}
