'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { ArrowPathIcon, ArrowRightIcon, CheckCircleIcon, ClockIcon, GlobeAltIcon, TrashIcon } from '@heroicons/react/24/outline'
import { addDomainAction, deleteDomainAction, verifyDomainAction } from '@/server/domain-actions'
import type { DomainActionState, DomainItem } from '@/server/domains'
import { CopyButton } from '@/components/liens/CopyButton'
import { Spinner } from '@/components/kit/Spinner'
import { ResultTip } from './SectionHead'

const CONTACT = 'contact@nscreative.cg'

export interface DomainsPanelProps {
  planLabel: string
  max: number
  enabled: boolean
  cnameTarget: string | null
  domains: DomainItem[]
}

/** Onglet « Domaines » : ajout, instruction DNS, vérification, retrait. */
export function DomainsPanel({ planLabel, max, enabled, cnameTarget, domains }: DomainsPanelProps) {
  if (max === 0) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-muted">
          Vos liens peuvent porter votre propre adresse, par exemple <b className="font-mono text-ink">go.monresto.cg/menu</b> au lieu de{' '}
          <span className="font-mono">link.cg/menu</span>. L&apos;offre {planLabel} ne l&apos;inclut pas : c&apos;est possible à partir de l&apos;offre Business.
        </p>
        <Link href="/offres" className="btn btn-cta btn-sm justify-self-start">Voir les offres<ArrowRightIcon aria-hidden="true" /></Link>
      </div>
    )
  }

  if (!enabled || !cnameTarget) {
    return (
      <div className="tip blue">
        <span className="tip-ico"><ClockIcon aria-hidden="true" /></span>
        <div>
          <strong>Bientôt disponible</strong>
          Votre offre inclut {max > 1 ? 'des domaines personnalisés' : 'un domaine personnalisé'}. Nous finalisons sa mise en service :
          pour l&apos;activer dès maintenant, écrivez-nous à{' '}
          <a className="font-semibold text-ink underline underline-offset-2" href={`mailto:${CONTACT}?subject=${encodeURIComponent('Domaine personnalisé link.cg')}`}>{CONTACT}</a>.
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      {domains.length > 0 && (
        <ul className="grid gap-4" aria-label="Vos domaines">
          {domains.map((d) => <DomainRow key={d.id} domain={d} cnameTarget={cnameTarget} />)}
        </ul>
      )}
      {domains.length < max
        ? <AddDomainForm />
        : (
          <p className="text-sm text-muted">
            {max === 1
              ? <>L&apos;offre {planLabel} inclut un domaine. Pour en utiliser plusieurs, passez à l&apos;offre Entreprise. <Link className="link" href="/offres">Voir les offres</Link></>
              : <>Vous utilisez les {max} domaines de votre offre. Pour en ajouter, écrivez-nous à <a className="link" href={`mailto:${CONTACT}`}>{CONTACT}</a>.</>}
          </p>
        )}
    </div>
  )
}

function AddDomainForm() {
  const [state, action, pending] = useActionState<DomainActionState, FormData>(addDomainAction, null)
  const [value, setValue] = useState('')
  const [dirty, setDirty] = useState(false)
  const show = state && !dirty && !pending

  return (
    <form action={(fd) => { setDirty(false); return action(fd) }}>
      <label className="label" htmlFor="dom-host">Ajouter un domaine</label>
      <div className="flex flex-wrap items-stretch gap-2.5">
        <input
          id="dom-host" name="hostname" className="input min-w-[220px] flex-1 font-mono" required maxLength={253}
          inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="go.monresto.cg"
          value={value} onChange={(e) => { setValue(e.target.value); setDirty(true) }} aria-describedby="dom-host-help"
        />
        <button type="submit" className="btn btn-cta h-[52px]" disabled={pending || !value.trim()} aria-busy={pending}>
          {pending ? <><Spinner />Ajout…</> : 'Ajouter'}
        </button>
      </div>
      <p id="dom-host-help" className="help">
        Un sous-domaine d&apos;un domaine qui vous appartient, par exemple go.monresto.cg ou liens.maboutique.com.
      </p>
      <div aria-live="polite">
        {show && <ResultTip ok={state.ok} title={state.ok ? 'Domaine ajouté' : 'Le domaine n’a pas été ajouté'}>{state.message}</ResultTip>}
      </div>
    </form>
  )
}

/** Nom à saisir chez l'hébergeur : souvent la partie avant le domaine (« go » pour go.monresto.cg). */
function shortName(hostname: string): string {
  const labels = hostname.split('.')
  return labels.slice(0, Math.max(1, labels.length - 2)).join('.')
}

function DomainRow({ domain, cnameTarget }: { domain: DomainItem; cnameTarget: string }) {
  const [verify, verifyAction, verifying] = useActionState<DomainActionState, FormData>(verifyDomainAction, null)
  const [removal, removeAction, removing] = useActionState<DomainActionState, FormData>(deleteDomainAction, null)
  const [confirm, setConfirm] = useState(false)
  const active = domain.state === 'active'
  const titleId = `dom-${domain.id}`

  return (
    <li className="zone grid gap-4 p-4 sm:p-5" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center gap-3">
        <GlobeAltIcon className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
        <h3 id={titleId} className="h3 min-w-0 break-all font-mono">{domain.hostname}</h3>
        {active
          ? <span className="pill pill-ok"><CheckCircleIcon aria-hidden="true" />Actif</span>
          : <span className="pill pill-sun"><ClockIcon aria-hidden="true" />En attente</span>}
      </div>

      {active ? (
        <p className="text-sm text-muted">
          Choisissez-le au moment de créer un lien : vos contacts verront <span className="font-mono text-ink">{domain.hostname}/…</span>.
          Gardez l&apos;enregistrement DNS en place, sinon vos liens sur ce domaine cesseront de fonctionner.
        </p>
      ) : (
        <div className="grid gap-2">
          <p className="text-sm text-muted">
            Chez votre hébergeur de domaine (là où vous gérez les DNS), créez cet enregistrement, puis cliquez sur « Vérifier » :
          </p>
          <dl className="grid gap-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-4">
            <dt className="font-semibold">Type</dt>
            <dd className="font-mono">CNAME</dd>
            <dt className="font-semibold">Nom</dt>
            <dd className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 break-all font-mono">{domain.hostname}</span>
              <CopyButton text={domain.hostname} label="Copier le nom" />
            </dd>
            <dt className="font-semibold">Cible</dt>
            <dd className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 break-all font-mono">{cnameTarget}</span>
              <CopyButton text={cnameTarget} label="Copier la cible" />
            </dd>
          </dl>
          <p className="help">
            Certains hébergeurs demandent seulement « {shortName(domain.hostname)} » comme nom. Si l&apos;option existe, désactivez le proxy
            (nuage orange chez Cloudflare). La prise en compte prend de quelques minutes à quelques heures.
          </p>
        </div>
      )}

      {verify?.ownership && !active && (
        <div className="grid gap-2">
          <p className="text-sm text-muted">Si votre domaine est lui-même chez Cloudflare, ajoutez aussi cet enregistrement :</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-4">
            <dt className="font-semibold">Type</dt>
            <dd className="font-mono">TXT</dd>
            <dt className="font-semibold">Nom</dt>
            <dd className="flex min-w-0 items-center gap-2"><span className="min-w-0 break-all font-mono">{verify.ownership.name}</span><CopyButton text={verify.ownership.name} label="Copier le nom" /></dd>
            <dt className="font-semibold">Valeur</dt>
            <dd className="flex min-w-0 items-center gap-2"><span className="min-w-0 break-all font-mono">{verify.ownership.value}</span><CopyButton text={verify.ownership.value} label="Copier la valeur" /></dd>
          </dl>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <form action={verifyAction}>
          <input type="hidden" name="id" value={domain.id} />
          <button type="submit" className={`btn btn-sm ${active ? 'btn-ghost' : 'btn-cta'}`} disabled={verifying} aria-busy={verifying}>
            {verifying ? <><Spinner />Vérification…</> : <><ArrowPathIcon aria-hidden="true" />Vérifier</>}
          </button>
        </form>
        {confirm ? (
          <form action={removeAction} className="flex flex-wrap items-center gap-2" role="group" aria-label={`Confirmer le retrait de ${domain.hostname}`}>
            <input type="hidden" name="id" value={domain.id} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Annuler</button>
            <button type="submit" className="btn btn-danger btn-sm bg-bad-tint" disabled={removing} aria-busy={removing} autoFocus>
              {removing ? <><Spinner />Retrait…</> : <><TrashIcon aria-hidden="true" />Oui, retirer ce domaine</>}
            </button>
          </form>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(true)}>
            <TrashIcon aria-hidden="true" />Retirer
          </button>
        )}
      </div>

      <div aria-live="polite">
        {verify && !verifying && <ResultTip ok={verify.ok} title={verify.ok ? 'Domaine actif' : 'Pas encore prêt'}>{verify.message}</ResultTip>}
        {removal && !removing && !removal.ok && <ResultTip ok={false} title="Le domaine n’a pas été retiré">{removal.message}</ResultTip>}
      </div>
    </li>
  )
}
