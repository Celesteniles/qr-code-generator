import { notFound } from 'next/navigation'
import { getCardBySlug } from '@link/db'
import { getDb } from '@/server/data'
import { Blobs } from '@/components/ui'
import { VCardButton } from './VCardButton'

export const dynamic = 'force-dynamic'

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export default async function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const card = await getCardBySlug(getDb(), slug)
  if (!card || !card.link.active) notFound()

  const p = card.profile
  if (!p) {
    return (
      <Shell>
        <p className="text-center text-zinc-500 text-sm py-8">Cette carte n&apos;est pas encore configurée.</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-brand text-white flex items-center justify-center text-2xl font-bold mb-4">
          {initials(p.fullName) || '•'}
        </div>
        <h1 className="text-xl font-bold text-[color:var(--foreground)]">{p.fullName}</h1>
        {(p.title || p.org) && (
          <p className="text-sm text-[color:var(--muted)] mt-1">
            {[p.title, p.org].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {p.phone && <Action href={`tel:${p.phone}`} label="Appeler" value={p.phone} />}
        {p.email && <Action href={`mailto:${p.email}`} label="Email" value={p.email} />}
        {p.socials?.map((s) => (
          <Action key={s.url} href={s.url} label={s.label} value={s.url.replace(/^https?:\/\//, '')} external />
        ))}
      </div>

      <VCardButton profile={p} />

      <p className="text-center text-xs text-zinc-400 mt-6">
        Carte propulsée par{' '}
        <a href="https://qrcode.cg" className="hover:text-blue-500 underline underline-offset-2">link.cg</a>
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <Blobs />
      <div className="w-full max-w-sm card-soft p-7 relative z-10">
        {children}
      </div>
    </div>
  )
}

function Action({ href, label, value, external }: { href: string; label: string; value: string; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] px-4 py-3 hover:border-brand hover:bg-grad-soft transition-colors"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</span>
      <span className="text-sm font-medium text-[color:var(--foreground)] truncate">{value}</span>
    </a>
  )
}
