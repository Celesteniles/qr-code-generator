// Mise en forme partagée des statistiques (pourcentages, nombres).

export const nf = new Intl.NumberFormat('fr-FR')
const pf = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 })

/** « 62 % » ; « moins de 1 % » pour une part non nulle arrondie à 0. */
export function pct(share: number): string {
  if (share > 0 && share < 0.005) return '< 1 %'
  return pf.format(share)
}

export function visitsText(n: number): string {
  return `${nf.format(n)} visite${n > 1 ? 's' : ''}`
}
