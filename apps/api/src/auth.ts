// Contrôle d'accès de l'API d'écriture. Jeton d'administration porté en en-tête
// `Authorization: Bearer <token>`, comparé au secret ADMIN_TOKEN.
//
// C'est une protection machine-à-machine, pas de l'authentification utilisateur :
// les comptes, sessions et appartenance aux espaces viendront avec le dashboard
// (Better Auth). Ce garde ferme simplement l'écriture ouverte en attendant.
//
// Fail-closed : si ADMIN_TOKEN n'est pas configuré, TOUT est refusé — l'API ne peut
// jamais se retrouver ouverte par oubli de secret.

/** Comparaison à temps constant : ne révèle pas la position du premier écart. */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ba = enc.encode(a)
  const bb = enc.encode(b)
  // Longueurs différentes : on compare quand même une longueur fixe pour ne pas
  // fuiter l'info par le temps, puis on échoue.
  const len = Math.max(ba.length, bb.length)
  let diff = ba.length ^ bb.length
  for (let i = 0; i < len; i++) diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0)
  return diff === 0
}

/**
 * Retourne une Response d'erreur si la requête n'est pas autorisée, sinon null.
 * `null` = laisser passer.
 */
export function checkAdmin(request: Request, adminToken: string | undefined): Response | null {
  if (!adminToken) {
    return errorJson('auth_not_configured', 503)
  }
  const header = request.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match || !timingSafeEqual(match[1], adminToken)) {
    return errorJson('unauthorized', 401)
  }
  return null
}

function errorJson(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
