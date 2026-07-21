import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { listLinks } from '@link/db'
import { getDb } from '@/server/data'
import { getAuth } from '@/server/auth'
import { getScanCounts } from '@/server/scans'
import { DEFAULT_WORKSPACE } from '@/server/config'
import { CreateLinkForm } from './CreateLinkForm'
import { SignOutButton } from './SignOutButton'
import { toggleLinkAction, deleteLinkAction } from '@/server/actions'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const [links, scans] = await Promise.all([
    listLinks(getDb(), DEFAULT_WORKSPACE),
    getScanCounts(),
  ])
  const totalScans = Object.values(scans).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">link.</span>
          <span className="ml-2 text-xs text-zinc-400">Tableau de bord · liens</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-zinc-500 hidden sm:inline">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <CreateLinkForm />

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2 flex items-center gap-2">
            <span>{links.length} lien{links.length > 1 ? 's' : ''}</span>
            {totalScans > 0 && (
              <span className="text-blue-500 normal-case tracking-normal">· {totalScans} scan{totalScans > 1 ? 's' : ''} (30 j)</span>
            )}
          </h2>
          <ul className="space-y-2">
            {links.map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={`https://link.cg/${l.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    link.cg/{l.slug}
                  </a>
                  <p className="text-xs text-zinc-500 truncate">
                    {l.rule.type === 'static' ? l.rule.url
                      : l.rule.type === 'app' ? `App · ${l.rule.fallback}`
                      : 'Carte de visite'}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-zinc-500 tabular-nums" title="Scans (30 jours)">
                  {(scans[l.slug] ?? 0).toLocaleString('fr-FR')} <span className="text-zinc-400">scans</span>
                </span>

                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {l.kind}
                </span>

                {/* Activer / désactiver */}
                <form action={toggleLinkAction}>
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="active" value={(!l.active).toString()} />
                  <button
                    type="submit"
                    title={l.active ? 'Désactiver' : 'Activer'}
                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                      l.active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 hover:bg-green-200'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 hover:bg-zinc-200'
                    }`}
                  >
                    {l.active ? 'actif' : 'inactif'}
                  </button>
                </form>

                {/* Supprimer */}
                <form action={deleteLinkAction}>
                  <input type="hidden" name="id" value={l.id} />
                  <button
                    type="submit"
                    title="Supprimer"
                    className="shrink-0 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors text-lg leading-none px-1"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
            {links.length === 0 && (
              <li className="text-sm text-zinc-400 text-center py-8">
                Aucun lien pour l&apos;instant. Créez le premier ci-dessus.
              </li>
            )}
          </ul>
        </section>
      </main>
    </div>
  )
}
