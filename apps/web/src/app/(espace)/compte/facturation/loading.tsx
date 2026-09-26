import { Bone, SkeletonPage } from '@/components/kit/Skeletons'

function CardBone({ rows }: { rows: number }) {
  return (
    <div className="rounded-[26px] p-5 shadow-[inset_0_0_0_1px_var(--line)] sm:p-[26px]">
      <div className="flex gap-3">
        <Bone className="h-10 w-10 rounded-xl" />
        <div className="grid grow gap-2"><Bone className="h-6 w-1/3 rounded-lg" /><Bone className="skeleton-text w-2/3" /></div>
      </div>
      <div className="mt-5 grid gap-3">
        {Array.from({ length: rows }, (_, i) => <Bone key={i} className="h-10 rounded-2xl" />)}
      </div>
    </div>
  )
}

// Facturation : onglets, offre + moyens de paiement, historique.
export default function Loading() {
  return (
    <SkeletonPage label="Chargement de la facturation…">
      <div className="px-4 pb-14 pt-6 sm:px-8 lg:px-10 lg:pt-9">
        <Bone className="h-10 w-[min(280px,70%)] rounded-xl" />
        <div className="mt-4 grid max-w-[560px] gap-2"><Bone className="skeleton-text w-full" /></div>
        <Bone className="mt-6 h-11 w-[220px] rounded-full" />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <CardBone rows={1} />
          <CardBone rows={1} />
        </div>
        <div className="mt-4"><CardBone rows={3} /></div>
      </div>
    </SkeletonPage>
  )
}
