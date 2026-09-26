// Constantes et types partagés du côté serveur du dashboard. Séparés de actions.ts
// car un module 'use server' ne peut exporter que des fonctions async.

// Espace de travail par défaut (mono-tenant en attendant l'auth). Correspond au
// seed D1 (ws_ns / dom_linkcg → hostname link.cg).
export const DEFAULT_WORKSPACE = 'ws_ns'
export const DEFAULT_DOMAIN = 'dom_linkcg'

export type CreateState =
  | { ok: true; slug: string; id: string }
  // `values` répercute la saisie : React 19 réinitialise le formulaire après une
  // action, on restaure les champs via defaultValue en cas d'erreur.
  | { ok: false; message: string; values: Record<string, string> }
  | null

/** Résultat de la mise à jour de destination d'un lien (fiche d'un lien). */
export type UpdateDestinationState =
  | { ok: true }
  | { ok: false; message: string }
  | null

/** Disponibilité d'une adresse courte (écran Créer, vérifiée pendant la saisie). */
export interface SlugCheck {
  /** Adresse normalisée (minuscules, espaces → tirets, caractères interdits retirés). */
  normalized: string
  available: boolean
  /** Message en langage courant si indisponible ou invalide. */
  message?: string
  /** Alternatives libres, proposées si indisponible. */
  suggestions: string[]
}

/** Visites d'un jour (clics sur le lien + scans du QR, non distingués aujourd'hui). */
export interface DailyPoint {
  /** AAAA-MM-JJ (UTC). */
  day: string
  visits: number
}
