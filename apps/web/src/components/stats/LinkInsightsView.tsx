import { ClockIcon, DevicePhoneMobileIcon, GlobeAltIcon, QrCodeIcon } from '@heroicons/react/24/outline'
import { MIN_VISITS_FOR_TRENDS, formatPeak, type LinkInsights } from '@/server/insights'
import { nf, pct, visitsText } from './format'
import { MomentsHeatmap } from './MomentsHeatmap'
import { ShareList } from './ShareList'
import { StatsTabs } from './StatsTabs'

// Détail des visites d'un lien : quelques repères (seulement s'il y a assez de
// visites), puis quatre onglets — lieux, appareils, provenance, moments.
// On n'affiche que ce que les données disent : rien n'est deviné ni extrapolé.

export function LinkInsightsView({ data }: { data: LinkInsights }) {
  if (data.total === 0) {
    return <p className="mt-5 text-sm text-muted">Le détail (pays, appareils, moments…) apparaîtra dès les premières visites.</p>
  }

  const enough = data.total >= MIN_VISITS_FOR_TRENDS
  return (
    <div className="mt-6 border-t border-line pt-6">
      <h3 className="h3">En détail</h3>
      {enough ? (
        <Highlights data={data} />
      ) : (
        <p className="mt-1 text-sm text-muted">
          Pas encore assez de visites pour dégager une tendance ({visitsText(data.total)} sur {data.days} jours). Voici déjà le détail.
        </p>
      )}
      <div className="mt-5">
        <StatsTabs
          label="Détail des visites"
          tabs={[
            { id: 'lieux', label: 'Lieux', content: <Places data={data} /> },
            { id: 'appareils', label: 'Appareils', content: <Devices data={data} /> },
            { id: 'provenance', label: 'Provenance', content: <Sources data={data} /> },
            { id: 'moments', label: 'Moments', content: <Moments data={data} enough={enough} /> },
          ]}
        />
      </div>
    </div>
  )
}

function Highlights({ data }: { data: LinkInsights }) {
  const country = data.countries.find((c) => c.key !== 'XX' && c.key !== 'autres')
  const mobile = data.devices.find((d) => d.key === 'mobile')
  const known = data.channel.qr + data.channel.link
  const items: { icon: React.ReactNode; text: React.ReactNode }[] = []
  if (mobile && data.analyzed > 0) items.push({ icon: <DevicePhoneMobileIcon />, text: <><b>{pct(mobile.share)}</b> sur mobile</> })
  if (country) items.push({ icon: <GlobeAltIcon />, text: <>Surtout <b>{country.flag ? `${country.flag} ` : ''}{country.label}</b> ({pct(country.share)})</> })
  if (data.peak) items.push({ icon: <ClockIcon />, text: <>Le plus actif : <b>{formatPeak(data.peak)}</b></> })
  if (known >= MIN_VISITS_FOR_TRENDS) items.push({ icon: <QrCodeIcon />, text: <><b>{pct(data.channel.qr / known)}</b> de scans de QR</> })
  if (!items.length) return null
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {items.map((it, i) => (
        <li key={i} className="inline-flex items-center gap-2 rounded-full bg-soft px-3 py-1.5 text-sm shadow-[inset_0_0_0_1px_var(--line)] [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 [&_svg]:text-brand">
          <span aria-hidden="true">{it.icon}</span>
          <span>{it.text}</span>
        </li>
      ))}
    </ul>
  )
}

function Places({ data }: { data: LinkInsights }) {
  return (
    <div className="grid gap-7 sm:grid-cols-2">
      <ShareList title="Pays" items={data.countries} max={12} />
      {data.cities.length > 0 ? (
        <ShareList
          title="Villes"
          items={data.cities}
          tone="leaf"
          note={data.citiesKnown < data.total
            ? <>Ville connue pour {nf.format(data.citiesKnown)} visite{data.citiesKnown > 1 ? 's' : ''} sur {nf.format(data.total)}.</>
            : null}
        />
      ) : (
        <div>
          <h4 className="text-[13px] font-semibold text-muted">Villes</h4>
          <p className="mt-2 text-sm text-subtle">Les villes sont relevées pour les nouvelles visites : elles apparaîtront ici.</p>
        </div>
      )}
    </div>
  )
}

function Devices({ data }: { data: LinkInsights }) {
  if (data.analyzed === 0) return <p className="text-sm text-muted">Aucun appareil identifié pour le moment.</p>
  return (
    <div className="grid gap-7 sm:grid-cols-2">
      <ShareList title="Appareils" items={data.devices} />
      <ShareList title="Systèmes" items={data.systems} tone="leaf" />
      <ShareList
        title="Navigateurs"
        items={data.browsers}
        tone="coral"
        note="Certaines applications, comme WhatsApp, ouvrent les liens sans se déclarer : leurs visites apparaissent sous le navigateur du téléphone ou en « navigateur intégré »."
      />
      {data.apps.length > 0 && (
        <ShareList title="Ouvert depuis une application" items={data.apps} note="Uniquement les applications qui se déclarent (Facebook, Instagram, TikTok…)." />
      )}
      {data.analyzed < data.total && (
        <p className="text-xs text-subtle sm:col-span-2">
          Détail établi sur {nf.format(data.analyzed)} visites sur {nf.format(data.total)} (les appareils les plus courants).
        </p>
      )}
    </div>
  )
}

function Sources({ data }: { data: LinkInsights }) {
  const { qr, link, unknown } = data.channel
  const known = qr + link
  return (
    <div className="grid gap-7">
      <div>
        <h4 className="text-[13px] font-semibold text-muted">Scans de QR ou clics sur le lien</h4>
        {known > 0 ? (
          <>
            <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-soft" aria-hidden="true">
              <span className="h-full bg-brand" style={{ width: `${(qr / known) * 100}%` }} />
              <span className="h-full bg-leaf" style={{ width: `${(link / known) * 100}%` }} />
            </div>
            <ul className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-brand" aria-hidden="true" />
                Scans de QR <b className="tabular-nums">{pct(qr / known)}</b><span className="text-subtle tabular-nums">· {nf.format(qr)}</span>
                <span className="sr-only"> ({visitsText(qr)})</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-leaf" aria-hidden="true" />
                Clics sur le lien <b className="tabular-nums">{pct(link / known)}</b><span className="text-subtle tabular-nums">· {nf.format(link)}</span>
                <span className="sr-only"> ({visitsText(link)})</span>
              </li>
            </ul>
            <p className="mt-2 text-xs text-subtle">
              {unknown > 0 && <>Calculé sur les {nf.format(known)} visites récentes ; les {nf.format(unknown)} plus anciennes ne faisaient pas la différence. </>}
              Un QR imprimé avant cette distinction est compté comme un clic.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-subtle">Les nouveaux QR distinguent désormais scans et clics : la répartition apparaîtra ici avec les prochaines visites.</p>
        )}
      </div>
      <ShareList
        title="D’où viennent les visiteurs"
        items={data.sources}
        tone="leaf"
        note="Un QR scanné, un lien ouvert depuis WhatsApp, un SMS ou un e-mail n’indiquent généralement pas de site d’origine : ils sont regroupés en « Direct ou QR »."
      />
    </div>
  )
}

function Moments({ data, enough }: { data: LinkInsights; enough: boolean }) {
  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        {enough && data.peak
          ? <>Le créneau le plus actif : <b className="text-ink">{formatPeak(data.peak)}</b> ({visitsText(data.peak.visits)}).</>
          : 'Pas encore assez de visites pour dégager une tendance.'}
      </p>
      <MomentsHeatmap grid={data.moments} />
    </div>
  )
}
