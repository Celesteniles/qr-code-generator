// Adresses e-mail jetables (Yopmail, Mailinator, 10minutemail…) : refusées à
// l'inscription pour limiter les faux comptes.
//
// Importé par un chemin à part (`@link/shared/disposable-email`), jamais par l'index :
// la liste pèse ~140 Ko et ne doit pas se retrouver dans toutes les pages.
//
// Mettre à jour la liste : `pnpm --filter @link/shared update:disposable`
// (cf. scripts/update-disposable-domains.mjs).
import { DISPOSABLE_DOMAINS_LIST } from './disposable-domains.generated'

export { DISPOSABLE_DOMAINS_SOURCE } from './disposable-domains.generated'

/** Message montré à l'utilisateur, côté serveur comme côté formulaire. */
export const DISPOSABLE_EMAIL_MESSAGE = 'Les adresses e-mail temporaires ne sont pas acceptées. Utilisez votre adresse habituelle.'
/** Code d'erreur renvoyé par l'API d'authentification. */
export const DISPOSABLE_EMAIL_CODE = 'DISPOSABLE_EMAIL'

/**
 * Jamais bloqués, même si la liste amont les contenait par erreur. Un domaine couvre
 * aussi ses sous-domaines ; `cg` couvre donc toutes les adresses congolaises.
 */
const ALLOWLIST = [
  'cg',
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.fr', 'ymail.com',
  'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com',
  'orange.fr', 'free.fr', 'laposte.net', 'gmx.com', 'gmx.fr',
]

/** Ajouts locaux : services jetables absents de la liste amont. */
const LOCAL_BLOCKLIST = [
  'temp-mail.io',
]

// Données constantes : Sets construits une fois par isolat, au premier appel.
let blocked: Set<string> | null = null
const allowed = new Set(ALLOWLIST)

function blockedSet(): Set<string> {
  if (!blocked) {
    blocked = new Set(DISPOSABLE_DOMAINS_LIST.split('\n'))
    for (const d of LOCAL_BLOCKLIST) blocked.add(d)
  }
  return blocked
}

/** Domaine d'une adresse, en minuscules ; null si l'adresse n'en a pas de plausible. */
export function emailDomain(email: string): string | null {
  const e = email.trim().toLowerCase()
  const at = e.lastIndexOf('@')
  if (at < 1) return null
  const domain = e.slice(at + 1).replace(/\.$/, '')
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return null
  return domain
}

/**
 * L'adresse utilise-t-elle un service jetable ? Un sous-domaine d'un domaine listé
 * (x.yopmail.com) l'est aussi. Une adresse invalide renvoie false : sa validation
 * est l'affaire du formulaire et de Better Auth, pas de ce filtre.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email)
  if (!domain) return false
  const labels = domain.split('.')
  // Suffixes, du plus long au TLD : a.b.yopmail.com, b.yopmail.com, yopmail.com, com.
  const suffixes = labels.map((_, i) => labels.slice(i).join('.'))
  if (suffixes.some((s) => allowed.has(s))) return false
  const set = blockedSet()
  return suffixes.some((s) => set.has(s))
}
