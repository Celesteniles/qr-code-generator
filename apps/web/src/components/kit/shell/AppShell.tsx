'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  HomeIcon, LinkIcon, UserIcon, CreditCardIcon, PlusIcon, LockClosedIcon, ArrowRightIcon, QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline'
import { Logo } from '../Logo'
import { Illustration } from '../Illustration'
import { ThemeToggle } from './ThemeToggle'
import { SignOutButton } from './SignOutButton'
import { MadeBy } from '../MadeBy'
import { initials, type Viewer } from './types'

// Coquille unique de l'application : la même pour le visiteur et l'inscrit.
// Desktop : barre latérale + feuille blanche. Mobile : en-tête + barre d'onglets.

type NavItem = { href: string; label: string; icon: typeof HomeIcon; needsAccount?: boolean }

const NAV: NavItem[] = [
  { href: '/', label: 'Accueil', icon: HomeIcon },
  { href: '/liens', label: 'Mes liens & QR', icon: LinkIcon },
  { href: '/carte', label: 'Carte de visite', icon: UserIcon, needsAccount: true },
]
// La visite guidée n'est pas une rubrique : elle reste accessible par la pop-up
// d'accueil, l'accueil visiteur, le menu mobile et le bouton d'aide en bas.
const NAV_SECONDARY: NavItem[] = [
  { href: '/offres', label: 'Offres', icon: CreditCardIcon },
]

const TABS = [
  { href: '/', label: 'Accueil', icon: HomeIcon },
  { href: '/liens', label: 'Mes liens', icon: LinkIcon },
  { href: '/carte', label: 'Carte', icon: UserIcon },
  { href: '/offres', label: 'Offres', icon: CreditCardIcon },
]

/** Onglet de la barre mobile. */
function Tab({ href, label, icon, current }: { href: string; label: string; icon: typeof HomeIcon; current: boolean }) {
  return (
    <Link href={href} aria-current={current ? 'page' : undefined}
      className={`grid min-w-0 place-items-center gap-0.5 py-1 text-[11px] font-semibold ${current ? 'text-ink' : 'text-subtle'}`}>
      <NavIcon icon={icon} className="h-5 w-5" />{label}
    </Link>
  )
}

/**
 * Icône d'un lien de navigation : remplacée par un spinner dès le clic, le temps
 * que la page arrive (retour immédiat, même sur une connexion lente).
 * Doit être rendue à l'intérieur du <Link> concerné.
 */
function NavIcon({ icon: Icon, className }: { icon: typeof HomeIcon; className: string }) {
  const { pending } = useLinkStatus()
  return pending
    ? <span className={`spinner ${className} p-[2px]`} aria-hidden="true" />
    : <Icon className={className} aria-hidden="true" />
}

function isCurrent(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({ item, pathname, guest }: { item: NavItem; pathname: string; guest: boolean }) {
  const current = isCurrent(pathname, item.href)
  return (
    <Link
      href={item.href}
      aria-current={current ? 'page' : undefined}
      className={`flex h-[42px] items-center gap-3 rounded-full px-3.5 text-sm font-medium transition ${
        current ? 'bg-surface font-semibold text-ink shadow-[0_0_0_1px_var(--line),var(--shadow)]' : 'text-ink/80 hover:bg-soft hover:text-ink'
      }`}
    >
      <NavIcon icon={item.icon} className="h-[18px] w-[18px] shrink-0" />
      {item.label}
      {item.needsAccount && guest && <LockClosedIcon className="ml-auto h-[15px] w-[15px] text-subtle" aria-label="Compte requis" />}
    </Link>
  )
}

export function AppShell({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  const pathname = usePathname()
  const guest = !viewer.user

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {/* ── Barre latérale (desktop) ── */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-0.5 overflow-y-auto px-4 py-[22px] lg:flex [&>*]:shrink-0">
        <div className="px-2.5 pb-[22px]"><Logo /></div>
        <Link href="/creer" className="btn btn-cta mb-[18px] w-full"><NavIcon icon={PlusIcon} className="h-[18px] w-[18px]" />Créer</Link>
        <nav className="flex flex-col gap-0.5" aria-label="Navigation principale">
          {NAV.map((item) => <NavLink key={item.href} item={item} pathname={pathname} guest={guest} />)}
          <div className="h-3.5" />
          {NAV_SECONDARY.map((item) => <NavLink key={item.href} item={item} pathname={pathname} guest={guest} />)}
        </nav>

        <div className="mt-auto grid min-w-0 grid-cols-1 gap-2.5">
          {guest ? (
            <div className="rounded-[18px] bg-surface p-4 text-[13px] shadow-[0_0_0_1px_var(--line),var(--shadow)]">
              <Illustration name="account" height={92} className="-mx-1 -mt-1 mb-2.5 overflow-hidden rounded-xl bg-lilac" />
              <strong>Liens courts &amp; QR modifiables</strong>
              <p className="mt-1 text-muted">Avec un compte gratuit : des liens link.cg à partager, modifiables après impression, avec leurs statistiques.</p>
              <Link href="/connexion?mode=inscription" className="btn btn-brand btn-sm mt-3 w-full">Créer mon compte</Link>
              <Link href="/connexion" className="btn btn-ghost btn-sm mt-1 w-full">Se connecter</Link>
            </div>
          ) : viewer.plan && (
            <div className="rounded-[18px] bg-surface p-4 text-[13px] shadow-[0_0_0_1px_var(--line),var(--shadow)]">
              <div className="flex items-center"><strong>Offre {viewer.plan.label}</strong>
                <span className="ml-auto tabular-nums text-subtle">
                  {viewer.plan.used}{viewer.plan.max !== null ? ` / ${viewer.plan.max}` : ''} liens
                </span>
              </div>
              {viewer.plan.max !== null && (
                <div className="meter mt-2"><span style={{ width: `${Math.min(100, (viewer.plan.used / viewer.plan.max) * 100)}%` }} /></div>
              )}
              <Link href="/offres" className="link mt-3 text-[13px]">Voir les offres <ArrowRightIcon className="h-4 w-4" /></Link>
            </div>
          )}
          <div className="flex items-center gap-2.5 px-2 py-1.5 text-[13px]">
            {viewer.user ? (
              <>
                {/* Nom + email : accès à « Mon compte » */}
                <Link
                  href="/compte"
                  aria-current={isCurrent(pathname, '/compte') ? 'page' : undefined}
                  title="Mon compte"
                  className={`-my-1 -ml-1.5 flex min-w-0 grow items-center gap-2.5 rounded-2xl py-1 pl-1.5 pr-2 transition hover:bg-soft ${isCurrent(pathname, '/compte') ? 'bg-surface shadow-[0_0_0_1px_var(--line)]' : ''}`}
                >
                  <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-coral text-[13px] font-bold text-white">
                    {initials(viewer.user.name || viewer.user.email)}
                  </span>
                  <span className="min-w-0 grow">
                    <span className="block truncate font-semibold">{viewer.user.name || viewer.user.email}</span>
                    <span className="block truncate text-xs text-subtle">{viewer.user.email}</span>
                  </span>
                </Link>
                <SignOutButton />
              </>
            ) : (
              <span className="grow text-xs text-subtle">Mode visiteur</span>
            )}
            <Link href="/bienvenue" className="icon-btn" aria-label="Aide : visite guidée" title="Visite guidée">
              <QuestionMarkCircleIcon />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* ── Contenu ── */}
      <div className="min-w-0 lg:py-3 lg:pr-3">
        {/* En-tête mobile */}
        <header className="flex items-center gap-2 px-4 py-3.5 lg:hidden">
          <Logo compact />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {guest ? (
              <Link href="/connexion" className="btn btn-soft btn-sm">Se connecter</Link>
            ) : (
              <details className="relative">
                <summary className="grid h-[34px] w-[34px] cursor-pointer list-none place-items-center rounded-full bg-coral text-[13px] font-bold text-white" aria-label="Menu du compte">
                  {initials(viewer.user!.name || viewer.user!.email)}
                </summary>
                <div className="card absolute right-0 top-11 z-50 w-56 p-2">
                  <Link href="/compte" className="btn btn-ghost btn-sm w-full justify-start">Mon compte</Link>
                  <Link href="/offres" className="btn btn-ghost btn-sm w-full justify-start">Offres</Link>
                  <Link href="/bienvenue" className="btn btn-ghost btn-sm w-full justify-start">Visite guidée</Link>
                  <SignOutButton withLabel />
                </div>
              </details>
            )}
          </div>
        </header>

        <main className="min-h-[calc(100vh-24px)] bg-bg pb-28 lg:rounded-[30px] lg:bg-surface lg:pb-0 lg:shadow-[0_0_0_1px_var(--line),var(--shadow)]">
          {children}
          <MadeBy className="px-4 pb-6 pt-10" />
        </main>
      </div>

      {/* ── Barre d'onglets (mobile) ── */}
      {/* 5 colonnes, « + » au centre. Connexion et compte : en-tête (bouton ou avatar). */}
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 items-end rounded-[22px] bg-surface p-2 shadow-[0_0_0_1px_var(--line),var(--shadow-lg)] lg:hidden" aria-label="Navigation">
        {TABS.slice(0, 2).map((t) => <Tab key={t.href} {...t} current={isCurrent(pathname, t.href)} />)}
        <Link href="/creer" aria-label="Créer un lien ou un QR" className="grid place-items-center">
          <span className="-mt-[22px] grid h-12 w-12 place-items-center rounded-2xl bg-ink text-bg shadow-[0_12px_24px_-10px_rgba(22,22,29,.6)]"><NavIcon icon={PlusIcon} className="h-6 w-6" /></span>
        </Link>
        {TABS.slice(2).map((t) => <Tab key={t.href} {...t} current={isCurrent(pathname, t.href)} />)}
      </nav>
    </div>
  )
}
