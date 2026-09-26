'use client'

import { PrinterIcon } from '@heroicons/react/24/outline'

/** Ouvre la boîte d'impression du navigateur (qui propose aussi « Enregistrer en PDF »). */
export function PrintButton() {
  return (
    <button type="button" className="btn btn-cta btn-sm" onClick={() => window.print()}>
      <PrinterIcon aria-hidden="true" />Télécharger en PDF / Imprimer
    </button>
  )
}
