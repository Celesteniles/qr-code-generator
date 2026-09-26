'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { LinkIcon, LockClosedIcon, MagnifyingGlassIcon, PlusIcon, UserIcon } from '@heroicons/react/24/outline'
import { Illustration } from '@/components/kit/Illustration'
import type { LocalQr } from '@/lib/local-qr'
import { LinkCard } from './LinkCard'
import { LocalQrCard } from './LocalQrCard'
import { useLocalQrs } from './useLocalQrs'
import type { LinkItem } from './model'

type Filter = 'all' | 'short' | 'fixed' | 'card'
type Sort = 'visits' | 'recent'

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

function matchLink(l: LinkItem, q: string) {
  return !q || l.slug.toLowerCase().includes(q) || l.destination.toLowerCase().includes(q)
}
function matchLocal(l: LocalQr, q: string) {
  return !q || (l.label ?? '').toLowerCase().includes(q) || (l.data ?? '').toLowerCase().includes(q)
}

/** Liste « Mes liens & QR » : recherche, filtres et tri côté client. */
export function LinksBoard({ links, signedIn }: { links: LinkItem[]; signedIn: boolean }) {
  const local = useLocalQrs()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('visits')
  const q = query.trim().toLowerCase()

  const shownLinks = useMemo(() => {
    const list = links.filter((l) => {
      if (filter === 'fixed') return false
      if (filter === 'short' && l.kind === 'card') return false
      if (filter === 'card' && l.kind !== 'card') return false
      return matchLink(l, q)
    })
    return list.sort((a, b) =>
      sort === 'visits' ? b.visits - a.visits || b.createdAt - a.createdAt : b.createdAt - a.createdAt)
  }, [links, filter, sort, q])

  const localCount = local?.length ?? 0
  const shownLocal = useMemo(() => {
    if (!local || filter === 'short' || filter === 'card') return []
    return local.filter((l) => matchLocal(l, q)).sort((a, b) => b.createdAt - a.createdAt)
  }, [local, filter, q])

  const hasAnything = links.length > 0 || localCount > 0
  const filtering = q !== '' || filter !== 'all'
  const noResult = filtering && shownLinks.length === 0 && shownLocal.length === 0

  const lead = signedIn
    ? links.length === 0 && localCount === 0
      ? 'Vos liens courts et vos QR apparaîtront ici.'
      : `${plural(links.length, 'lien court', 'liens courts')}${localCount ? ` et ${plural(localCount, 'QR fixe', 'QR fixes')}` : ''}. ` +
        "Chaque lien court a son QR : partagez l'un, imprimez l'autre. Cliquez sur un lien pour changer sa destination ou voir ses visites."
    : "Les QR créés sur cet appareil. Ils sont fixes et ne sont visibles que dans ce navigateur. Les liens courts demandent un compte gratuit."

  return (
    <>
      <h1 className="h1">Mes liens &amp; QR</h1>
      <p className="lead mt-2 max-w-[760px]">{lead}</p>

      {!signedIn && <GuestBand />}

      {/* Barre de recherche et filtres : seulement s'il y a de quoi chercher. */}
      {hasAnything && (
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <label className="flex h-11 min-w-[220px] max-w-[340px] flex-1 items-center gap-2.5 rounded-full bg-surface px-4 text-muted shadow-[inset_0_0_0_1.5px_var(--line-strong)] focus-within:shadow-[inset_0_0_0_1.5px_var(--brand),var(--ring)]">
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">Rechercher</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={signedIn ? 'Rechercher un lien, une adresse…' : 'Rechercher un QR…'}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-subtle"
            />
          </label>
          {signedIn && (
            <>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer">
                {([
                  ['all', `Tous · ${links.length + localCount}`, null],
                  ['short', 'Liens courts', LinkIcon],
                  ['fixed', 'QR fixes', LockClosedIcon],
                  ['card', 'Cartes', UserIcon],
                ] as const).map(([value, label, Icon]) => (
                  <button key={value} type="button" className="chip" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                    {Icon && <Icon aria-hidden="true" />}{label}
                  </button>
                ))}
              </div>
              <div className="seg ml-auto" role="group" aria-label="Trier">
                <button type="button" aria-pressed={sort === 'visits'} onClick={() => setSort('visits')}>Plus visités</button>
                <button type="button" aria-pressed={sort === 'recent'} onClick={() => setSort('recent')}>Récents</button>
              </div>
            </>
          )}
        </div>
      )}

      {noResult && (
        <div className="zone mt-5 flex flex-wrap items-center gap-3 px-5 py-4 text-sm text-muted" role="status">
          <span className="grow">Rien ne correspond{q ? <> à « {query.trim()} »</> : ' à ce filtre'}.</span>
          <button type="button" className="btn btn-soft btn-sm" onClick={() => { setQuery(''); setFilter('all') }}>Tout afficher</button>
        </div>
      )}

      {shownLinks.length > 0 && (
        <div className="stagger mt-5 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {shownLinks.map((l) => <LinkCard key={l.id} link={l} />)}
        </div>
      )}

      {/* Inscrit sans aucun lien : on invite à créer le premier. */}
      {signedIn && links.length === 0 && filter !== 'fixed' && !q && <EmptyState />}
      {/* Visiteur sans QR sur cet appareil (une fois le navigateur lu). */}
      {!signedIn && local !== null && localCount === 0 && <EmptyState />}

      {shownLocal.length > 0 && (
        <section className={signedIn ? 'mt-12' : 'mt-5'} aria-labelledby={signedIn ? 'sur-cet-appareil' : undefined}>
          {signedIn && (
            <>
              <h2 id="sur-cet-appareil" className="h3">Sur cet appareil</h2>
              <p className="mt-1 text-sm text-muted">
                QR fixes créés dans ce navigateur. Ils ne comptent pas leurs visites et n&apos;apparaissent pas sur vos autres appareils.
              </p>
            </>
          )}
          <div className={`grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 ${signedIn ? 'mt-4' : ''}`}>
            {shownLocal.map((qr) => <LocalQrCard key={qr.id} qr={qr} />)}
          </div>
        </section>
      )}
    </>
  )
}

function GuestBand() {
  return (
    <div className="mt-6 grid items-center gap-6 rounded-3xl bg-brand-tint px-6 py-5 md:grid-cols-[180px_minmax(0,1fr)_auto]">
      <Illustration name="account" height={110} className="max-w-[200px] overflow-hidden rounded-2xl bg-surface" />
      <div>
        <h2 className="h3">Passez aux liens courts</h2>
        <p className="mt-1 text-sm text-muted">
          Avec un compte gratuit : des liens link.cg à partager, des QR modifiables après impression, et vos créations retrouvées sur tous vos appareils.
        </p>
      </div>
      <Link href="/connexion?mode=inscription" className="btn btn-brand justify-self-start">Créer mon compte</Link>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card mt-6 grid items-center gap-9 p-8 md:grid-cols-[300px_minmax(0,1fr)]">
      <Illustration name="empty" className="overflow-hidden rounded-3xl bg-sky" />
      <div>
        <h2 className="h1 text-[32px]">Votre premier lien vous attend</h2>
        <p className="lead mt-2">
          Collez un long lien pour le raccourcir, ou créez le QR de votre menu, de votre WhatsApp ou de votre Wi‑Fi. On s&apos;occupe du reste.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link href="/creer" className="btn btn-cta btn-lg"><PlusIcon aria-hidden="true" />Créer mon premier lien</Link>
          <Link href="/bienvenue" className="btn btn-ghost btn-lg">Voir des exemples</Link>
        </div>
      </div>
    </div>
  )
}
