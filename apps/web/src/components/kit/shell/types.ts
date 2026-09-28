/** Ce que la coquille sait du visiteur (sérialisable : passé du serveur au client). */
export interface Viewer {
  /** null = visiteur sans compte. */
  user: { name: string; email: string } | null
  plan: { label: string; used: number; max: number | null } | null
  /**
   * Espace courant, affiché seulement si l'utilisateur en a plusieurs (le sien +
   * ceux qui l'ont invité) ; null sinon.
   */
  workspace?: { name: string } | null
}

export function initials(nameOrEmail: string): string {
  const base = nameOrEmail.split('@')[0]
  const parts = base.trim().split(/[\s._-]+/).filter(Boolean)
  return (parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '•')
}
