'use client'

import Link from 'next/link'
import { ArrowDownTrayIcon, ChartBarIcon, DevicePhoneMobileIcon, LinkIcon, QrCodeIcon, UserIcon } from '@heroicons/react/24/outline'
import { QrCanvas } from '@/components/kit/QrCanvas'
import { DEFAULT_DESIGN } from '@/lib/qr-design'
import { CopyButton } from './CopyButton'
import { downloadQr, qrFileName } from './qr-file'
import { SHORT_HOST, typeLabel, nf, type LinkItem } from './model'

const TYPE_ICON = { static: LinkIcon, app: DevicePhoneMobileIcon, card: UserIcon }

/** Carte d'un lien dans « Mes liens & QR ». Toute la carte mène à sa fiche. */
export function LinkCard({ link }: { link: LinkItem }) {
  const href = link.kind === 'card' ? `/carte/${link.slug}` : `/liens/${link.id}`
  // Un lien court sans style de QR enregistré se montre par son adresse (« lien d'abord »).
  const linkFirst = !link.design && link.kind !== 'card'
  const design = link.design ?? DEFAULT_DESIGN
  const TypeIcon = TYPE_ICON[link.kind]

  const status = link.active
    ? <span className="pill pill-ok absolute right-2.5 top-2.5"><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />En ligne</span>
    : <span className="pill pill-sun absolute right-2.5 top-2.5">En pause</span>
  const type = (
    <span className="pill pill-soft absolute left-2.5 top-2.5"><TypeIcon aria-hidden="true" />{typeLabel(link.kind, !!link.design)}</span>
  )

  return (
    <article className="group relative flex flex-col rounded-3xl bg-surface p-3 shadow-[inset_0_0_0_1.5px_var(--line-strong)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_0_0_1.5px_var(--subtle),0_18px_40px_-26px_rgba(22,22,29,.5)]">
      {linkFirst ? (
        <div className="relative grid min-h-[186px] rounded-[18px] bg-sky px-2.5 pb-2 shadow-[inset_0_0_0_1px_var(--line)]">
          {type}{status}
          <div className="grid gap-1.5 self-end px-1.5 pt-10">
            <span className="linkchip !inline max-w-full !whitespace-normal break-words text-lg"><span className="host">{SHORT_HOST}/</span>{link.slug}</span>
            <span className="text-[13px] text-muted">QR disponible dans la fiche</span>
          </div>
        </div>
      ) : (
        <div className="relative grid place-items-center rounded-[18px] bg-soft px-2.5 pb-[22px] pt-12 shadow-[inset_0_0_0_1px_var(--line)]">
          {type}{status}
          <div className={`qr-thumb rounded-2xl p-2.5 ${link.active ? '' : 'opacity-50 grayscale'}`}>
            <QrCanvas data={link.shortUrl} design={design} size={132} />
          </div>
        </div>
      )}

      <div className="px-1.5 pb-1.5 pt-3.5">
        <Link
          href={href}
          className="block truncate font-display text-[17px] font-[650] tracking-[-.01em] after:absolute after:inset-0 after:rounded-3xl after:content-['']"
        >
          <span className="text-muted">{SHORT_HOST}/</span>{link.slug}
        </Link>
        <p className="mt-0.5 truncate text-[13px] text-muted" title={link.destination}>→ {link.destination}</p>
      </div>

      <div className="mt-2.5 flex items-center gap-0.5 border-t border-line px-0.5 pt-2.5">
        <span className="mr-auto flex items-center gap-1.5 whitespace-nowrap text-[13px] text-muted">
          <ChartBarIcon className="h-4 w-4" aria-hidden="true" />
          {link.visits > 0
            ? <><b className="tabular-nums text-ink">{nf.format(link.visits)}</b> {link.visits > 1 ? 'visites' : 'visite'}</>
            : 'Pas de visite ce mois'}
        </span>
        <CopyButton text={link.shortUrl} />
        <button
          type="button"
          className="icon-btn relative z-10"
          aria-label="Télécharger le QR (PNG)"
          title="Télécharger le QR"
          onClick={() => downloadQr(link.shortUrl, design, 'png', qrFileName(link.slug))}
        >
          {linkFirst ? <QrCodeIcon /> : <ArrowDownTrayIcon />}
        </button>
      </div>
    </article>
  )
}
