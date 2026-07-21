import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { listLinks } from '@link/db'
import { getDb } from '@/server/data'
import { getAuth } from '@/server/auth'
import { DEFAULT_WORKSPACE } from '@/server/config'
import { CreateLinkForm } from './CreateLinkForm'
import { SignOutButton } from './SignOutButton'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const links = await listLinks(getDb(), DEFAULT_WORKSPACE)

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
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">
            {links.length} lien{links.length > 1 ? 's' : ''}
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
                <span
                  className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    l.active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                  }`}
                >
                  {l.active ? 'actif' : 'inactif'}
                </span>
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
