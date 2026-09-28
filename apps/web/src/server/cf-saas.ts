import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Client Cloudflare for SaaS — API Custom Hostnames de la zone link.cg.
// https://developers.cloudflare.com/api/resources/custom_hostnames/
//
//   POST   /zones/{zone_id}/custom_hostnames        créer (certificat DV, validation HTTP)
//   GET    /zones/{zone_id}/custom_hostnames/{id}   statut du hostname et du certificat
//   PATCH  /zones/{zone_id}/custom_hostnames/{id}   relancer la validation (corps ssl identique)
//   DELETE /zones/{zone_id}/custom_hostnames/{id}   supprimer (hostname + certificat)
//
// Secrets : CF_ZONE_ID (zone link.cg), CF_SAAS_TOKEN (jeton « Zone · SSL and
// Certificates · Edit » limité à cette zone), CF_SAAS_CNAME_TARGET (cible du CNAME
// à donner aux clients). Sans l'un des trois, la fonctionnalité est DÉSACTIVÉE :
// rien n'est simulé, l'écran affiche « bientôt disponible ». Voir docs/DOMAINES.md.

const API = 'https://api.cloudflare.com/client/v4'

export interface SaasConfig {
  zoneId: string
  token: string
  /** Ex. « domaines.link.cg » : les clients y pointent leur CNAME. */
  cnameTarget: string
}

/** Configuration Cloudflare for SaaS, ou null si la fonctionnalité n'est pas branchée. */
export function getSaasConfig(): SaasConfig | null {
  const { env } = getCloudflareContext()
  const zoneId = env.CF_ZONE_ID?.trim()
  const token = env.CF_SAAS_TOKEN?.trim()
  const cnameTarget = env.CF_SAAS_CNAME_TARGET?.trim().toLowerCase().replace(/\.$/, '')
  return zoneId && token && cnameTarget ? { zoneId, token, cnameTarget } : null
}

/** Ce qu'on retient d'un custom hostname. */
export interface CustomHostname {
  id: string
  hostname: string
  /** « pending », « active », « moved », « blocked »… */
  status: string
  /** Statut du certificat : « initializing », « pending_validation », « active »… */
  sslStatus: string | null
  /** Messages de Cloudflare expliquant un blocage (anglais, pour le journal). */
  verificationErrors: string[]
  /**
   * Enregistrement TXT de propriété, si Cloudflare le demande (cas d'un domaine
   * client lui-même proxifié par Cloudflare, où le CNAME seul ne suffit pas).
   */
  ownership: { name: string; value: string } | null
}

/** Le domaine sert les liens : hostname ET certificat actifs. */
export function isLive(h: CustomHostname): boolean {
  return h.status === 'active' && h.sslStatus === 'active'
}

export type SaasError =
  /** Le hostname existe déjà chez Cloudflare (autre zone, ou reste d'un essai). */
  | 'duplicate'
  /** Refusé par Cloudflare (nom interdit, quota de la zone…). */
  | 'rejected'
  /** Introuvable chez Cloudflare. */
  | 'not_found'
  /** Réseau, jeton invalide, panne : réessayer plus tard. */
  | 'unavailable'

export type SaasResult<T> = { ok: true; value: T } | { ok: false; error: SaasError }

interface CfEnvelope {
  success?: boolean
  errors?: { code?: number; message?: string }[]
  result?: unknown
}

interface CfHostnameResult {
  id?: string
  hostname?: string
  status?: string
  ssl?: { status?: string } | null
  verification_errors?: string[]
  ownership_verification?: { type?: string; name?: string; value?: string } | null
}

function toHostname(r: unknown): CustomHostname | null {
  const x = r as CfHostnameResult | null
  if (!x || typeof x.id !== 'string' || typeof x.hostname !== 'string') return null
  const own = x.ownership_verification
  return {
    id: x.id,
    hostname: x.hostname,
    status: String(x.status ?? 'pending'),
    sslStatus: x.ssl?.status ? String(x.ssl.status) : null,
    verificationErrors: Array.isArray(x.verification_errors) ? x.verification_errors.map(String) : [],
    ownership: own?.name && own?.value ? { name: String(own.name), value: String(own.value) } : null,
  }
}

async function call(cfg: SaasConfig, method: string, path: string, body?: unknown): Promise<{ status: number; json: CfEnvelope } | null> {
  try {
    const res = await fetch(`${API}/zones/${encodeURIComponent(cfg.zoneId)}/custom_hostnames${path}`, {
      method,
      headers: { authorization: `Bearer ${cfg.token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const json = (await res.json().catch(() => ({}))) as CfEnvelope
    if (!res.ok || json.success === false) {
      // Codes et messages seulement : jamais le jeton ni le corps complet.
      console.error('[cf-saas]', method, path || '/', res.status, (json.errors ?? []).map((e) => `${e.code}: ${e.message}`).join(' | '))
    }
    return { status: res.status, json }
  } catch (e) {
    console.error('[cf-saas] réseau', method, e)
    return null
  }
}

function failure(r: { status: number; json: CfEnvelope } | null): SaasError {
  if (!r) return 'unavailable'
  if (r.status === 404) return 'not_found'
  const text = (r.json.errors ?? []).map((e) => e.message ?? '').join(' ')
  if (r.status === 409 || /duplicate|already exists/i.test(text)) return 'duplicate'
  // 401/403 (jeton), 429 (quota d'appels), 5xx : côté plateforme, réessayable.
  if (r.status === 400 || r.status === 422) return 'rejected'
  return 'unavailable'
}

// Certificat DV, validation HTTP : dès que le CNAME du client pointe vers la cible,
// Cloudflare valide le hostname et émet le certificat sans autre action du client.
const SSL = { method: 'http', type: 'dv' } as const

/** Déclare le hostname du client dans la zone. */
export async function createCustomHostname(cfg: SaasConfig, hostname: string): Promise<SaasResult<CustomHostname>> {
  const r = await call(cfg, 'POST', '', { hostname, ssl: SSL })
  const h = r && r.status < 300 && r.json.success !== false ? toHostname(r.json.result) : null
  return h ? { ok: true, value: h } : { ok: false, error: failure(r) }
}

/** Statut actuel du hostname. */
export async function getCustomHostname(cfg: SaasConfig, id: string): Promise<SaasResult<CustomHostname>> {
  const r = await call(cfg, 'GET', `/${encodeURIComponent(id)}`)
  const h = r && r.status < 300 && r.json.success !== false ? toHostname(r.json.result) : null
  return h ? { ok: true, value: h } : { ok: false, error: failure(r) }
}

/**
 * Relance la validation (PATCH « sans changement », recommandé par Cloudflare pour
 * réinitialiser l'attente entre deux tentatives). Sans effet sur un hostname actif.
 */
export async function refreshCustomHostname(cfg: SaasConfig, id: string): Promise<SaasResult<CustomHostname>> {
  const r = await call(cfg, 'PATCH', `/${encodeURIComponent(id)}`, { ssl: SSL })
  const h = r && r.status < 300 && r.json.success !== false ? toHostname(r.json.result) : null
  return h ? { ok: true, value: h } : { ok: false, error: failure(r) }
}

/** Supprime le hostname. Déjà absent chez Cloudflare : considéré comme fait. */
export async function deleteCustomHostname(cfg: SaasConfig, id: string): Promise<SaasResult<null>> {
  const r = await call(cfg, 'DELETE', `/${encodeURIComponent(id)}`)
  if (r && ((r.status < 300 && r.json.success !== false) || r.status === 404)) return { ok: true, value: null }
  return { ok: false, error: failure(r) }
}
