import Link from 'next/link'
import type { ReactNode } from 'react'

// Kit d'UI partagé — style « vivant & coloré ». Réutilisé du portail au dashboard.

/** Bulles de dégradé floues en fond de page. */
export function Blobs() {
  return (
    <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="blob" style={{ width: 480, height: 480, top: -160, left: -120, background: '#0060ff' }} />
      <div className="blob" style={{ width: 420, height: 420, top: 120, right: -140, background: '#8b2fd6' }} />
      <div className="blob" style={{ width: 360, height: 360, bottom: -160, left: '30%', background: '#00b8d9' }} />
    </div>
  )
}

/** Logo de marque : carré arrondi en dégradé + « l. ». */
export function Logo({ size = 'md', href = '/' }: { size?: 'sm' | 'md' | 'lg'; href?: string }) {
  const s = size === 'lg' ? 'w-11 h-11 text-xl' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-base'
  return (
    <Link href={href} className="flex items-center gap-2 shrink-0 group">
      <span className={`${s} bg-grad rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform`}>
        l.
      </span>
      <span className="font-extrabold tracking-tight text-[color:var(--foreground)]">link<span className="text-grad">.cg</span></span>
    </Link>
  )
}

/** Barre de navigation flottante. */
export function Nav({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="card-soft !rounded-full px-4 py-2 flex items-center gap-3 backdrop-blur-xl bg-[color:var(--surface)]/70">
          <Logo />
          <div className="ml-auto flex items-center gap-2">{right}</div>
        </div>
      </div>
    </header>
  )
}

export function GradButton({
  children, href, type = 'button', disabled, className = '', ...rest
}: {
  children: ReactNode; href?: string; type?: 'button' | 'submit'; disabled?: boolean; className?: string
} & Record<string, unknown>) {
  const cls = `btn-grad inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm ${className}`
  if (href) return <Link href={href} className={cls} {...rest}>{children}</Link>
  return <button type={type} disabled={disabled} className={cls} {...rest}>{children}</button>
}

export function GhostButton({ children, href, className = '' }: { children: ReactNode; href?: string; className?: string }) {
  const cls = `inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-[color:var(--foreground)] border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-brand hover:text-brand transition-colors ${className}`
  if (href) return <Link href={href} className={cls}>{children}</Link>
  return <span className={cls}>{children}</span>
}

export function SoftCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card-soft p-5 ${className}`}>{children}</div>
}

export function Badge({ children, tone = 'brand' }: { children: ReactNode; tone?: 'brand' | 'green' | 'muted' }) {
  const tones = {
    brand: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    muted: 'bg-black/5 dark:bg-white/10 text-[color:var(--muted)]',
  }
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${tones[tone]}`}>{children}</span>
}
