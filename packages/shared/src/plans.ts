// Paliers d'abonnement et limites associées. Partagé entre l'API, le dashboard et
// la page tarifs. La facturation (paiement) est hors périmètre ici : ce module ne
// décrit que les capacités par palier.

export type Plan = 'free' | 'pro' | 'enterprise'

export interface PlanSpec {
  id: Plan
  label: string
  /** Nombre maximum de liens actifs. null = illimité. */
  maxLinks: number | null
  /** Domaines personnalisés autorisés. */
  customDomains: boolean
  /** Argumentaire (page tarifs). */
  features: string[]
}

export const PLANS: Record<Plan, PlanSpec> = {
  free: {
    id: 'free',
    label: 'Gratuit',
    maxLinks: 25,
    customDomains: false,
    features: ['25 liens dynamiques', 'QR codes personnalisés', 'Statistiques de scans', 'Cartes de visite'],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    maxLinks: 500,
    customDomains: true,
    features: ['500 liens dynamiques', 'Domaine personnalisé', 'Statistiques détaillées', 'Support prioritaire'],
  },
  enterprise: {
    id: 'enterprise',
    label: 'Entreprise',
    maxLinks: null,
    customDomains: true,
    features: ['Liens illimités', 'Plusieurs domaines', 'Comptes multiples', 'Accompagnement dédié'],
  },
}

/** Peut-on créer un lien de plus sur ce palier ? */
export function canCreateLink(plan: Plan, currentCount: number): boolean {
  const max = PLANS[plan].maxLinks
  return max === null || currentCount < max
}
