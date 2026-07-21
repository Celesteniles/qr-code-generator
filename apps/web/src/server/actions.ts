'use server'

import { revalidatePath } from 'next/cache'
import { createLink, setLinkActive, deleteLink } from '@link/db'
import type { Rule } from '@link/shared'
import { getDb, getKv } from './data'
import { DEFAULT_WORKSPACE, DEFAULT_DOMAIN, type CreateState } from './config'

function ruleFromForm(formData: FormData): Rule | { error: string } {
  const type = String(formData.get('type') ?? 'static')
  if (type === 'static') {
    return { type: 'static', url: String(formData.get('url') ?? '').trim() }
  }
  if (type === 'app') {
    const fallback = String(formData.get('fallback') ?? '').trim()
    const ios = String(formData.get('ios') ?? '').trim()
    const android = String(formData.get('android') ?? '').trim()
    if (!fallback) return { error: 'Une URL de repli est requise.' }
    return { type: 'app', fallback, ...(ios ? { ios } : {}), ...(android ? { android } : {}) }
  }
  if (type === 'card') return { type: 'card' }
  return { error: 'Type de lien inconnu.' }
}

export async function createLinkAction(_prev: CreateState, formData: FormData): Promise<CreateState> {
  const slug = String(formData.get('slug') ?? '').trim()
  const rule = ruleFromForm(formData)
  if ('error' in rule) return { ok: false, message: rule.error }

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

export async function toggleLinkAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const active = String(formData.get('active') ?? '') === 'true'
  await setLinkActive({ db: getDb(), kv: getKv() }, id, active)
  revalidatePath('/dashboard')
}

export async function deleteLinkAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  await deleteLink({ db: getDb(), kv: getKv() }, id)
  revalidatePath('/dashboard')
}
