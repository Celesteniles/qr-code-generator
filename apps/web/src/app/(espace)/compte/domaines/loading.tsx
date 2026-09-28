import { Bone, SkeletonPage } from '@/components/kit/Skeletons'

// Domaines : onglets, liste des domaines, aide à droite.
export default function Loading() {
  return (
    <SkeletonPage label="Chargement de vos domaines…">
      <div className="px-4 pb-14 pt-6 sm:px-8 lg:px-10 lg:pt-9">
        <Bone className="h-10 w-[min(280px,70%)] rounded-xl" />
        <div className="mt-4 grid max-w-[560px] gap-2"><Bone className="skeleton-text w-full" /></div>
        <Bone className="mt-6 h-11 w-[300px] max-w-full rounded-full" />
        <div className="mt-8 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[26px] p-5 shadow-[inset_0_0_0_1px_var(--line)] sm:p-[26px]">
            <div className="flex gap-3">
              <Bone className="h-10 w-10 rounded-xl" />
              <div className="grid grow gap-2"><Bone className="h-6 w-1/3 rounded-lg" /><Bone className="skeleton-text w-2/3" /></div>
            </div>
            <div className="mt-5 grid gap-3"><Bone className="h-[120px] rounded-2xl" /><Bone className="h-[52px] rounded-2xl" /></div>
          </div>
          <div className="rounded-[26px] p-5 shadow-[inset_0_0_0_1px_var(--line)] sm:p-[26px]">
            <Bone className="h-6 w-1/2 rounded-lg" />
            <div className="mt-5 grid gap-2"><Bone className="skeleton-text w-full" /><Bone className="skeleton-text w-5/6" /><Bone className="skeleton-text w-4/6" /></div>
          </div>
        </div>
      </div>
    </SkeletonPage>
  )
}
