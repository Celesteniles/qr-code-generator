// Compilation D1 → KV. Transforme une ligne `links` (+ son hostname de domaine) en
// la valeur de lecture stockée dans KV. C'est l'unique sens autorisé : la vérité D1
// se propage vers KV, jamais l'inverse (docs/ARCHITECTURE.md §4).

import { linkKey, type CompiledLink } from '@link/shared'
import type { LinkRow } from './schema'

export interface CompiledEntry {
  key: string
  value: CompiledLink
}

/**
 * Compile une ligne de lien en entrée KV. `hostname` vient du domaine référencé
 * par `link.domainId` (résolu par l'appelant, qui a le contexte D1).
 */
export function compileLink(link: LinkRow, hostname: string): CompiledEntry {
  const value: CompiledLink = {
    slug: link.slug,
    rule: link.rule,
    active: link.active,
    ...(link.expiresAt != null ? { expiresAt: link.expiresAt } : {}),
  }
  return { key: linkKey(hostname, link.slug), value }
}

/** Sérialise l'entrée pour `KV.put` (valeur JSON). */
export function serializeEntry(entry: CompiledEntry): { key: string; value: string } {
  return { key: entry.key, value: JSON.stringify(entry.value) }
}
