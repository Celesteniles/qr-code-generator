// Jetons des tâches planifiées. Le Cron Trigger (custom-worker.ts) appelle une
// route de l'app EN INTERNE (handler.fetch, sans passer par le réseau) avec un
// jeton aléatoire à usage unique, enregistré ici le temps de l'appel. La route
// (/api/taches/…) n'accepte que ce jeton : il n'existe que dans la mémoire du
// Worker, n'est jamais publié ni stocké, donc aucune requête venue d'Internet ne
// peut déclencher la tâche, et il n'y a pas de secret à poser (fermé par défaut).
//
// Aucune dépendance : importé à la fois par custom-worker.ts (hors Next) et par
// la route (dans Next). Le registre vit sur globalThis, commun aux deux dans
// l'isolat du Worker.

const REGISTRY = Symbol.for('link.cg/taches-internes')

function registry(): Set<string> {
  const g = globalThis as unknown as Record<symbol, Set<string> | undefined>
  return (g[REGISTRY] ??= new Set())
}

export const INTERNAL_TASK_HEADER = 'x-link-tache'

/** Crée un jeton valable jusqu'à revokeInternalTaskToken. */
export function issueInternalTaskToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const token = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  registry().add(token)
  return token
}

export function revokeInternalTaskToken(token: string): void {
  registry().delete(token)
}

/** true seulement pour un jeton émis dans cet isolat et pas encore révoqué. */
export function isInternalTaskRequest(request: Request): boolean {
  const token = request.headers.get(INTERNAL_TASK_HEADER)
  return !!token && token.length === 64 && registry().has(token)
}
