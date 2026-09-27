/**
 * Chemin de l'écran « Vérifiez votre adresse e-mail », qui repart vers `next`
 * une fois l'adresse confirmée. Sert aussi de retour (callbackURL) au lien reçu
 * par e-mail. `next` = « / » → la visite guidée, qui suit l'inscription.
 * `next` doit déjà être un chemin interne sûr (cf. safeNext).
 */
export function verifyEmailPath(next: string): string {
  if (next.startsWith('/verifier-email')) return next
  return `/verifier-email?next=${encodeURIComponent(next === '/' ? '/bienvenue' : next)}`
}
