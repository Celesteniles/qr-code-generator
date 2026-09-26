/** Ce que la coquille sait du visiteur (sérialisable : passé du serveur au client). */
export interface Viewer {
  /** null = visiteur sans compte. */
  user: { name: string; email: string } | null
  plan: { label: string; used: number; max: number | null } | null
}

export function initials(nameOrEmail: string): string {
  const base = nameOrEmail.split('@')[0]
  const parts = base.trim().split(/[\s._-]+/).filter(Boolean)
  return (parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '•')
}
