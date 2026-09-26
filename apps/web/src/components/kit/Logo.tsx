import Link from 'next/link'
import { LogoMark } from './LogoMark'

/** Logo link.cg : symbole (disque NS + « l » au pinceau) et mot-symbole. */
export function Logo({ href = '/', compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 font-display text-[19px] font-bold tracking-[-.03em]" aria-label="link.cg, accueil">
      <LogoMark size={36} className="shrink-0" />
      {!compact && <span>link<span className="text-brand">.cg</span></span>}
    </Link>
  )
}
