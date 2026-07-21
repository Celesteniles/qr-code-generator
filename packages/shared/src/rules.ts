// Règles de routage et résolution — cœur pur de la plateforme, partagé entre le
// Worker de redirection (apps/router) et le tableau de bord (apps/web).
//
// Aucune dépendance au runtime : `resolveLink` est une fonction pure, ce qui la
// rend testable sans workerd et réutilisable partout.

/** Redirection statique : le lien pointe vers une URL fixe, modifiable à tout moment. */
export interface StaticRule {
  type: 'static'
  url: string
}

/** Routage applicatif : destination choisie selon la plateforme du visiteur. */
export interface AppRule {
  type: 'app'
  ios?: string
  android?: string
  /** Utilisé pour desktop, plateformes inconnues, ou champs iOS/Android absents. */
  fallback: string
}

/** Carte de visite : redirige vers la page de profil hébergée sur qrcode.cg. */
export interface CardRule {
  type: 'card'
}

export type Rule = StaticRule | AppRule | CardRule
export type RuleType = Rule['type']

/**
 * Valeur stockée dans KV pour chaque lien, sous la clé `${hostname}:${slug}`.
 * C'est une vue de lecture compilée depuis D1 — jamais lue depuis D1 directement.
 */
export interface CompiledLink {
  slug: string
  rule: Rule
  active: boolean
  /** Epoch ms. Absent = pas d'expiration. */
  expiresAt?: number
}

export interface ResolveContext {
  userAgent: string
  /** Base des pages de carte de visite, ex. `https://qrcode.cg`. Sans slash final. */
  cardBaseUrl: string
}

export type Resolution =
  | { kind: 'redirect'; url: string }
  | { kind: 'inactive' }
  | { kind: 'expired' }

const IOS = /iPhone|iPad|iPod/i
const ANDROID = /Android/i

/** Destination d'une règle applicative selon le User-Agent. */
export function resolveApp(userAgent: string, rule: AppRule): string {
  if (IOS.test(userAgent)) return rule.ios ?? rule.fallback
  if (ANDROID.test(userAgent)) return rule.android ?? rule.fallback
  return rule.fallback
}

/**
 * Résout un lien compilé en une décision de redirection. Pure : `now` est injecté
 * pour que les tests soient déterministes.
 */
export function resolveLink(link: CompiledLink, ctx: ResolveContext, now: number): Resolution {
  if (!link.active) return { kind: 'inactive' }
  if (link.expiresAt !== undefined && now >= link.expiresAt) return { kind: 'expired' }

  switch (link.rule.type) {
    case 'static':
      return { kind: 'redirect', url: link.rule.url }
    case 'app':
      return { kind: 'redirect', url: resolveApp(ctx.userAgent, link.rule) }
    case 'card':
      return { kind: 'redirect', url: `${ctx.cardBaseUrl}/c/${link.slug}` }
  }
}

/** Clé KV d'un lien. Le hostname est inclus pour supporter les domaines personnalisés. */
export function linkKey(hostname: string, slug: string): string {
  return `${hostname}:${slug}`
}
