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
  /** Membres de l'espace, propriétaire compris. null = illimité. */
  maxMembers: number | null
  /** Export CSV des statistiques. */
  statsExport: boolean
  /** Prix mensuel en FCFA. 0 = gratuit, null = sur devis. */
  monthlyPrice: number | null
  /** Prix annuel en FCFA (remisé). null = sur devis ou gratuit. */
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
    maxMembers: 1,
    statsExport: false,
    monthlyPrice: 0,
    yearlyPrice: null,
    features: ['10 liens dynamiques', 'QR codes personnalisés', 'Statistiques de scans', 'Cartes de visite'],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    maxLinks: 100,
    customDomains: false,
    maxMembers: 1,
    statsExport: false,
    monthlyPrice: 1_500,
    yearlyPrice: 13_000,
    features: ['100 liens dynamiques', 'Studio QR complet', 'Statistiques détaillées', 'Cartes de visite'],
  },
  business: {
    id: 'business',
    label: 'Business',
    maxLinks: 500,
    customDomains: true,
    maxMembers: 3,
    statsExport: true,
    monthlyPrice: 10_000,
    yearlyPrice: 100_000,
    features: ['500 liens dynamiques', 'Domaine personnalisé', 'Plusieurs utilisateurs', 'Export des statistiques'],
  },
  enterprise: {
    id: 'enterprise',
    label: 'Entreprise',
    maxLinks: null,
    customDomains: true,
    maxMembers: null,
    statsExport: true,
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

/** Peut-on ajouter un membre de plus (invitations en attente comprises) ? */
export function canAddMember(plan: Plan, currentCount: number): boolean {
  const max = PLANS[plan].maxMembers
  return max === null || currentCount < max
}
