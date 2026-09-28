import type { Metadata } from 'next'
import { Creer, type Mode } from '@/components/creer/Creer'
import { CONTENT_TYPES, type ContentType } from '@/components/creer/helpers'
import { getViewer } from '@/server/viewer'
import { getLinkHosts } from '@/server/domains'

export const metadata: Metadata = {
  title: 'Créer un lien court ou un QR code · link.cg',
  description: 'Raccourcissez un lien, créez un QR code à imprimer, fixe ou modifiable.',
}

type Search = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

// Contrat d'URL (Accueil, Visite guidée) :
//   ?mode=lien|qr   ?url=<lien à raccourcir>   ?type=site|menu|whatsapp|wifi|app|vcard|texte|email|sms|appel|lieu|reseaux
export default async function CreerPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [params, { viewer, ctx }] = await Promise.all([searchParams, getViewer()])
  // Domaines proposés : link.cg, plus les domaines personnalisés actifs de l'espace.
  const hosts = ctx ? await getLinkHosts(ctx.workspaceId) : ['link.cg']
  const rawMode = one(params.mode)
  const rawType = one(params.type)
  const type = (CONTENT_TYPES as string[]).includes(rawType) ? (rawType as ContentType) : null
  // Sans mode explicite, un type de contenu (autre que « app ») mène à l'onglet QR.
  const mode: Mode = rawMode === 'qr' || rawMode === 'lien' ? rawMode : type && type !== 'app' ? 'qr' : 'lien'
  const url = one(params.url).slice(0, 2048)

  return (
    <Creer
      initialMode={mode}
      initialUrl={url}
      initialType={type}
      deviceRoute={mode === 'lien' && type === 'app'}
      viewer={viewer}
      hosts={hosts}
    />
  )
}
