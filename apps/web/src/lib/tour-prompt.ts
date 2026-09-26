// Mémoire de l'invitation à la visite guidée (visiteur, dans ce navigateur).
// Commodité uniquement : si le stockage est indisponible, on ne propose rien
// plutôt que de revenir à chaque visite.

const KEY = 'linkcg.tour-prompt.v1'

export type TourPromptState = 'dismissed' | 'seen'

/** true si l'invitation peut être montrée (jamais refusée, visite jamais faite). */
export function shouldOfferTour(): boolean {
  try {
    return localStorage.getItem(KEY) === null
  } catch {
    return false
  }
}

export function rememberTour(state: TourPromptState): void {
  try {
    localStorage.setItem(KEY, state)
  } catch {
    // stockage indisponible : rien à faire
  }
}
