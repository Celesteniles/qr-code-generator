import { Bone, SkeletonHead, SkeletonPage } from '@/components/kit/Skeletons'

// Chargement par défaut de l'espace (accueil, offres…) : titre, intro, trois cartes.
export default function Loading() {
  return (
    <SkeletonPage label="Chargement de la page…">
      <SkeletonHead />
      <div className="px-4 pb-14 lg:px-8">
        <Bone className="mt-8 h-16 max-w-[760px] rounded-full" />
        <div className="mt-12 grid gap-3.5 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-3xl p-3.5 shadow-[inset_0_0_0_1px_var(--line)]">
              <Bone className="h-[140px] rounded-2xl" />
              <Bone className="mt-4 h-6 w-1/2 rounded-lg" />
              <Bone className="skeleton-text mt-3 w-full" />
              <Bone className="skeleton-text mt-2 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  )
}
