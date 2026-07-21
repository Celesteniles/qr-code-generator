'use server'

import { revalidatePath } from 'next/cache'
import { createLink } from '@link/db'
import type { Rule } from '@link/shared'
import { getDb, getKv } from './data'
import { DEFAULT_WORKSPACE, DEFAULT_DOMAIN, type CreateState } from './config'

export async function createLinkAction(_prev: CreateState, formData: FormData): Promise<CreateState> {
  const slug = String(formData.get('slug') ?? '').trim()
  const url = String(formData.get('url') ?? '').trim()

  const rule: Rule = { type: 'static', url }
  const res = await createLink(
    { db: getDb(), kv: getKv() },
    { workspaceId: DEFAULT_WORKSPACE, domainId: DEFAULT_DOMAIN, slug, rule },
  )

  if (res.ok) {
    revalidatePath('/dashboard')
    return { ok: true, slug }
  }

  const message =
    res.error === 'slug_taken' ? 'Ce raccourci est déjà pris.'
    : res.error === 'domain_not_found' ? 'Domaine introuvable.'
    : res.error === 'unsafe_url' ? 'Cette URL a été jugée dangereuse.'
    : res.error === 'invalid' ? res.issues[0] ?? 'Entrée invalide.'
    : 'Erreur inconnue.'
  return { ok: false, message }
}
