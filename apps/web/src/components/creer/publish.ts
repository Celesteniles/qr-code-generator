// Création d'un lien court (et du style de son QR) depuis l'écran Créer.
// Appelle les actions serveur existantes : createLinkAction puis saveQrDesignAction.

import { createLinkAction, saveQrDesignAction } from '@/server/actions'
import type { QrDesign } from '@/lib/qr-design'

export type LinkRule =
  | { type: 'static'; url: string }
  | { type: 'app'; fallback: string; ios?: string; android?: string }

export interface LinkPayload {
  /** Ce qu'on crée : un lien court (onglet Lien) ou un QR modifiable (onglet QR). */
  kind: 'link' | 'qr'
  slug: string
  rule: LinkRule
  /** Style du QR à enregistrer avec le lien (QR modifiable). */
  design?: QrDesign
}

export type PublishResult =
  | { ok: true; id: string; slug: string; designSaved: boolean }
  | { ok: false; message: string }

export async function publishLink(p: LinkPayload): Promise<PublishResult> {
  const fd = new FormData()
  fd.set('type', p.rule.type)
  fd.set('slug', p.slug)
  if (p.rule.type === 'static') {
    fd.set('url', p.rule.url)
  } else {
    fd.set('fallback', p.rule.fallback)
    if (p.rule.ios) fd.set('ios', p.rule.ios)
    if (p.rule.android) fd.set('android', p.rule.android)
  }

  let res
  try {
    res = await createLinkAction(null, fd)
  } catch {
    return { ok: false, message: 'Connexion interrompue. Vérifiez votre réseau et réessayez.' }
  }
  if (!res) return { ok: false, message: 'Réponse inattendue du serveur. Réessayez.' }
  if (!res.ok) return { ok: false, message: res.message }

  let designSaved = true
  if (p.design) {
    try {
      designSaved = (await saveQrDesignAction(res.id, p.design)).ok
    } catch {
      designSaved = false
    }
  }
  return { ok: true, id: res.id, slug: res.slug || p.slug, designSaved }
}

/** Création demandée par un onglet : null = succès (ou tiroir d'inscription ouvert), sinon message à afficher. */
export type CreateFn = (payload: LinkPayload, fileName: string) => Promise<string | null>
