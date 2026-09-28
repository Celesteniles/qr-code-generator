// Paliers d'abonnement et limites associées. Partagé entre l'API, le dashboard et
// la page tarifs. La facturation (paiement) est hors périmètre ici : ce module ne
// décrit que les capacités par palier.

export type Plan = 'free' | 'pro' | 'business' | 'enterprise'

export interface PlanSpec {
  id: Plan
  label: string
  /** Nombre maximum de liens actifs. null = illimité. */
  maxLinks: number | null
  /** Domaines personnalisés autorisés. */
  customDomains: boolean
  /** Prix mensuel en FCFA. 0 = gratuit, null = sur devis. */
  monthlyPrice: number | null
  /** Prix annuel en FCFA (2 mois offerts). null = sur devis ou gratuit. */
  yearlyPrice: number | null
  /** Argumentaire (page tarifs). */
  features: string[]
}

export const PLANS: Record<Plan, PlanSpec> = {
  free: {
    id: 'free',
    label: 'Gratuit',
    maxLinks: 10,
    customDomains: false,
    monthlyPrice: 0,
    yearlyPrice: null,
    features: ['10 liens dynamiques', 'QR codes personnalisés', 'Statistiques de scans', 'Cartes de visite'],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    maxLinks: 200,
    customDomains: false,
    monthlyPrice: 5_000,
    yearlyPrice: 50_000,
    features: ['200 liens dynamiques', 'Studio QR complet', 'Statistiques détaillées', 'Cartes de visite'],
  },
  business: {
    id: 'business',
    label: 'Business',
    maxLinks: 1_000,
    customDomains: true,
    monthlyPrice: 15_000,
    yearlyPrice: 150_000,
    features: ['1 000 liens dynamiques', 'Domaine personnalisé', 'Plusieurs utilisateurs', 'Export des statistiques'],
  },
  enterprise: {
    id: 'enterprise',
    label: 'Entreprise',
    maxLinks: null,
    customDomains: true,
    monthlyPrice: null,
    yearlyPrice: null,
    features: ['Liens illimités', 'Plusieurs domaines', 'Comptes multiples', 'Accompagnement dédié'],
  },
}

/** Prix d'entrée du palier Entreprise (« à partir de »), en FCFA par mois. */
export const ENTERPRISE_FROM_PRICE = 50_000

/** Peut-on créer un lien de plus sur ce palier ? */
export function canCreateLink(plan: Plan, currentCount: number): boolean {
  const max = PLANS[plan].maxLinks
  return max === null || currentCount < max
}
