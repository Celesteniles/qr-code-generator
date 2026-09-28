import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { GlobeAltIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { getViewer } from '@/server/viewer'
import { getDomainsOverview } from '@/server/domains'
import { SectionHead } from '@/components/compte/SectionHead'
import { DomainsPanel } from '@/components/compte/DomainsPanel'
import { CompteTabs } from '../CompteTabs'

export const metadata: Metadata = { title: 'Domaines — link.cg' }

export default async function DomainesPage() {
  const { ctx } = await getViewer()
  if (!ctx) redirect('/connexion?next=/compte/domaines')
  const overview = await getDomainsOverview(ctx.workspaceId)

  return (
    <div className="px-4 pb-14 pt-6 sm:px-8 lg:px-10 lg:pt-9">
      <h1 className="h1">Mon compte</h1>
      <p className="lead mt-2 max-w-[60ch]">Vos liens à votre nom : go.monresto.cg/menu plutôt que link.cg/menu.</p>
      <CompteTabs current="/compte/domaines" />

      <div className="mt-8 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card min-w-0 p-5 sm:p-[26px]" aria-labelledby="d-domaines">
          <SectionHead icon={<GlobeAltIcon />} tone="bg-brand-tint text-brand" id="d-domaines" title="Domaines personnalisés">
            {overview.max > 1
              ? `Votre offre ${overview.planLabel} inclut jusqu’à ${overview.max} domaines.`
              : overview.max === 1 ? `Votre offre ${overview.planLabel} inclut un domaine.` : undefined}
          </SectionHead>
          <DomainsPanel
            planLabel={overview.planLabel}
            max={overview.max}
            enabled={overview.enabled}
            cnameTarget={overview.cnameTarget}
            domains={overview.domains}
          />
        </section>

        <section className="card p-5 sm:p-[26px]" aria-labelledby="d-comment">
          <SectionHead icon={<QuestionMarkCircleIcon />} tone="bg-sky text-ink" id="d-comment" title="Comment ça marche ?" />
          <ol className="grid list-decimal gap-2 pl-5 text-sm text-muted">
            <li>Ajoutez un sous-domaine d&apos;un domaine qui vous appartient.</li>
            <li>Chez votre hébergeur de domaine, faites-le pointer vers nous (enregistrement CNAME).</li>
            <li>Cliquez sur « Vérifier ». Dès qu&apos;il est actif, avec son certificat https, choisissez-le en créant un lien.</li>
          </ol>
          <p className="mt-3 text-sm text-muted">
            Vos liens link.cg continuent de fonctionner. Un domaine qui porte encore des liens ne peut pas être retiré :
            ils sont peut-être imprimés.
          </p>
        </section>
      </div>
    </div>
  )
}
