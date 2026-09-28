import Link from 'next/link'
import { ArrowDownTrayIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { PLANS } from '@link/shared'

// Export CSV des statistiques (/api/stats/export). Paliers avec l'export : un
// simple lien de téléchargement (la route renvoie un fichier ou un message clair).
// Autres paliers : une incitation discrète vers /offres, pas de bouton mort.

export function StatsExport({ allowed, linkId, className = '' }: {
  allowed: boolean
  /** Un seul lien de l'espace ; sinon, tous les liens. */
  linkId?: string
  className?: string
}) {
  if (!allowed) {
    return (
      <Link href="/offres" className={`link text-[13px] ${className}`}>
        Export CSV avec l’offre {PLANS.business.label}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
      </Link>
    )
  }
  const href = linkId ? `/api/stats/export?lien=${encodeURIComponent(linkId)}` : '/api/stats/export'
  // Pas d'attribut `download` : le fichier arrive par Content-Disposition, et un
  // refus (session expirée, stats indisponibles) s'affiche comme une page lisible.
  return (
    <a
      href={href}
      className={`btn btn-soft btn-sm ${className}`}
      title="Visites par lien et par jour, 30 derniers jours (tableur Excel, LibreOffice, Google Sheets)"
    >
      <ArrowDownTrayIcon aria-hidden="true" />Exporter (CSV)
    </a>
  )
}
