import { Bone, SkeletonPage } from '@/components/kit/Skeletons'

// Fiche d'un lien : QR à gauche, sections à droite.
export default function Loading() {
  return (
    <SkeletonPage label="Chargement du lien…">
      <div className="flex items-center gap-2.5 px-4 py-3.5 lg:px-8 lg:py-[18px]">
        <Bone className="h-[34px] w-40 rounded-full" />
      </div>
      <div className="px-4 pb-14 pt-1 lg:px-8 lg:pt-2">
        <div className="flex items-center gap-3">
          <Bone className="h-10 w-[min(360px,70%)] rounded-xl" />
          <Bone className="h-[26px] w-20 rounded-full" />
        </div>
        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="grid gap-3.5">
            <Bone className="aspect-square rounded-[26px]" />
            <Bone className="h-12 rounded-full" />
            <Bone className="h-[54px] rounded-full" />
            <Bone className="h-[54px] rounded-full" />
          </div>
          <div className="grid gap-4">
            {[180, 220, 110].map((h) => (
              <div key={h} className="rounded-[26px] p-[26px] shadow-[inset_0_0_0_1px_var(--line)]">
                <div className="flex gap-3">
                  <Bone className="h-10 w-10 rounded-xl" />
                  <div className="grid grow gap-2"><Bone className="h-6 w-1/3 rounded-lg" /><Bone className="skeleton-text w-2/3" /></div>
                </div>
                <Bone className="mt-5 h-[52px] rounded-2xl" />
                <div style={{ height: h - 100 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonPage>
  )
}
