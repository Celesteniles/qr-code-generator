/** Indicateur d'activité, à placer dans un bouton en attente (avec aria-busy sur le bouton). */
export function Spinner({ className = '' }: { className?: string }) {
  return <span className={`spinner ${className}`} aria-hidden="true" />
}
