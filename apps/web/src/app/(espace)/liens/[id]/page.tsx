import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeftIcon, ChartBarIcon, DevicePhoneMobileIcon, LinkIcon } from '@heroicons/react/24/outline'
import { getLink, getQrDesign } from '@link/db'
import { getDb } from '@/server/data'
import { getViewer } from '@/server/viewer'
import { getScanCounts, getDailyVisits, getLinkInsights } from '@/server/scans'
import { deleteLinkAction } from '@/server/actions'
import { toDesign } from '@/lib/qr-design'
import { QrPanel } from '@/components/liens/QrPanel'
import { DestinationForm, type DestinationValues } from '@/components/liens/DestinationForm'
import { ActiveSwitch } from '@/components/liens/ActiveSwitch'
import { DeleteZone } from '@/components/liens/DeleteZone'
import { VisitsChart } from '@/components/liens/VisitsChart'
import { LinkInsightsView } from '@/components/stats/LinkInsightsView'
import { SHORT_HOST, nf, shortUrl } from '@/components/liens/model'

export const metadata: Metadata = { title: 'Fiche du lien — link.cg' }

/** Supprime le lien puis revient à la liste. */
async function deleteAndLeave(formData: FormData) {
  'use server'
  await deleteLinkAction(formData)
  redirect('/liens')
}

export default async function LienPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { ctx } = await getViewer()
  if (!ctx) redirect(`/connexion?next=${encodeURIComponent(`/liens/${id}`)}`)

  const db = getDb()
  const link = await getLink(db, id)
  if (!link || link.workspaceId !== ctx.workspaceId) notFound()
  if (link.kind === 'card' || link.rule.type === 'card') redirect(`/carte/${link.slug}`)

  const [rawDesign, scans, daily, insights] = await Promise.all([
    getQrDesign(db, link.id),
    getScanCounts(),
    getDailyVisits([link.slug], 30).catch(() => []),
    getLinkInsights(link.slug, 30).catch(() => null),
  ])
  const url = shortUrl(link.slug)
  const visits = scans[link.slug] ?? 0
  const destination: DestinationValues = link.rule.type === 'app'
    ? { type: 'app', fallback: link.rule.fallback, ios: link.rule.ios, android: link.rule.android }
    : { type: 'static', url: link.rule.url }

  return (
    <>
      <div className="flex items-center gap-2.5 px-4 py-3.5 lg:px-8 lg:py-[18px]">
        <Link href="/liens" className="btn btn-ghost btn-sm"><ArrowLeftIcon aria-hidden="true" />Mes liens &amp; QR</Link>
      </div>

      <div className="px-4 pb-14 pt-1 lg:px-8 lg:pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="h1 min-w-0 break-all"><span className="text-muted">{SHORT_HOST}/</span>{link.slug}</h1>
          {link.active
            ? <span className="pill pill-ok"><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />En ligne</span>
            : <span className="pill pill-sun">En pause</span>}
          <span className="pill pill-soft">
            {link.kind === 'app'
              ? <><DevicePhoneMobileIcon aria-hidden="true" />Lien · App + QR</>
              : <><LinkIcon aria-hidden="true" />Lien court + QR</>}
          </span>
        </div>

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6" aria-label="QR et partage">
            <QrPanel linkId={link.id} slug={link.slug} url={url} initialDesign={rawDesign ? toDesign(rawDesign) : null} />
          </aside>

          <div className="grid gap-4">
            <section className="card p-[26px]" aria-labelledby="ou-mene">
              <SectionHead icon={<LinkIcon />} tone="bg-brand-tint text-brand" id="ou-mene" title="Où mène ce lien ?">
                Changez la destination quand vous voulez : le lien partagé et le QR imprimé suivent immédiatement.
              </SectionHead>
              <DestinationForm linkId={link.id} initial={destination} />
            </section>

            <section className="card p-[26px]" aria-labelledby="qui-ouvre">
              <SectionHead icon={<ChartBarIcon />} tone="bg-sun text-[#7a4b00]" id="qui-ouvre" title="Qui l'ouvre ?">
                Clics sur le lien et scans du QR, hors robots et aperçus de lien, comptés sans collecter de données personnelles.
              </SectionHead>
              <div className="inline-block rounded-2xl bg-soft px-4 py-3.5">
                <div className="font-display text-[28px] font-bold tabular-nums tracking-[-.03em]">{nf.format(visits)}</div>
                <div className="text-xs text-muted">{visits > 1 ? 'visites' : 'visite'} ces 30 derniers jours</div>
              </div>
              {daily.length > 0
                ? <VisitsChart points={daily} />
                : <p className="mt-4 text-sm text-muted">Les statistiques détaillées, jour par jour, arrivent bientôt.</p>}
              {insights && <LinkInsightsView data={insights} />}
            </section>

            <section className="card p-[26px]">
              <ActiveSwitch linkId={link.id} active={link.active} />
            </section>

            <section className="rounded-[26px] p-[26px] shadow-[inset_0_0_0_1.5px_var(--bad-tint)]">
              <DeleteZone linkId={link.id} action={deleteAndLeave} />
            </section>
          </div>
        </div>
      </div>
    </>
  )
}

function SectionHead({ icon, tone, id, title, children }: {
  icon: React.ReactNode
  tone: string
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-[18px] flex items-start gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl [&_svg]:h-5 [&_svg]:w-5 ${tone}`} aria-hidden="true">{icon}</span>
      <div>
        <h2 id={id} className="h2">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{children}</p>
      </div>
    </div>
  )
}
