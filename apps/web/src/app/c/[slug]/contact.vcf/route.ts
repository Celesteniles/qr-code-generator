import { getCardBySlug } from '@link/db'
import { getDb } from '@/server/data'
import { fieldsFromProfile } from '@/components/carte/card-model'
import { cardVCard } from '@/components/carte/vcard'
import { shortLinkUrl } from '@/lib/short-link'

// « Enregistrer le contact » : la fiche est servie comme un vrai fichier contact
// (text/vcard, affiché plutôt que téléchargé). Sur iPhone, Safari ouvre alors
// directement la fiche « Créer un nouveau contact » ; sur Android, le fichier
// s'ouvre dans l'app Contacts. Un site web ne peut pas écrire lui-même dans le
// carnet d'adresses : c'est le mieux que permettent les navigateurs.

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const card = await getCardBySlug(getDb(), slug)
  if (!card || !card.link.active || !card.profile) return new Response('Carte introuvable', { status: 404 })

  const body = cardVCard(fieldsFromProfile(card.profile), shortLinkUrl(card.link.slug))
  const file = `${card.link.slug.replace(/[^a-zA-Z0-9_-]/g, '') || 'contact'}.vcf`
  return new Response(body, {
    headers: {
      'content-type': 'text/vcard; charset=utf-8',
      'content-disposition': `inline; filename="${file}"`,
      // Toujours la version à jour : la carte est modifiable à tout moment.
      'cache-control': 'no-store',
    },
  })
}
