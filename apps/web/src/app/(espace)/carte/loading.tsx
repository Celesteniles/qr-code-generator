import { Bone, SkeletonPage } from '@/components/kit/Skeletons'

// Carte de visite : formulaire à gauche, téléphone d'aperçu à droite.
export default function Loading() {
  return (
    <SkeletonPage label="Chargement de votre carte de visite…">
      <div className="px-4 py-6 sm:px-8 lg:px-10 lg:py-9">
        <Bone className="h-10 w-[min(380px,80%)] rounded-xl" />
        <div className="mt-4 grid max-w-[560px] gap-2"><Bone className="skeleton-text w-full" /><Bone className="skeleton-text w-2/3" /></div>
        <div className="mt-8 grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="grid gap-4 rounded-[26px] p-[26px] shadow-[inset_0_0_0_1px_var(--line)]">
                <Bone className="h-6 w-1/3 rounded-lg" />
                <Bone className="h-[52px] rounded-2xl" />
                <Bone className="h-[52px] rounded-2xl" />
              </div>
            ))}
          </div>
          <Bone className="mx-auto h-[640px] w-full max-w-[340px] rounded-[46px]" />
        </div>
      </div>
    </SkeletonPage>
  )
}
