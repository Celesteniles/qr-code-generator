'use server'

import { revalidatePath } from 'next/cache'
import { createLink, setLinkActive, deleteLink, updateLinkRule, upsertCardProfile, upsertQrDesign, getLink, getWorkspace, listLinks, takenSlugs, type CardProfileInput, type SocialLink } from '@link/db'
import { canCreateLink, PLANS, type Rule, type Plan } from '@link/shared'
import { getDb, getKv } from './data'
import { getSessionContext } from './session'
import { SOCIAL_NETWORKS, socialHref } from '@/components/carte/card-model'
import { DEFAULT_DOMAIN, type CreateState, type UpdateDestinationState, type SlugCheck } from './config'

const HEX_COLOR = /^#[0-9a-f]{6}$/i

/**
 * Numéro WhatsApp → lien wa.me (le champ `url` des réseaux doit rester cliquable).
 * Un numéro congolais saisi en local (06 123 45 67) reçoit l'indicatif 242 ; le 0
 * est conservé, il fait partie du numéro international au Congo-Brazzaville.
 */
function whatsappUrl(raw: string): string | null {
  let digits = raw.replace(/[^\d]/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 9 && digits.startsWith('0')) digits = '242' + digits
  return digits.length >= 8 && digits.length <= 15 ? `https://wa.me/${digits}` : null
}

/** Champs de profil de carte lus depuis un formulaire. */
function cardProfileFromForm(formData: FormData): CardProfileInput | { error: string } {
  const website = String(formData.get('website') ?? '').trim()
  const whatsapp = String(formData.get('whatsapp') ?? '').trim()
  const theme = String(formData.get('theme') ?? '').trim()

  if (theme && !HEX_COLOR.test(theme)) return { error: 'Cette couleur n\'est pas reconnue. Choisissez-en une dans la palette.' }

  const socials: SocialLink[] = []
  if (website) {
    const url = toHttpUrl(website)
    if (!url) return { error: 'Cette adresse de site ne semble pas valide. Exemple : nscreative.cg' }
    socials.push({ label: 'Site web', url })
  }
  if (whatsapp) {
    const url = whatsappUrl(whatsapp)
    if (!url) return { error: 'Ce numéro WhatsApp ne semble pas valide. Exemple : 06 123 45 67.' }
    socials.push({ label: 'WhatsApp', url })
  }
  for (const net of SOCIAL_NETWORKS) {
    const raw = String(formData.get(`social_${net.key}`) ?? '').trim()
    if (!raw) continue
    const url = socialHref(net.key, raw)
    if (!url) return { error: `Ce profil ${net.label} n'est pas reconnu. Saisissez votre nom (@votrenom) ou collez le lien de votre profil.` }
    socials.push({ label: net.label, url })
  }

  return {
    fullName: String(formData.get('fullName') ?? '').trim(),
    title: String(formData.get('title') ?? '').trim() || undefined,
    org: String(formData.get('org') ?? '').trim() || undefined,
    phone: String(formData.get('cardPhone') ?? '').trim() || undefined,
    email: String(formData.get('cardEmail') ?? '').trim() || undefined,
    socials: socials.length ? socials : undefined,
    theme: theme ? theme.toLowerCase() : undefined,
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
  const fields = ['type', 'slug', 'url', 'ios', 'android', 'fallback', 'fullName', 'title', 'org', 'cardPhone', 'cardEmail', 'website', 'whatsapp', 'theme']
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
    // Lien carte : enregistrer le profil dans la foulée. Un champ de profil
    // invalide ne doit pas faire échouer la création déjà faite : on l'ignore.
    if (rule.type === 'card') {
      const profile = cardProfileFromForm(formData)
      if (!('error' in profile) && profile.fullName) await upsertCardProfile(db, res.id, profile)
    }
    revalidatePath('/')
    revalidatePath('/liens')
    return { ok: true, slug, id: res.id }
  }
  return fail(
    res.error === 'slug_taken' ? 'Ce raccourci est déjà utilisé sur link.cg. Essayez-en un autre.'
    : res.error === 'domain_not_found' ? 'Domaine introuvable.'
    : res.error === 'unsafe_url' ? 'Cette URL a été jugée dangereuse.'
    : res.error === 'invalid' ? res.issues[0] ?? 'Entrée invalide.'
    : 'Erreur inconnue.',
  )
}

/** Pages qui affichent un lien : accueil, liste, fiche. */
function revalidateLink(id: string) {
  revalidatePath('/')
  revalidatePath('/liens')
  revalidatePath(`/liens/${id}`)
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
  revalidateLink(id)
}

export async function deleteLinkAction(formData: FormData): Promise<void> {
  const ctx = await getSessionContext()
  if (!ctx) return
  const db = getDb()
  const id = String(formData.get('id') ?? '')
  if (!(await ownedLink(db, id, ctx.workspaceId))) return
  await deleteLink({ db, kv: getKv() }, id)
  revalidateLink(id)
}

/** Enregistre le style du QR d'un lien (fusion générateur ↔ liens). */
export async function saveQrDesignAction(linkId: string, design: unknown): Promise<{ ok: boolean }> {
  const ctx = await getSessionContext()
  if (!ctx) return { ok: false }
  const db = getDb()
  if (!(await ownedLink(db, linkId, ctx.workspaceId))) return { ok: false }
  await upsertQrDesign(db, linkId, design)
  revalidateLink(linkId)
  return { ok: true }
}

/** Met à jour le profil d'une carte — le cœur de la proposition « on ne réimprime pas ». */
export async function updateCardAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  const ctx = await getSessionContext()
  if (!ctx) return { ok: false, message: 'Votre session a expiré. Reconnectez-vous pour continuer.' }
  const db = getDb()
  const linkId = String(formData.get('linkId') ?? '')
  const link = await ownedLink(db, linkId, ctx.workspaceId)
  if (!link || link.kind !== 'card') return { ok: false, message: 'Cette carte est introuvable.' }

  const profile = cardProfileFromForm(formData)
  if ('error' in profile) return { ok: false, message: profile.error }
  if (!profile.fullName) return { ok: false, message: 'Indiquez au moins votre nom.' }

  await upsertCardProfile(db, linkId, profile)
  // Le slug vient de la base, pas du formulaire : on revalide la vraie page publique.
  revalidatePath('/carte')
  revalidatePath(`/carte/${link.slug}`)
  revalidatePath(`/c/${link.slug}`)
  return { ok: true }
}

// ── Contrats de la refonte D ────────────────────────────────────────────────
// Signatures figées : les écrans en dépendent.

/** Adresse web saisie → URL http(s) ; « nscreative.cg » devient « https://nscreative.cg ». */
function toHttpUrl(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withScheme)
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || !u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

/**
 * Change la destination d'un lien (règle static ou app), D1 puis KV.
 * Champs : id ; `url` (lien simple) ou `fallback` + `ios`/`android` optionnels
 * (lien selon le téléphone). Refuse si le lien n'appartient pas à l'espace.
 */
export async function updateLinkDestinationAction(
  _prev: UpdateDestinationState,
  formData: FormData,
): Promise<UpdateDestinationState> {
  const ctx = await getSessionContext()
  if (!ctx) return { ok: false, message: 'Votre session a expiré. Reconnectez-vous pour continuer.' }
  const db = getDb()
  const id = String(formData.get('id') ?? '')
  const link = await ownedLink(db, id, ctx.workspaceId)
  if (!link) return { ok: false, message: 'Ce lien est introuvable.' }
  if (link.kind === 'card') {
    return { ok: false, message: 'Ce lien mène à votre carte de visite : modifiez plutôt la carte.' }
  }

  const invalid = (what: string): UpdateDestinationState => ({
    ok: false,
    message: `${what} ne semble pas valide. Vérifiez qu'elle commence par https://`,
  })
  const field = (name: string) => String(formData.get(name) ?? '').trim()

  // Le type découle des champs remplis : iPhone/Android renseignés → selon le
  // téléphone ; sinon lien simple. `kind` suit (cf. updateLinkRule).
  const [rawUrl, rawFallback, rawIos, rawAndroid] = [field('url'), field('fallback'), field('ios'), field('android')]
  let rule: Rule
  if (rawIos || rawAndroid) {
    const fallback = toHttpUrl(rawFallback || rawUrl)
    if (!rawFallback && !rawUrl) return { ok: false, message: 'Indiquez l\'adresse pour les autres téléphones et les ordinateurs.' }
    if (!fallback) return invalid('L\'adresse pour les autres appareils')
    const ios = rawIos ? toHttpUrl(rawIos) : null
    if (rawIos && !ios) return invalid('L\'adresse pour iPhone')
    const android = rawAndroid ? toHttpUrl(rawAndroid) : null
    if (rawAndroid && !android) return invalid('L\'adresse pour Android')
    rule = { type: 'app', fallback, ...(ios ? { ios } : {}), ...(android ? { android } : {}) }
  } else {
    const raw = rawUrl || rawFallback
    if (!raw) return { ok: false, message: 'Indiquez l\'adresse vers laquelle ce lien doit mener.' }
    const url = toHttpUrl(raw)
    if (!url) return invalid('Cette adresse')
    rule = { type: 'static', url }
  }

  const res = await updateLinkRule({ db, kv: getKv() }, id, rule)
  if (!res.ok) {
    return {
      ok: false,
      message:
        res.error === 'unsafe_url' ? `Cette adresse a été signalée comme dangereuse : ${res.url}`
        : res.error === 'not_found' ? 'Ce lien est introuvable.'
        : res.error === 'not_editable' ? 'Ce lien mène à votre carte de visite : modifiez plutôt la carte.'
        : 'Cette adresse ne semble pas valide. Vérifiez qu\'elle commence par https://',
    }
  }
  revalidateLink(id)
  return { ok: true }
}

const SLUG_MIN = 2
const SLUG_MAX = 40

/** « Café Mami_2 » → « cafe-mami-2 ». */
function normalizeSlug(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Vérifie qu'une adresse courte est libre sur link.cg et propose des alternatives. */
export async function checkSlugAction(slug: string): Promise<SlugCheck> {
  // Pas de session : le visiteur prépare son lien avant de s'inscrire. Une seule
  // requête D1 par appel (adresse + candidats ensemble) borne le coût.
  const normalized = normalizeSlug(String(slug ?? '').slice(0, 200))
  if (normalized.length < SLUG_MIN) {
    return { normalized, available: false, message: `L'adresse doit contenir au moins ${SLUG_MIN} lettres ou chiffres.`, suggestions: [] }
  }
  if (normalized.length > SLUG_MAX) {
    return { normalized, available: false, message: `L'adresse ne doit pas dépasser ${SLUG_MAX} caractères.`, suggestions: [] }
  }

  const year = new Date().getUTCFullYear()
  const suffixes = ['-2', `-${year}`, '-cg', '-3', '-bzv', '-officiel']
  const candidates = [...new Set(suffixes.map((sfx) =>
    normalized.slice(0, SLUG_MAX - sfx.length).replace(/-+$/, '') + sfx,
  ))].filter((c) => c !== normalized)

  try {
    const taken = await takenSlugs(getDb(), DEFAULT_DOMAIN, [normalized, ...candidates])
    if (!taken.has(normalized)) return { normalized, available: true, suggestions: [] }
    return {
      normalized,
      available: false,
      message: `link.cg/${normalized} est déjà pris. Essayez une de ces adresses :`,
      suggestions: candidates.filter((c) => !taken.has(c)).slice(0, 3),
    }
  } catch (e) {
    console.error('[slug] vérification impossible', e)
    return { normalized, available: false, message: 'Vérification indisponible pour le moment. Réessayez dans un instant.', suggestions: [] }
  }
}
