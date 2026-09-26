import 'server-only'
import Link from 'next/link'
import { getQrDesigns, type LinkRow } from '@link/db'
import { getWorkspaceLinks } from '@/server/links'
import { ArrowRightIcon, CheckIcon, LightBulbIcon, PlusIcon } from '@heroicons/react/24/outline'
import { QrCanvas } from '@/components/kit/QrCanvas'
import type { Viewer } from '@/components/kit/shell/types'
import { toDesign } from '@/lib/qr-design'
import { getDb } from '@/server/data'
import { getDailyVisits, getScanCounts } from '@/server/scans'
import type { SessionContext } from '@/server/session'
import { Shortener } from './Shortener'
import { VisitsChart } from './VisitsChart'

// Accueil de l'inscrit. Tout ce qui est affiché se déduit de ses données réelles :
// pas de tendance, pas d'« idée » inventée. Référence : docs/maquettes/d-accueil.html.

const SHORT_HOST = 'link.cg'
const nf = new Intl.NumberFormat('fr-FR')

function times(n: number) {
  return `${nf.format(n)} fois`
}

function destination(l: LinkRow): string {
  const r = l.rule
  const raw = r.type === 'static' ? r.url : r.type === 'app' ? r.fallback : ''
  if (!raw) return 'Carte de visite'
  try {
    const u = new URL(raw)
    return (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '')
  } catch {
    return raw
  }
}

const KIND_LABEL: Record<LinkRow['kind'], string> = {
  static: 'Lien court',
  app: 'Selon le téléphone',
  card: 'Carte de visite',
}

export async function MemberHome({ ctx, viewer }: { ctx: SessionContext; viewer: Viewer }) {
  const db = getDb()
  const links = await getWorkspaceLinks(ctx.workspaceId)
  const slugs = links.map((l) => l.slug)
  const [scans, designs, daily] = await Promise.all([
    getScanCounts(),
    getQrDesigns(db, links.map((l) => l.id)),
    slugs.length ? getDailyVisits(slugs, 30) : Promise.resolve([]),
  ])

  // Statistiques indisponibles (pas de jeton, erreur) : objet vide → aucun chiffre.
  const statsOk = Object.keys(scans).length > 0
  const visitsOf = (slug: string) => scans[slug] ?? 0
  const total = slugs.reduce((a, s) => a + visitsOf(s), 0)
  const top = statsOk ? [...links].sort((a, b) => visitsOf(b.slug) - visitsOf(a.slug))[0] : undefined

  const name = (ctx.name || viewer.user?.name || '').trim()
  const hello = name ? `Bonjour ${name}.` : 'Bonjour.'

  // « Bien démarrer » : uniquement des faits vérifiables dans les données.
  const styled = links.find((l) => designs[l.id] != null)
  const todo = [
    { label: 'Créer votre premier lien court', done: links.some((l) => l.kind === 'static'), href: '/creer?mode=lien' },
    {
      label: 'Personnaliser le style d’un QR',
      done: !!styled,
      href: links[0] ? `/liens/${links[0].id}` : '/creer?mode=qr',
    },
    { label: 'Créer votre carte de visite', done: links.some((l) => l.kind === 'card'), href: '/carte' },
    { label: 'Essayer un lien selon le téléphone', done: links.some((l) => l.kind === 'app'), href: '/creer?mode=lien&type=app' },
  ]
  const doneCount = todo.filter((t) => t.done).length
  const showTodo = doneCount < todo.length
  const showChart = daily.length > 0

  const recent = links.slice(0, 3)
  const paused = links.find((l) => !l.active)
  const plan = viewer.plan
  const nearLimit = plan && plan.max !== null && plan.used >= plan.max * 0.8

  return (
    <>
      {links.length === 0 ? (
        <>
          <h1 className="display max-w-[19ch]">{hello} Créons <span className="hl">votre premier lien</span>.</h1>
          <p className="lead mt-4 max-w-[60ch]">Collez un lien à raccourcir : vous obtenez une adresse courte à partager et son QR à imprimer.</p>
        </>
      ) : statsOk ? (
        <>
          <h1 className="display max-w-[19ch]">
            {hello} Vos liens et QR ont été ouverts <span className="hl">{times(total)}</span>{' ces 30 derniers jours.'}
          </h1>
          <p className="lead mt-4 max-w-[60ch]">
            Visites = clics sur vos liens + scans de vos QR.
            {top && visitsOf(top.slug) > 0 && (
              <> Votre adresse <b className="font-mono text-ink">{SHORT_HOST}/{top.slug}</b> en fait le plus ({nf.format(visitsOf(top.slug))}).</>
            )}
          </p>
        </>
      ) : (
        <>
          <h1 className="display max-w-[19ch]">{hello} Voici <span className="hl">vos liens et QR</span>.</h1>
          <p className="lead mt-4 max-w-[60ch]">Les chiffres de visites sont momentanément indisponibles. Vos liens, eux, fonctionnent normalement.</p>
        </>
      )}

      <Shortener className="mt-6 max-w-[760px]" />

      {(showChart || showTodo) && (
        <div className={`mt-6 grid items-start gap-4 ${showChart && showTodo ? 'min-[860px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]' : ''}`}>
          {showChart && <VisitsChart points={daily} />}
          {showTodo && (
            <section className="card p-6" aria-labelledby="todo-title">
              <h3 id="todo-title" className="h3">Bien démarrer</h3>
              <p className="mt-1 text-sm text-muted">{doneCount} sur {todo.length} · pour tirer le meilleur de link.cg</p>
              <div className="meter mt-3" role="progressbar" aria-label="Progression" aria-valuemin={0} aria-valuemax={todo.length} aria-valuenow={doneCount}>
                <span style={{ width: `${(doneCount / todo.length) * 100}%`, background: 'var(--ok)' }} />
              </div>
              <ul className="mt-3.5 grid gap-1">
                {todo.map((t) => (
                  <li key={t.label} className={`flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm hover:bg-soft ${t.done ? 'text-subtle line-through' : ''}`}>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${t.done ? 'bg-ok text-white' : 'shadow-[inset_0_0_0_2px_var(--line-strong)]'}`}>
                      {t.done && <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
                    </span>
                    {t.label}
                    <span className="sr-only">{t.done ? ' (fait)' : ' (à faire)'}</span>
                    {!t.done && <Link className="link ml-auto text-[13px] no-underline" href={t.href}>Faire</Link>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <div className="mt-12 flex items-center gap-3">
        <h2 className="h2">Vos liens et QR récents</h2>
        {links.length > 0 && <Link className="link ml-auto text-sm" href="/liens">Tout voir <ArrowRightIcon className="h-4 w-4" /></Link>}
      </div>
      <ul className="stagger mt-4 flex gap-3 overflow-x-auto px-0.5 pb-3 pt-1">
        {recent.map((l) => {
          const design = designs[l.id]
          const sub = [
            statsOk ? `${nf.format(visitsOf(l.slug))} visite${visitsOf(l.slug) > 1 ? 's' : ''}` : null,
            design != null ? 'QR modifiable' : KIND_LABEL[l.kind].toLowerCase(),
          ].filter(Boolean).join(' · ')
          return (
            <li key={l.id} className="w-[188px] shrink-0">
              <Link href={`/liens/${l.id}`} className="block h-full rounded-[20px] bg-soft p-3 shadow-[inset_0_0_0_1px_var(--line)] transition hover:shadow-[inset_0_0_0_1.5px_var(--line-strong)]">
                {design != null ? (
                  <div className="qr-thumb grid place-items-center">
                    <QrCanvas data={`https://${SHORT_HOST}/${l.slug}`} design={toDesign(design)} size={148} />
                  </div>
                ) : (
                  <div className="flex h-[164px] flex-col items-start justify-end gap-2.5 rounded-[14px] bg-surface p-3.5 shadow-[0_10px_24px_-16px_rgba(22,22,29,.5)]">
                    <span className="linkchip !inline max-w-full !whitespace-normal break-words !text-[15px]"><span className="host">{SHORT_HOST}/</span>{l.slug}</span>
                    {l.active
                      ? <span className="pill pill-soft">{KIND_LABEL[l.kind]}</span>
                      : <span className="pill pill-sun">En pause</span>}
                  </div>
                )}
                <strong className="mt-2.5 block truncate text-sm" title={destination(l)}>
                  {design != null ? `${SHORT_HOST}/${l.slug}` : destination(l)}
                </strong>
                <span className="text-xs text-muted">{sub}</span>
              </Link>
            </li>
          )
        })}
        <li className="w-[188px] shrink-0">
          <Link href="/creer" className="grid h-full min-h-[228px] place-items-center rounded-[20px] p-3 text-center shadow-[inset_0_0_0_1.5px_var(--line-strong)] transition hover:shadow-[inset_0_0_0_1.5px_var(--ink)]">
            <span>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-ink text-bg"><PlusIcon className="h-6 w-6" aria-hidden="true" /></span>
              <strong className="mt-2.5 block text-sm">Créer</strong>
              <span className="text-xs text-muted">Lien court, QR, carte</span>
            </span>
          </Link>
        </li>
      </ul>

      {paused ? (
        <div className="tip mt-6">
          <span className="tip-ico"><LightBulbIcon aria-hidden="true" /></span>
          <div>
            <strong>Un lien en pause peut resservir</strong>
            <span className="font-mono">{SHORT_HOST}/{paused.slug}</span> est en pause. Réutilisez-le : même lien, même QR imprimé, nouvelle destination.{' '}
            <Link className="link" href={`/liens/${paused.id}`}>Le mettre à jour</Link>
          </div>
        </div>
      ) : nearLimit && plan ? (
        <div className="tip mt-6">
          <span className="tip-ico"><LightBulbIcon aria-hidden="true" /></span>
          <div>
            <strong>Bientôt au bout de votre offre</strong>
            Vous utilisez {plan.used} liens sur {plan.max} avec l&apos;offre {plan.label}.{' '}
            <Link className="link" href="/offres">Voir les offres</Link>
          </div>
        </div>
      ) : null}
    </>
  )
}
