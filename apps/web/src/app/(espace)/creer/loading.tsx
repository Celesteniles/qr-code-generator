import { Bone, SkeletonHead, SkeletonPage } from '@/components/kit/Skeletons'

// Créer : trois choix, questions à gauche, aperçu à droite.
export default function Loading() {
  return (
    <SkeletonPage label="Préparation de l'écran de création…">
      <SkeletonHead />
      <div className="px-4 pb-14 lg:px-8">
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => <Bone key={i} className="h-[92px] rounded-[20px]" />)}
        </div>
        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="grid gap-10">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3.5">
                <Bone className="h-[30px] w-[30px] shrink-0 rounded-full" />
                <div className="grid grow gap-3">
                  <Bone className="h-7 w-2/3 rounded-lg" />
                  <Bone className="skeleton-text w-1/2" />
                  <Bone className="mt-2 h-[52px] rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-3.5">
            <Bone className="aspect-square rounded-[26px]" />
            <Bone className="h-[54px] rounded-full" />
          </div>
        </div>
      </div>
    </SkeletonPage>
  )
}
