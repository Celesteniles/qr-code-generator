import Link from 'next/link'

/** Logo link.cg : pavé encre (repère de QR + point bleu) et mot-symbole. */
export function Logo({ href = '/', compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 font-display text-[19px] font-bold tracking-[-.03em]" aria-label="link.cg, accueil">
      <span className="relative grid h-[34px] w-[34px] place-items-center rounded-[11px] bg-ink" aria-hidden="true">
        <span className="absolute left-[7px] top-[7px] h-3 w-3 rounded-[4px] shadow-[inset_0_0_0_3px_var(--bg)]" />
        <span className="absolute bottom-[7px] right-[7px] h-2 w-2 rounded-full bg-brand" />
      </span>
      {!compact && <span>link<span className="text-brand">.cg</span></span>}
    </Link>
  )
}
