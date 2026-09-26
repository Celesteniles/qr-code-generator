import type { Metadata } from 'next'
import Link from 'next/link'
import { PlusIcon } from '@heroicons/react/24/outline'
import { getQrDesigns, getCardBySlug } from '@link/db'
import { getWorkspaceLinks } from '@/server/links'
import { getDb } from '@/server/data'
import { getViewer } from '@/server/viewer'
import { getScanCounts } from '@/server/scans'
import { toDesign } from '@/lib/qr-design'
import { LinksBoard } from '@/components/liens/LinksBoard'
import { describeRule, shortUrl, type LinkItem } from '@/components/liens/model'

export const metadata: Metadata = { title: 'Mes liens & QR — link.cg' }

async function loadLinks(workspaceId: string): Promise<LinkItem[]> {
  const db = getDb()
  const links = await getWorkspaceLinks(workspaceId)
  if (links.length === 0) return []

  // Visites comptées depuis la création de chaque lien (adresse reprise : pas d'héritage).
  const cards = links.filter((l) => l.kind === 'card')
  const [scans, designs, cardProfiles] = await Promise.all([
    getScanCounts(links),
    getQrDesigns(db, links.map((l) => l.id)),
    Promise.all(cards.map((l) => getCardBySlug(db, l.slug).catch(() => null))),
  ])
  const cardName = new Map(cards.map((l, i) => [l.id, cardProfiles[i]?.profile?.fullName ?? null]))

  return links.map((l) => ({
    id: l.id,
    slug: l.slug,
    kind: l.kind,
    active: l.active,
    createdAt: l.createdAt,
    shortUrl: shortUrl(l.slug),
    destination: describeRule(l.rule, cardName.get(l.id)),
    design: designs[l.id] ? toDesign(designs[l.id]) : null,
    visits: scans[l.slug] ?? 0,
  }))
}

export default async function LiensPage() {
  const { ctx } = await getViewer()
  const links = ctx ? await loadLinks(ctx.workspaceId) : []

  return (
    <>
      <div className="flex items-center gap-2.5 px-4 py-3.5 lg:px-8 lg:py-[18px]">
        <Link href="/creer" className="btn btn-cta btn-sm ml-auto"><PlusIcon aria-hidden="true" />Créer</Link>
      </div>
      <div className="px-4 pb-14 pt-1 lg:px-8 lg:pt-2">
        <LinksBoard links={links} signedIn={!!ctx} />
      </div>
    </>
  )
}
