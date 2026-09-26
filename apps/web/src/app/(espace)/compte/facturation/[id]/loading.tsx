import { Bone, SkeletonPage } from '@/components/kit/Skeletons'

// Reçu : barre d'actions puis feuille.
export default function Loading() {
  return (
    <SkeletonPage label="Chargement du reçu…">
      <div className="px-4 pb-14 pt-6 sm:px-8 lg:px-10 lg:pt-9">
        <div className="mx-auto mb-5 flex max-w-[820px] justify-between">
          <Bone className="h-[34px] w-32 rounded-full" />
          <Bone className="h-[34px] w-64 rounded-full" />
        </div>
        <div className="mx-auto grid max-w-[820px] gap-4 rounded-[26px] p-6 shadow-[inset_0_0_0_1px_var(--line)] sm:p-10">
          <div className="flex justify-between gap-6">
            <div className="grid w-1/3 gap-2"><Bone className="h-6 rounded-lg" /><Bone className="skeleton-text w-2/3" /></div>
            <div className="grid w-1/3 gap-2"><Bone className="h-7 rounded-lg" /><Bone className="skeleton-text w-1/2 justify-self-end" /></div>
          </div>
          <Bone className="mt-4 h-12 rounded-2xl" />
          <Bone className="h-24 rounded-2xl" />
          <Bone className="h-32 rounded-2xl" />
        </div>
      </div>
    </SkeletonPage>
  )
}
