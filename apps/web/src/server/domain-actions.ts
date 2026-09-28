'use server'

import { revalidatePath } from 'next/cache'
import {
  addCustomDomain, canManageDomains, checkDomainRemoval, getWorkspace, getWorkspaceDomain,
  removeCustomDomain, updateDomainStatus, type DomainRow, type HostnameError,
} from '@link/db'
import { PLANS, type Plan } from '@link/shared'
import { getDb } from './data'
import { getSessionContext } from './session'
import {
  createCustomHostname, deleteCustomHostname, getCustomHostname, getSaasConfig, isLive,
  refreshCustomHostname, type CustomHostname, type SaasConfig, type SaasError,
} from './cf-saas'
import { maxCustomDomains, type DomainActionState } from './domains'

// Actions de l'onglet « Domaines » de Mon compte. Chaque action revérifie : session,
// rôle (propriétaire ou administrateur), appartenance du domaine à l'espace (anti-IDOR).
// Ordre des écritures : D1 réserve le nom, PUIS Cloudflare ; en retrait, Cloudflare
// d'abord, PUIS D1 (un hostname orphelin chez Cloudflare occuperait le nom).

const CONTACT = 'contact@nscreative.cg'
const PAGE = '/compte/domaines'

type Msg = NonNullable<DomainActionState>

const SESSION_EXPIRED: Msg = { ok: false, message: 'Votre session a expiré. Reconnectez-vous pour continuer.' }
const NOT_ALLOWED: Msg = { ok: false, message: 'Seuls le propriétaire et les administrateurs de l’espace peuvent gérer ses domaines.' }
const DISABLED: Msg = {
  ok: false,
  message: `Les domaines personnalisés arrivent bientôt. Pour en profiter dès maintenant, écrivez-nous à ${CONTACT}.`,
}

const HOSTNAME_ERRORS: Record<HostnameError, string> = {
  invalid: 'Ce nom de domaine ne semble pas valide. Exemple : go.monresto.cg (sans https:// ni chemin).',
  ip: 'Indiquez un nom de domaine, pas une adresse IP. Exemple : go.monresto.cg',
  apex: 'Utilisez un sous-domaine, par exemple go.monresto.cg plutôt que monresto.cg : c’est lui que vous ferez pointer vers nous.',
  reserved: 'Ce domaine appartient à link.cg. Indiquez un sous-domaine de votre propre domaine, par exemple go.monresto.cg.',
}

const SAAS_ERRORS: Record<SaasError, string> = {
  duplicate: `Ce domaine est déjà déclaré chez notre prestataire. S’il vous appartient, écrivez-nous à ${CONTACT}.`,
  rejected: `Ce domaine a été refusé par notre prestataire. Vérifiez son orthographe, ou écrivez-nous à ${CONTACT}.`,
  not_found: 'Ce domaine n’est plus déclaré chez notre prestataire. Cliquez sur « Vérifier » pour le déclarer de nouveau.',
  unavailable: 'Le service de domaines ne répond pas pour le moment. Réessayez dans quelques minutes.',
}

/** Contexte commun : session, droit de gérer, configuration Cloudflare. */
async function guard(): Promise<
  | { error: Msg }
  | { ctx: NonNullable<Awaited<ReturnType<typeof getSessionContext>>>; db: ReturnType<typeof getDb>; cfg: SaasConfig | null }
> {
  const ctx = await getSessionContext()
  if (!ctx) return { error: SESSION_EXPIRED }
  const db = getDb()
  if (!(await canManageDomains(db, ctx.userId, ctx.workspaceId))) return { error: NOT_ALLOWED }
  return { ctx, db, cfg: getSaasConfig() }
}

/** Enregistre en D1 ce que Cloudflare dit du hostname. */
async function saveStatus(db: ReturnType<typeof getDb>, workspaceId: string, domainId: string, h: CustomHostname) {
  await updateDomainStatus(db, workspaceId, domainId, { cfHostnameId: h.id, verified: isLive(h), sslStatus: h.sslStatus })
}

/** Ajoute un domaine : réservé en D1, déclaré chez Cloudflare, retiré si Cloudflare refuse. */
export async function addDomainAction(_prev: DomainActionState, formData: FormData): Promise<DomainActionState> {
  const g = await guard()
  if ('error' in g) return g.error
  const { ctx, db, cfg } = g
  if (!cfg) return DISABLED

  const ws = await getWorkspace(db, ctx.workspaceId)
  const plan = (ws?.plan ?? 'free') as Plan
  const max = maxCustomDomains(plan)
  if (max === 0) {
    return { ok: false, message: `L’offre ${PLANS[plan].label} n’inclut pas de domaine personnalisé. Il est disponible à partir de l’offre Business.` }
  }

  const res = await addCustomDomain({ db }, { workspaceId: ctx.workspaceId, hostname: String(formData.get('hostname') ?? '').slice(0, 300), maxDomains: max })
  if (!res.ok) {
    return {
      ok: false,
      message:
        res.error === 'taken' ? `Ce domaine est déjà utilisé sur link.cg. S’il vous appartient, écrivez-nous à ${CONTACT}.`
        : res.error === 'limit_reached'
          ? max === 1
            ? `L’offre ${PLANS[plan].label} inclut un domaine personnalisé. Retirez l’actuel pour en ajouter un autre, ou passez à l’offre Entreprise.`
            : `Vous avez atteint le nombre de domaines de votre offre (${max}). Écrivez-nous à ${CONTACT} pour en ajouter.`
        : HOSTNAME_ERRORS[res.error],
    }
  }

  const created = await createCustomHostname(cfg, res.domain.hostname)
  if (!created.ok) {
    // Rien ne pointe encore vers ce domaine : on libère le nom.
    await removeCustomDomain(db, ctx.workspaceId, res.domain.id)
    revalidatePath(PAGE)
    return { ok: false, message: SAAS_ERRORS[created.error] }
  }
  await saveStatus(db, ctx.workspaceId, res.domain.id, created.value)
  revalidatePath(PAGE)
  return {
    ok: true,
    domainId: res.domain.id,
    message: `${res.domain.hostname} est ajouté. Créez maintenant l’enregistrement DNS ci-dessous chez votre hébergeur de domaine, puis cliquez sur « Vérifier ».`,
  }
}

/** Interroge Cloudflare (déclare le hostname s'il ne l'est pas encore) et met à jour le statut. */
export async function verifyDomainAction(_prev: DomainActionState, formData: FormData): Promise<DomainActionState> {
  const g = await guard()
  if ('error' in g) return g.error
  const { ctx, db, cfg } = g
  if (!cfg) return DISABLED

  const domain = await getWorkspaceDomain(db, ctx.workspaceId, String(formData.get('id') ?? ''))
  if (!domain) return { ok: false, message: 'Ce domaine est introuvable.' }
  const at = (s: Omit<Msg, 'domainId'>): Msg => ({ ...s, domainId: domain.id })

  const current = await fetchOrDeclare(cfg, domain)
  if (!current.ok) {
    if (current.error === 'not_found') {
      // Supprimé chez Cloudflare (à la main ?) : on oublie l'identifiant, le prochain « Vérifier » le redéclare.
      await updateDomainStatus(db, ctx.workspaceId, domain.id, { cfHostnameId: null, verified: false, sslStatus: null })
      revalidatePath(PAGE)
    }
    return at({ ok: false, message: SAAS_ERRORS[current.error] })
  }

  let h = current.value
  // Pas encore actif : relancer la validation tout de suite plutôt qu'attendre le prochain passage de Cloudflare.
  if (!isLive(h)) {
    const refreshed = await refreshCustomHostname(cfg, h.id)
    if (refreshed.ok) h = refreshed.value
  }
  await saveStatus(db, ctx.workspaceId, domain.id, h)
  revalidatePath(PAGE)
  revalidatePath('/creer')

  if (isLive(h)) return at({ ok: true, message: `${domain.hostname} est actif. Vous pouvez le choisir en créant un lien.` })
  if (h.status === 'blocked' || h.status === 'pending_blocked') {
    return at({ ok: false, message: `Ce domaine a été bloqué par notre prestataire. Écrivez-nous à ${CONTACT}.` })
  }
  if (h.status === 'moved') {
    return at({ ok: false, message: 'Ce domaine ne pointe plus vers nous. Vérifiez l’enregistrement CNAME chez votre hébergeur de domaine.' })
  }
  if (h.verificationErrors.length) console.warn('[domaines] validation en attente', domain.hostname, h.verificationErrors.join(' | '))
  return at({
    ok: false,
    message: h.status === 'active'
      ? 'Votre domaine pointe bien vers nous. Le certificat de sécurité (https) est en cours de création : réessayez dans quelques minutes.'
      : 'Pas encore actif. Vérifiez l’enregistrement CNAME chez votre hébergeur de domaine. Après une modification, comptez de quelques minutes à quelques heures.',
    ...(h.ownership ? { ownership: h.ownership } : {}),
  })
}

async function fetchOrDeclare(cfg: SaasConfig, domain: DomainRow) {
  return domain.cfHostnameId ? getCustomHostname(cfg, domain.cfHostnameId) : createCustomHostname(cfg, domain.hostname)
}

/** Retire un domaine : refusé s'il porte des liens ; Cloudflare d'abord, puis D1. */
export async function deleteDomainAction(_prev: DomainActionState, formData: FormData): Promise<DomainActionState> {
  const g = await guard()
  if ('error' in g) return g.error
  const { ctx, db, cfg } = g

  const id = String(formData.get('id') ?? '')
  const check = await checkDomainRemoval(db, ctx.workspaceId, id)
  if (!check.ok) {
    return check.error === 'not_found'
      ? { ok: false, message: 'Ce domaine est introuvable.' }
      : {
          ok: false,
          domainId: id,
          message: check.links > 1
            ? `${check.links} liens utilisent encore ce domaine. Supprimez-les d’abord : s’ils sont imprimés, ils cesseront de fonctionner.`
            : 'Un lien utilise encore ce domaine. Supprimez-le d’abord : s’il est imprimé, il cessera de fonctionner.',
        }
  }

  if (check.domain.cfHostnameId) {
    // Sans configuration, impossible de le retirer chez Cloudflare : on ne laisse pas d'orphelin.
    if (!cfg) return { ...DISABLED, domainId: id }
    const del = await deleteCustomHostname(cfg, check.domain.cfHostnameId)
    if (!del.ok) return { ok: false, domainId: id, message: SAAS_ERRORS[del.error] }
  }

  const removed = await removeCustomDomain(db, ctx.workspaceId, id)
  if (!removed.ok) {
    return { ok: false, domainId: id, message: 'Un lien vient d’être créé sur ce domaine. Supprimez-le d’abord.' }
  }
  revalidatePath(PAGE)
  revalidatePath('/creer')
  return { ok: true, message: `${check.domain.hostname} est retiré.` }
}
