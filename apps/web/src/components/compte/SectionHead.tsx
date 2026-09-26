import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

/** En-tête de section en carte : pastille d'icône, titre, phrase d'explication. */
export function SectionHead({ icon, tone, id, title, children }: {
  icon: React.ReactNode
  tone: string
  id: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-[18px] flex items-start gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl [&_svg]:h-5 [&_svg]:w-5 ${tone}`} aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <h2 id={id} className="h2">{title}</h2>
        {children && <p className="mt-0.5 text-sm text-muted">{children}</p>}
      </div>
    </div>
  )
}

/** Message de résultat « pop » (succès vert, erreur rouge). */
export function ResultTip({ ok, title, children }: { ok: boolean; title: string; children?: React.ReactNode }) {
  return (
    <div className={`tip ${ok ? 'mint' : 'bad'} anim-pop mt-4`} role={ok ? 'status' : 'alert'}>
      <span className="tip-ico">
        {ok ? <CheckIcon aria-hidden="true" /> : <ExclamationTriangleIcon aria-hidden="true" />}
      </span>
      <div><strong>{title}</strong>{children}</div>
    </div>
  )
}
