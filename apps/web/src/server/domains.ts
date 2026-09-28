import 'server-only'
import { DEFAULT_LINK_HOST, getWorkspace, listWorkspaceDomains, type DomainRow } from '@link/db'
import { PLANS, type Plan } from '@link/shared'
import { getDb } from './data'
import { getSaasConfig } from './cf-saas'

// Domaines personnalisés côté dashboard : règles d'offre, modèle d'affichage.
// Les écritures sont dans domain-actions.ts ; l'API Cloudflare dans cf-saas.ts.

/**
 * Nombre de domaines personnalisés par offre (règle locale, PlanSpec ne porte que
 * le booléen `customDomains`). Business : un domaine (« Votre propre domaine »).
 * Entreprise : plusieurs ; 20 par espace pour borner le quota Cloudflare for SaaS
 * de la zone (100 hostnames inclus, facturés au-delà), relevable sur demande.
 */
const CUSTOM_DOMAINS_BY_PLAN: Record<Plan, number> = { free: 0, pro: 0, business: 1, enterprise: 20 }

export function maxCustomDomains(plan: Plan): number {
  return PLANS[plan].customDomains ? CUSTOM_DOMAINS_BY_PLAN[plan] : 0
}

/** Où en est un domaine, pour l'affichage. */
export type DomainState =
  /** Hostname et certificat actifs : les liens peuvent l'utiliser. */
  | 'active'
  /** Déclaré chez Cloudflare, en attente du CNAME ou du certificat. */
  | 'pending'
  /** Réservé chez nous, pas encore déclaré chez Cloudflare (échec au moment de l'ajout). */
  | 'unconfigured'

/** Domaine prêt à afficher (sérialisable, passé au composant client). */
export interface DomainItem {
  id: string
  hostname: string
  state: DomainState
  /** Statut du certificat chez Cloudflare (« pending_validation », « active »…). */
  sslStatus: string | null
}

export function toDomainItem(d: DomainRow): DomainItem {
  return {
    id: d.id,
    hostname: d.hostname,
    state: d.verified ? 'active' : d.cfHostnameId ? 'pending' : 'unconfigured',
    sslStatus: d.sslStatus,
  }
}

/** Résultat d'une action sur les domaines (ajout, vérification, retrait). */
export type DomainActionState =
  | {
      ok: boolean
      message: string
      /** Domaine concerné (pour afficher le message au bon endroit). */
      domainId?: string
      /** TXT de propriété demandé par Cloudflare, s'il y en a un. */
      ownership?: { name: string; value: string }
    }
  | null

export interface DomainsOverview {
  plan: Plan
  planLabel: string
  /** Plafond de l'offre (0 : l'offre n'inclut pas de domaine personnalisé). */
  max: number
  /** Cloudflare for SaaS branché (secrets posés). */
  enabled: boolean
  /** Cible du CNAME à donner au client, si branché. */
  cnameTarget: string | null
  domains: DomainItem[]
}

export async function getDomainsOverview(workspaceId: string): Promise<DomainsOverview> {
  const db = getDb()
  const [ws, rows] = await Promise.all([getWorkspace(db, workspaceId), listWorkspaceDomains(db, workspaceId)])
  const plan = (ws?.plan ?? 'free') as Plan
  const cfg = getSaasConfig()
  return {
    plan,
    planLabel: PLANS[plan].label,
    max: maxCustomDomains(plan),
    enabled: cfg !== null,
    cnameTarget: cfg?.cnameTarget ?? null,
    domains: rows.map(toDomainItem),
  }
}

/**
 * Domaines proposés à la création d'un lien : link.cg d'abord, puis les domaines
 * vérifiés de l'espace — seulement si l'offre inclut les domaines personnalisés
 * (après un passage à une offre inférieure, les liens existants continuent de
 * marcher, mais on n'en crée plus de nouveaux sur le domaine).
 */
export async function getLinkHosts(workspaceId: string): Promise<string[]> {
  const db = getDb()
  const [ws, rows] = await Promise.all([getWorkspace(db, workspaceId), listWorkspaceDomains(db, workspaceId)])
  const plan = (ws?.plan ?? 'free') as Plan
  if (!PLANS[plan].customDomains) return [DEFAULT_LINK_HOST]
  return [DEFAULT_LINK_HOST, ...rows.filter((d) => d.verified).map((d) => d.hostname)]
}
