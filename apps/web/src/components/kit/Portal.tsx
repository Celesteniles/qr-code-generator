'use client'

import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/**
 * Rend son contenu directement dans <body>. Pour les calques plein écran (tiroirs,
 * modales) : un ancêtre avec transform/filter (animation d'entrée de page…)
 * servirait sinon de référence à `position: fixed` et le calque déborderait.
 * À n'utiliser que pour un contenu rendu côté client (ouvert après interaction).
 */
export function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
