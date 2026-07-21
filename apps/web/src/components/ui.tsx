import Link from 'next/link'
import type { ReactNode } from 'react'

// Kit d'UI partagé — sobre, net, arrondi. Une seule topbar stable partout.

/** Neutralisé (design assaini) — conservé pour compatibilité d'import. */
export function Blobs() {
  return null
}

/** Logo de marque : carré arrondi bleu + « link.cg ». */
export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 shrink-0">
      <span className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white font-bold text-sm">l.</span>
      <span className="font-bold tracking-tight text-[color:var(--foreground)]">link<span className="text-brand">.cg</span></span>
    </Link>
  )
}

/** Topbar STABLE : hauteur fixe, largeur et style identiques sur toutes les pages. */
export function Nav({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--surface)]/85 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
        <Logo />
        <div className="ml-auto flex items-center gap-2 sm:gap-3">{right}</div>
      </div>
    </header>
  )
}

export function GradButton({
  children, href, type = 'button', disabled, className = '', ...rest
}: {
  children: ReactNode; href?: string; type?: 'button' | 'submit'; disabled?: boolean; className?: string
} & Record<string, unknown>) {
  const cls = `btn-grad inline-flex items-center justify-center gap-2 px-4 py-2 text-sm ${className}`
  if (href) return <Link href={href} className={cls} {...rest}>{children}</Link>
  return <button type={type} disabled={disabled} className={cls} {...rest}>{children}</button>
}

export function GhostButton({ children, href, className = '' }: { children: ReactNode; href?: string; className?: string }) {
  const cls = `inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[color:var(--foreground)] border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-brand hover:text-brand transition-colors ${className}`
  if (href) return <Link href={href} className={cls}>{children}</Link>
  return <span className={cls}>{children}</span>
}

export function SoftCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card-soft p-5 ${className}`}>{children}</div>
}

export function Badge({ children, tone = 'brand' }: { children: ReactNode; tone?: 'brand' | 'green' | 'muted' }) {
  const tones = {
    brand: 'bg-[color:var(--brand-soft)] text-brand',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    muted: 'bg-black/5 dark:bg-white/10 text-[color:var(--muted)]',
  }
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${tones[tone]}`}>{children}</span>
}
