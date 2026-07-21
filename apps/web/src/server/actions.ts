'use server'

import { revalidatePath } from 'next/cache'
import { createLink, setLinkActive, deleteLink, upsertCardProfile, upsertQrDesign, getLink, getWorkspace, listLinks, type CardProfileInput } from '@link/db'
import { canCreateLink, PLANS, type Rule, type Plan } from '@link/shared'
import { getDb, getKv } from './data'
import { getSessionContext } from './session'
import { DEFAULT_DOMAIN, type CreateState } from './config'

/** Champs de profil de carte lus depuis un formulaire. */
function cardProfileFromForm(formData: FormData): CardProfileInput {
  const website = String(formData.get('website') ?? '').trim()
  return {
    fullName: String(formData.get('fullName') ?? '').trim(),
    title: String(formData.get('title') ?? '').trim() || undefined,
    org: String(formData.get('org') ?? '').trim() || undefined,
    phone: String(formData.get('cardPhone') ?? '').trim() || undefined,
    email: String(formData.get('cardEmail') ?? '').trim() || undefined,
    socials: website ? [{ label: 'Site web', url: website }] : undefined,
  }
}

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
  // Répercuté sur erreur pour repeupler le formulaire (React 19 le réinitialise).
  const fields = ['type', 'slug', 'url', 'ios', 'android', 'fallback', 'fullName', 'title', 'org', 'cardPhone', 'cardEmail', 'website']
  const values: Record<string, string> = {}
  for (const f of fields) values[f] = String(formData.get(f) ?? '')
  const fail = (message: string): CreateState => ({ ok: false, message, values })

  const ctx = await getSessionContext()
  if (!ctx) return fail('Session expirée.')

  const slug = String(formData.get('slug') ?? '').trim()
  const rule = ruleFromForm(formData)
  if ('error' in rule) return fail(rule.error)

  const db = getDb()

  // Limite de palier.
  const [ws, existing] = await Promise.all([
    getWorkspace(db, ctx.workspaceId),
    listLinks(db, ctx.workspaceId),
  ])
  const plan = (ws?.plan ?? 'free') as Plan
  if (!canCreateLink(plan, existing.length)) {
    return fail(`Limite du palier ${PLANS[plan].label} atteinte (${PLANS[plan].maxLinks} liens).`)
  }

  const res = await createLink(
    { db, kv: getKv() },
    { workspaceId: ctx.workspaceId, domainId: DEFAULT_DOMAIN, slug, rule },
  )

  if (res.ok) {
    // Lien carte : enregistrer le profil dans la foulée.
    if (rule.type === 'card') {
      const profile = cardProfileFromForm(formData)
      if (profile.fullName) await upsertCardProfile(db, res.id, profile)
    }
    revalidatePath('/dashboard')
    return { ok: true, slug }
  }
  return fail(
    res.error === 'slug_taken' ? 'Ce raccourci est déjà utilisé sur link.cg. Essayez-en un autre.'
    : res.error === 'domain_not_found' ? 'Domaine introuvable.'
    : res.error === 'unsafe_url' ? 'Cette URL a été jugée dangereuse.'
    : res.error === 'invalid' ? res.issues[0] ?? 'Entrée invalide.'
    : 'Erreur inconnue.',
  )
}

/** Vérifie que le lien appartient à l'espace de l'utilisateur connecté. */
async function ownedLink(db: ReturnType<typeof getDb>, id: string, workspaceId: string) {
  const link = await getLink(db, id)
  return link && link.workspaceId === workspaceId ? link : null
}

export async function toggleLinkAction(formData: FormData): Promise<void> {
  const ctx = await getSessionContext()
  if (!ctx) return
  const db = getDb()
  const id = String(formData.get('id') ?? '')
  if (!(await ownedLink(db, id, ctx.workspaceId))) return
  const active = String(formData.get('active') ?? '') === 'true'
  await setLinkActive({ db, kv: getKv() }, id, active)
  revalidatePath('/dashboard')
}

export async function deleteLinkAction(formData: FormData): Promise<void> {
  const ctx = await getSessionContext()
  if (!ctx) return
  const db = getDb()
  const id = String(formData.get('id') ?? '')
  if (!(await ownedLink(db, id, ctx.workspaceId))) return
  await deleteLink({ db, kv: getKv() }, id)
  revalidatePath('/dashboard')
}

/** Enregistre le style du QR d'un lien (fusion générateur ↔ liens). */
export async function saveQrDesignAction(linkId: string, design: unknown): Promise<{ ok: boolean }> {
  const ctx = await getSessionContext()
  if (!ctx) return { ok: false }
  const db = getDb()
  if (!(await ownedLink(db, linkId, ctx.workspaceId))) return { ok: false }
  await upsertQrDesign(db, linkId, design)
  revalidatePath('/dashboard')
  return { ok: true }
}

/** Met à jour le profil d'une carte — le cœur de la proposition « on ne réimprime pas ». */
export async function updateCardAction(formData: FormData): Promise<void> {
  const ctx = await getSessionContext()
  if (!ctx) return
  const db = getDb()
  const linkId = String(formData.get('linkId') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const profile = cardProfileFromForm(formData)
  if (!(await ownedLink(db, linkId, ctx.workspaceId))) return
  if (profile.fullName) await upsertCardProfile(db, linkId, profile)
  revalidatePath('/dashboard')
  revalidatePath(`/c/${slug}`)
}
