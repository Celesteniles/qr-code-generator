import { Bone, SkeletonHead, SkeletonPage, SkeletonQrCard } from '@/components/kit/Skeletons'

export default function Loading() {
  return (
    <SkeletonPage label="Chargement de vos liens et QR…">
      <SkeletonHead />
      <div className="px-4 pb-14 lg:px-8">
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Bone className="h-11 w-full max-w-[340px] rounded-full" />
          {[0, 1, 2].map((i) => <Bone key={i} className="h-[42px] w-28 rounded-full" />)}
        </div>
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {[0, 1, 2, 3].map((i) => <SkeletonQrCard key={i} />)}
        </div>
      </div>
    </SkeletonPage>
  )
}
