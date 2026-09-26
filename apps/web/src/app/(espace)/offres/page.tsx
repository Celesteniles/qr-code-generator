import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckIcon } from '@heroicons/react/24/outline'
import { PLANS, type Plan, type PlanSpec } from '@link/shared'
import { Illustration } from '@/components/kit/Illustration'
import { getViewer } from '@/server/viewer'

// Offres (proposition D). Référence : docs/maquettes/d-offres.html.
// Le prix Pro n'est pas fixé : on ne l'invente pas.

export const metadata: Metadata = {
  title: 'Offres — link.cg',
  description:
    'QR codes fixes gratuits, sans compte. Liens courts et QR modifiables : offre Gratuite, Pro ou Entreprise, paiement Airtel Money ou MTN MoMo.',
}

const CONTACT = 'contact@nscreative.cg'

/** Fonctionnalités dans le vocabulaire D (les limites viennent de PLANS). */
function features(p: PlanSpec): string[] {
  const links = p.maxLinks === null ? 'Liens courts illimités, avec leur QR' : `${p.maxLinks} liens courts, avec leur QR`
  switch (p.id) {
    case 'free':
      return [links, 'QR fixes illimités, sans compte', 'Visites : clics et scans', 'Carte de visite digitale']
    case 'pro':
      return [links, 'Votre propre domaine (ex. go.monresto.cg)', 'Statistiques détaillées', 'Support prioritaire']
    case 'enterprise':
      return [links, 'Plusieurs domaines', 'Plusieurs utilisateurs', 'Accompagnement dédié par NS Creative']
  }
}

const TAGLINE: Record<Plan, string> = {
  free: 'Pour démarrer et tester',
  pro: 'Commerces, restaurants, agences',
  enterprise: 'Réseaux, institutions, grandes marques',
}

const FAQ = [
  {
    q: 'Faut-il un compte pour créer un QR code ?',
    a: 'Non. Les QR fixes sont gratuits et sans compte. Le compte sert aux liens courts et aux QR modifiables, dont vous pouvez changer la destination après impression.',
  },
  {
    q: 'Mes clients voient-ils de la publicité ?',
    a: 'Non. En cliquant sur le lien ou en scannant le QR, ils arrivent directement à votre destination, sans page de publicité.',
  },
  {
    q: 'Un QR fixe peut-il devenir modifiable ?',
    a: 'Pas le QR déjà imprimé : son contenu est gravé dedans. Mais on peut créer un lien court avec un QR au même style, à imprimer une dernière fois ; ensuite, vous changez la destination quand vous voulez.',
  },
  {
    q: 'Pouvez-vous imprimer mes QR ?',
    a: 'Oui, l’impression est possible via NS Creative : autocollants de table, flyers, cartes de visite, kakémonos. Écrivez-nous pour un devis.',
  },
  {
    q: 'Comment passer à l’offre Pro ?',
    a: `Écrivez-nous à ${CONTACT}. Le paiement se fait par Airtel Money ou MTN MoMo.`,
  },
]

export default async function OffresPage() {
  const { viewer } = await getViewer()
  const current = viewer.plan?.label ?? null
  const signedIn = !!viewer.user
  const order = [PLANS.free, PLANS.pro, PLANS.enterprise]

  return (
    <div className="px-4 pb-14 pt-6 lg:px-8 lg:pt-10">
      <div className="mx-auto max-w-[640px] text-center">
        <span className="pill pill-sun">Offres</span>
        <h1 className="display mt-4">Commencez gratuitement. <span className="hl">Grandissez</span> à votre rythme.</h1>
        <p className="lead mt-4">
          Les QR fixes restent gratuits, sans compte. Les offres concernent les liens courts, et les QR modifiables qui vont avec.
        </p>
      </div>

      <div className="stagger mt-8 grid items-stretch gap-4 min-[960px]:grid-cols-3">
        {order.map((p) => {
          const pop = p.id === 'pro'
          const isCurrent = signedIn && current === p.label
          const mail = `mailto:${CONTACT}?subject=${encodeURIComponent(`Offre ${p.label} link.cg`)}`
          return (
            <article key={p.id}
              className={`flex flex-col rounded-[28px] p-7 ${pop ? 'bg-ink text-bg shadow-[var(--shadow-lg)]' : 'bg-surface shadow-[inset_0_0_0_1.5px_var(--line)]'}`}>
              <div className="flex items-center gap-2">
                <h2 className="h3">{p.label}</h2>
                {isCurrent && <span className="pill pill-ok ml-auto">Votre offre</span>}
              </div>
              <p className={`mt-1 text-sm ${pop ? 'text-bg/70' : 'text-muted'}`}>{TAGLINE[p.id]}</p>
              <div className="mt-[18px] font-display text-[34px] font-bold tracking-[-.03em]">
                {p.id === 'free' ? '0 FCFA' : p.id === 'pro' ? 'Sur demande' : 'Sur devis'}
              </div>
              {p.id === 'pro' && <p className="text-sm text-bg/70">Tarif mensuel à venir, en FCFA.</p>}
              <ul className="mb-[26px] mt-[22px] grid flex-1 content-start gap-2.5 text-sm">
                {features(p).map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckIcon className={`mt-0.5 h-[17px] w-[17px] shrink-0 ${pop ? 'text-[#7be0a8]' : 'text-ok'}`} strokeWidth={2.5} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className={`btn w-full cursor-default ${pop ? 'bg-bg/15 text-bg' : 'btn-soft'}`} aria-disabled="true">Offre actuelle</span>
              ) : p.id === 'free' ? (
                signedIn
                  ? <span className="btn btn-soft w-full cursor-default" aria-disabled="true">Incluse dans votre offre</span>
                  : <Link className="btn btn-soft w-full" href="/connexion?mode=inscription">Créer mon compte</Link>
              ) : pop ? (
                <a className="btn btn-brand w-full" href={mail}>Passer à Pro</a>
              ) : (
                <a className="btn btn-soft w-full" href={mail}>Parlons-en</a>
              )}
            </article>
          )
        })}
      </div>

      <section className="card mt-8 grid items-center gap-7 p-7 min-[960px]:grid-cols-[200px_minmax(0,1fr)]" aria-labelledby="pay-title">
        <Illustration name="print" className="w-full max-w-[240px] overflow-hidden rounded-[22px] bg-coral-tint" />
        <div>
          <h2 id="pay-title" className="h2">Payez comme vous en avez l&apos;habitude</h2>
          <p className="mt-2 text-muted">Mobile money, sans carte bancaire. Écrivez-nous, on vous indique comment régler.</p>
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            <span className="inline-flex h-10 items-center rounded-xl bg-[#e40000] px-4 text-sm font-bold text-white">Airtel Money</span>
            <span className="inline-flex h-10 items-center rounded-xl bg-[#ffcc00] px-4 text-sm font-bold text-[#16161d]">MTN MoMo</span>
          </div>
        </div>
      </section>

      <h2 className="h2 mt-12">Questions fréquentes</h2>
      <div className="mt-4 grid gap-2">
        {FAQ.map((f, i) => (
          <details key={f.q} open={i === 0} className="group rounded-[18px] bg-soft px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center gap-2.5 font-semibold [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="ml-auto text-xl leading-none text-subtle" aria-hidden="true">
                <span className="group-open:hidden">+</span><span className="hidden group-open:inline">–</span>
              </span>
            </summary>
            <p className="mt-2.5 text-sm text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
