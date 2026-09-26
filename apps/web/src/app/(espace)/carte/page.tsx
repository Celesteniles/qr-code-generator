import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRightIcon, CheckIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { getCardBySlug } from '@link/db'
import { getWorkspaceLinks } from '@/server/links'
import { getDb } from '@/server/data'
import { getViewer } from '@/server/viewer'
import { Illustration } from '@/components/kit/Illustration'
import { CardView } from '@/components/carte/CardView'
import { CreateCardForm } from '@/components/carte/CreateCardForm'
import { cardInitials, safeTheme, textOn, DEFAULT_THEME, EMPTY_SOCIALS } from '@/components/carte/card-model'

export const metadata: Metadata = { title: 'Carte de visite · link.cg' }

const BENEFITS = [
  { t: 'Un lien et un QR', d: 'À mettre dans votre bio, votre signature d\'email, sur vos flyers et votre badge.' },
  { t: 'On vous joint en un geste', d: 'Appeler, écrire sur WhatsApp, envoyer un email ou vous enregistrer dans ses contacts.' },
  { t: 'Modifiable à tout moment', d: 'Nouveau numéro, nouveau poste ? Vous changez la carte, le QR imprimé reste bon.' },
]

export default async function CartePage({ searchParams }: { searchParams: Promise<{ liste?: string }> }) {
  const { ctx } = await getViewer()
  if (!ctx) return <GuestCarte />

  const { liste } = await searchParams
  const db = getDb()
  const cardLinks = (await getWorkspaceLinks(ctx.workspaceId)).filter((l) => l.kind === 'card')

  // Une seule carte : on va droit à son éditeur (sauf si l'on veut voir la liste / en créer une autre).
  if (cardLinks.length === 1 && !liste) redirect(`/carte/${cardLinks[0].slug}`)

  const cards = await Promise.all(cardLinks.map(async (l) => ({ link: l, profile: (await getCardBySlug(db, l.slug))?.profile ?? null })))

  return (
    <div className="px-4 py-6 sm:px-8 lg:px-10 lg:py-9">
      <h1 className="h1">{cards.length ? 'Vos cartes de visite' : 'Votre carte de visite'}</h1>
      <p className="lead mt-2 max-w-[60ch]">
        Un lien et un QR qui mènent à vos coordonnées. Vos contacts vous appellent, vous écrivent ou vous enregistrent en un geste.
      </p>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        {cards.length > 0 ? (
          <ul className="grid min-w-0 grid-cols-1 gap-3" aria-label="Vos cartes">
            {cards.map(({ link, profile }) => {
              const theme = safeTheme(profile?.theme)
              const name = profile?.fullName || 'Carte sans nom'
              return (
                <li key={link.id}>
                  <Link href={`/carte/${link.slug}`} className="card flex items-center gap-4 p-4 transition hover:shadow-[0_0_0_1px_var(--line-strong),var(--shadow)]">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-display text-lg font-bold"
                      style={{ background: theme, color: textOn(theme) }} aria-hidden="true">
                      {cardInitials(name) || '•'}
                    </span>
                    <span className="min-w-0 grow">
                      <span className="block truncate font-semibold">{name}</span>
                      <span className="linkchip !block truncate text-[13px]"><span className="host">link.cg/</span>{link.slug}</span>
                    </span>
                    {!link.active && <span className="pill pill-soft">En pause</span>}
                    <span className="hidden text-sm font-semibold text-brand sm:inline">Modifier</span>
                    <ChevronRightIcon className="h-5 w-5 shrink-0 text-subtle" aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="card overflow-hidden">
            <Illustration name="card" height={200} className="bg-coral-tint" />
            <div className="p-6">
              <h2 className="h3">Pas encore de carte</h2>
              <p className="mt-1 text-muted">Créez-la en une minute : un nom et une adresse suffisent pour commencer.</p>
            </div>
          </div>
        )}
        <CreateCardForm first={cards.length === 0} />
      </div>
    </div>
  )
}

function GuestCarte() {
  const next = encodeURIComponent('/carte')
  return (
    <div className="px-4 py-6 sm:px-8 lg:px-10 lg:py-9">
      <div className="grid items-center gap-10 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <Illustration name="card" height={180} className="max-w-[360px] overflow-hidden rounded-[26px] bg-coral-tint" />
          <h1 className="h1 mt-6 text-balance">Votre carte de visite en un lien et un QR</h1>
          <p className="lead mt-3 max-w-[58ch]">
            Une page à votre nom avec vos coordonnées. Vos contacts vous appellent, vous écrivent sur WhatsApp
            ou vous enregistrent dans leur téléphone, sans rien taper.
          </p>
          <ul className="mt-6 grid gap-4">
            {BENEFITS.map((b) => (
              <li key={b.t} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ok-tint text-ok" aria-hidden="true">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <span><strong className="font-semibold">{b.t}.</strong> <span className="text-muted">{b.d}</span></span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={`/connexion?mode=inscription&next=${next}`} className="btn btn-cta btn-lg">
              Créer ma carte gratuite <ArrowRightIcon />
            </Link>
            <Link href={`/connexion?next=${next}`} className="btn btn-ghost">J&apos;ai déjà un compte</Link>
          </div>
          <p className="mt-3 text-sm text-muted">Un compte gratuit est nécessaire pour mettre votre carte en ligne.</p>
        </div>

        <figure className="mx-auto w-full max-w-[340px]">
          <div className="rounded-[46px] bg-[#16161d] p-3 shadow-[var(--shadow-lg)]" aria-hidden="true">
            <div className="overflow-hidden rounded-[36px]">
              <CardView interactive={false} fields={{
                fullName: 'Votre nom', title: 'Votre fonction', org: 'Votre entreprise',
                phone: 'Votre numéro', whatsapp: '', email: 'vous@exemple.cg', website: '', theme: DEFAULT_THEME,
                socials: { ...EMPTY_SOCIALS, facebook: 'votrepage', tiktok: '@votrenom', instagram: '@votrenom' },
              }} />
            </div>
          </div>
          <figcaption className="mt-3 text-center text-[13px] text-muted">Exemple : ce que verront vos contacts</figcaption>
        </figure>
      </div>
    </div>
  )
}
