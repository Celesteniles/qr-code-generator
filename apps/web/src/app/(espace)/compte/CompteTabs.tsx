import Link from 'next/link'

const TABS = [
  { href: '/compte', label: 'Profil' },
  { href: '/compte/equipe', label: 'Équipe' },
  { href: '/compte/facturation', label: 'Facturation' },
  { href: '/compte/domaines', label: 'Domaines' },
] as const

/**
 * Onglets de « Mon compte » : de simples liens, l'onglet courant porte aria-current.
 * `billing` : faux pour un simple membre de l'espace, qui ne voit pas la facturation.
 */
export function CompteTabs({ current, billing = true }: { current: (typeof TABS)[number]['href']; billing?: boolean }) {
  return (
    <nav aria-label="Rubriques du compte" className="seg mt-6 print:hidden">
      {TABS.filter((t) => billing || t.href !== '/compte/facturation').map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === current ? 'page' : undefined}
          className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold text-muted transition hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-bg"
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
