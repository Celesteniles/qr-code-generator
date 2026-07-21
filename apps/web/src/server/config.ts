// Constantes et types partagés du côté serveur du dashboard. Séparés de actions.ts
// car un module 'use server' ne peut exporter que des fonctions async.

// Espace de travail par défaut (mono-tenant en attendant l'auth). Correspond au
// seed D1 (ws_ns / dom_linkcg → hostname link.cg).
export const DEFAULT_WORKSPACE = 'ws_ns'
export const DEFAULT_DOMAIN = 'dom_linkcg'

export type CreateState =
  | { ok: true; slug: string }
  | { ok: false; message: string }
  | null
