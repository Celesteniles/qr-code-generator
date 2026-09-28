import type { TeamRole } from '@link/db'

// Données de l'onglet Équipe, prêtes à afficher (sérialisables : serveur → client).

export const ROLE_LABEL: Record<TeamRole, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  member: 'Membre',
}

export interface MemberItem {
  userId: string
  name: string
  email: string
  role: TeamRole
  /** L'utilisateur connecté. */
  self: boolean
}

export interface InvitationItem {
  id: string
  email: string
  role: 'admin' | 'member'
  expired: boolean
  /** Dates déjà formatées (heure de Brazzaville). */
  sentOn: string
  expiresOn: string
}
