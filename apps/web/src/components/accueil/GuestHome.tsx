import Link from 'next/link'
import type { ReactNode } from 'react'
import { PLANS } from '@link/shared'
import { ArrowPathIcon, ArrowRightIcon, LinkIcon, QrCodeIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { Illustration, type IllustrationName } from '@/components/kit/Illustration'
import { Shortener } from './Shortener'
import { DeviceQrs } from './DeviceQrs'

// Accueil du visiteur (sans compte). Référence : docs/maquettes/d-accueil.html.

const PRODUCTS: {
  href: string; title: string; text: ReactNode; ill: IllustrationName; bg: string; tags: ReactNode
}[] = [
  {
    href: '/creer?mode=lien', title: 'Lien court', ill: 'shortlink', bg: 'bg-sky',
    text: <>Une adresse <span className="font-mono">link.cg/…</span> facile à partager et à retenir. Destination modifiable, visites comptées.</>,
    tags: <><span className="pill pill-brand"><QrCodeIcon />QR inclus</span><span className="pill pill-soft">Selon le téléphone</span></>,
  },
  {
    href: '/creer?mode=qr', title: 'QR code', ill: 'welcome', bg: 'bg-sun',
    text: 'Pour vos affiches, menus et emballages. Fixe et gratuit sans compte, ou modifiable grâce à un lien court.',
    tags: <><span className="pill pill-ok">Sans compte</span><span className="pill pill-soft">PNG · SVG · PDF</span></>,
  },
  {
    href: '/carte', title: 'Carte de visite', ill: 'card', bg: 'bg-coral-tint',
    text: 'Votre profil pro en un lien et un QR : on vous appelle, on vous écrit sur WhatsApp, on enregistre votre contact.',
    tags: <span className="pill pill-brand"><LinkIcon />Lien + QR</span>,
  },
]

const INTENTS: { href: string; label: string; ill: IllustrationName; bg: string }[] = [
  { href: '/creer?mode=lien&type=whatsapp', label: 'Un lien pour mes statuts WhatsApp', ill: 'share', bg: 'bg-mint' },
  { href: '/creer?mode=qr&type=menu', label: 'Le QR de mon menu', ill: 'menu', bg: 'bg-sun' },
  { href: '/creer?mode=lien&type=app', label: 'Un lien vers mon application', ill: 'app', bg: 'bg-lilac' },
  { href: '/creer?mode=qr&type=whatsapp', label: 'Un QR « Écrivez-nous »', ill: 'whatsapp', bg: 'bg-mint' },
  { href: '/creer?mode=qr&type=wifi', label: 'Le QR de mon Wi‑Fi', ill: 'wifi', bg: 'bg-mint' },
  { href: '/creer?mode=lien&type=site', label: 'Un lien propre pour ma bio', ill: 'link', bg: 'bg-sky' },
]

const STEPS = [
  { t: 'Collez un lien ou dites ce que le QR ouvre', d: 'Un site, votre WhatsApp, votre Wi‑Fi… on s’adapte.' },
  { t: 'Choisissez l’adresse et le style', d: 'link.cg/votre-nom, couleurs, logo au centre. Aperçu en direct.' },
  { t: 'Partagez ou imprimez', d: 'Le lien sur WhatsApp, le QR sur vos supports. Avec un compte, changez la destination quand vous voulez.' },
]

export function GuestHome() {
  return (
    <>
      <h1 className="display max-w-[17ch]">Partagez tout, en <span className="hl">un lien</span> ou <span className="hl">un QR</span>.</h1>
      <p className="lead mt-4 max-w-[60ch]">
        Raccourcissez vos liens pour WhatsApp, Facebook ou vos SMS. Créez des QR codes pour vos affiches et vos tables.
        Avec un compte gratuit, ils restent modifiables et vous disent combien de personnes les ouvrent.
      </p>

      <Shortener className="mt-8 max-w-[760px]" placeholder="Collez un long lien : https://…" />
      <p className="help"><SparklesIcon aria-hidden="true" />Le QR du lien est inclus, prêt à imprimer.</p>

      <h2 className="h2 mt-12">Ou choisissez ce que vous créez</h2>
      <div className="stagger mt-4 grid gap-3.5 min-[900px]:grid-cols-3">
        {PRODUCTS.map((p) => (
          <Link key={p.href} href={p.href}
            className="group flex flex-col gap-3 rounded-[24px] bg-surface p-3.5 shadow-[inset_0_0_0_1px_var(--line)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_0_0_1px_var(--line-strong),0_18px_40px_-26px_rgba(22,22,29,.5)]">
            <Illustration name={p.ill} height={140} className={`overflow-hidden rounded-2xl ${p.bg}`} />
            <div className="px-1.5 pb-1.5 pt-1">
              <div className="flex items-center gap-2 font-display text-xl font-bold tracking-[-.02em]">
                {p.title}<ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
              <p className="mt-1.5 text-sm text-muted">{p.text}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{p.tags}</div>
            </div>
          </Link>
        ))}
      </div>
      <div className="tip blue mt-4">
        <span className="tip-ico"><ArrowPathIcon aria-hidden="true" /></span>
        <div>
          <strong>Lien ou QR ? Pas besoin de choisir.</strong>
          Chaque lien court a son QR, et un QR modifiable, c&apos;est un lien court. Partagez l&apos;un sur WhatsApp,
          imprimez l&apos;autre : c&apos;est la même destination, les mêmes statistiques.
        </div>
      </div>

      <h2 className="h2 mt-12">Idées pour commencer</h2>
      <ul className="stagger mt-5 grid gap-3.5 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3">
        {INTENTS.map((i) => (
          <li key={i.label}>
            <Link href={i.href}
              className="group flex h-full flex-col gap-2.5 rounded-[22px] bg-surface p-3 shadow-[inset_0_0_0_1px_var(--line)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_0_0_1px_var(--line-strong),0_16px_36px_-24px_rgba(22,22,29,.5)]">
              <Illustration name={i.ill} height={120} className={`overflow-hidden rounded-[14px] ${i.bg}`} />
              <span className="flex items-center gap-2 px-1 pb-1">
                <strong className="text-[15px]">{i.label}</strong>
                <ArrowRightIcon className="ml-auto h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="h2 mt-12">Comment ça marche</h2>
      <ol className="stagger mt-5 grid gap-3.5 min-[860px]:grid-cols-3">
        {STEPS.map((s, k) => (
          <li key={s.t} className="zone p-5">
            <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-ink text-[13px] font-bold text-bg" aria-hidden="true">{k + 1}</span>
            <h3 className="h3 mt-3">{s.t}</h3>
            <p className="mt-1 text-sm text-muted">{s.d}</p>
          </li>
        ))}
      </ol>

      <DeviceQrs />

      <section className="cta-banner mt-8">
        <div>
          <span className="pill pill-sun">Compte gratuit</span>
          <h2 className="h1 mt-3 !text-[32px]">Des liens qui travaillent pour vous.</h2>
          <p>
            {`Avec un compte : ${PLANS.free.maxLinks} liens courts modifiables, leur QR, et le nombre de visites chaque jour.`}
            Paiement mobile money pour l&apos;offre Pro.
          </p>
          <Link className="btn btn-brand btn-lg mt-5" href="/connexion?mode=inscription">
            Créer mon compte gratuit <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
        <Illustration name="stats" className="max-[720px]:hidden" />
      </section>
    </>
  )
}
