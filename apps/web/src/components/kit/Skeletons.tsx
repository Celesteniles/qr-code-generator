// Squelettes de chargement : reprennent la silhouette des vrais écrans pour que
// l'arrivée du contenu ne fasse pas « sauter » la page.

/** Bloc gris animé. `className` fixe la taille et l'arrondi. */
export function Bone({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

/** Enveloppe commune : annonce le chargement aux lecteurs d'écran. */
export function SkeletonPage({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="anim-fade-late">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

/** Barre du haut + titre + intro, comme en tête de chaque écran de l'espace. */
export function SkeletonHead({ lead = true }: { lead?: boolean }) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-4 py-3.5 lg:px-8 lg:py-[18px]">
        <Bone className="h-[34px] w-32 rounded-full" />
      </div>
      <div className="px-4 pt-1 lg:px-8 lg:pt-2">
        <Bone className="h-10 w-[min(420px,80%)] rounded-xl" />
        {lead && (
          <div className="mt-4 grid max-w-[600px] gap-2">
            <Bone className="skeleton-text w-full" />
            <Bone className="skeleton-text w-3/4" />
          </div>
        )}
      </div>
    </>
  )
}

/** Carte de lien/QR (grille Mes liens & QR, récents de l'accueil). */
export function SkeletonQrCard() {
  return (
    <div className="rounded-3xl p-3 shadow-[inset_0_0_0_1px_var(--line)]">
      <Bone className="h-[186px] rounded-[18px]" />
      <div className="grid gap-2 px-1.5 pb-1.5 pt-4">
        <Bone className="h-5 w-2/3 rounded-lg" />
        <Bone className="skeleton-text w-full" />
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-line px-1 pt-3">
        <Bone className="skeleton-text w-24" />
        <Bone className="ml-auto h-8 w-8 rounded-full" />
        <Bone className="h-8 w-8 rounded-full" />
      </div>
    </div>
  )
}
