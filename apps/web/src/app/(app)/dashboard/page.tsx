import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listLinks, getWorkspace } from '@link/db'
import { PLANS, type Plan } from '@link/shared'
import { getDb } from '@/server/data'
import { getSessionContext } from '@/server/session'
import { getScanCounts } from '@/server/scans'
import { Blobs, Nav, SoftCard, Badge } from '@/components/ui'
import { CreateLinkForm } from './CreateLinkForm'
import { SignOutButton } from './SignOutButton'
import { LinkQr } from './LinkQr'
import { toggleLinkAction, deleteLinkAction } from '@/server/actions'

export const dynamic = 'force-dynamic'

const kindLabel: Record<string, string> = { static: 'Lien', app: 'App', card: 'Carte' }

export default async function DashboardPage() {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/login')

  const db = getDb()
  const [links, scans, ws] = await Promise.all([
    listLinks(db, ctx.workspaceId),
    getScanCounts(),
    getWorkspace(db, ctx.workspaceId),
  ])
  const totalScans = Object.values(scans).reduce((a, b) => a + b, 0)
  const plan = (ws?.plan ?? 'free') as Plan
  const max = PLANS[plan].maxLinks

  return (
    <div className="min-h-screen relative">
      <Blobs />
      <Nav
        right={
          <>
            <Link href="/" className="hidden sm:inline text-sm font-semibold text-[color:var(--muted)] hover:text-brand transition-colors px-2">
              Générateur QR
            </Link>
            <Link href="/pricing"><Badge>{PLANS[plan].label}</Badge></Link>
            <span className="hidden md:inline text-xs text-[color:var(--muted)]">{ctx.email}</span>
            <SignOutButton />
          </>
        }
      />

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Bandeau stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat value={`${links.length}${max !== null ? `/${max}` : ''}`} label="liens" />
          <Stat value={totalScans.toLocaleString('fr-FR')} label="scans · 30 j" />
          <Stat value={links.filter((l) => l.active).length.toString()} label="actifs" />
        </div>

        <CreateLinkForm />

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[color:var(--muted)] mb-3 px-1">
            Vos liens
          </h2>
          <ul className="space-y-2.5">
            {links.map((l) => (
              <li key={l.id} className="card-soft relative flex items-center gap-3 px-4 py-3">
                <span className="shrink-0 w-9 h-9 rounded-2xl bg-grad-soft flex items-center justify-center text-sm">
                  {l.kind === 'card' ? '👤' : l.kind === 'app' ? '📱' : '🔗'}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={`https://link.cg/${l.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-[color:var(--foreground)] hover:text-brand transition-colors"
                  >
                    link.cg/<span className="text-grad">{l.slug}</span>
                  </a>
                  <p className="text-xs text-[color:var(--muted)] truncate">
                    {l.rule.type === 'static' ? l.rule.url
                      : l.rule.type === 'app' ? `App · ${l.rule.fallback}`
                      : `Carte de visite · ${kindLabel[l.kind]}`}
                  </p>
                </div>

                <span className="shrink-0 hidden sm:flex flex-col items-end leading-tight" title="Scans (30 jours)">
                  <span className="text-sm font-bold text-[color:var(--foreground)] tabular-nums">{(scans[l.slug] ?? 0).toLocaleString('fr-FR')}</span>
                  <span className="text-[10px] text-[color:var(--muted)]">scans</span>
                </span>

                <LinkQr slug={l.slug} />

                {l.kind === 'card' && (
                  <Link href={`/dashboard/card/${l.slug}`} className="shrink-0 text-xs font-semibold text-brand hover:underline">
                    éditer
                  </Link>
                )}

                <form action={toggleLinkAction}>
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="active" value={(!l.active).toString()} />
                  <button
                    type="submit"
                    title={l.active ? 'Désactiver' : 'Activer'}
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                      l.active
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/20'
                        : 'bg-black/5 dark:bg-white/10 text-[color:var(--muted)]'
                    }`}
                  >
                    {l.active ? 'actif' : 'inactif'}
                  </button>
                </form>

                <form action={deleteLinkAction}>
                  <input type="hidden" name="id" value={l.id} />
                  <button type="submit" title="Supprimer" className="shrink-0 text-[color:var(--muted)] hover:text-red-500 transition-colors text-xl leading-none px-1">
                    ×
                  </button>
                </form>
              </li>
            ))}
            {links.length === 0 && (
              <SoftCard className="text-center py-10">
                <p className="text-4xl mb-2">✨</p>
                <p className="text-sm text-[color:var(--muted)]">Aucun lien pour l&apos;instant.<br />Créez le premier ci-dessus.</p>
              </SoftCard>
            )}
          </ul>
        </section>
      </main>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card-soft px-4 py-3 text-center">
      <div className="text-xl font-black text-grad tabular-nums">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
    </div>
  )
}
