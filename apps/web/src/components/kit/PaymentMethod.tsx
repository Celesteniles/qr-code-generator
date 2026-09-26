import Image from 'next/image'

// Moyens de paiement mobile money, avec leur vrai logo (public/).
// `unoptimized` : l'optimisation d'images de Next n'est pas disponible telle quelle
// sur Cloudflare Workers, et ces fichiers sont déjà légers.

export type MobileMoney = 'airtel_money' | 'mtn_momo'

const METHODS: Record<MobileMoney, { src: string; label: string }> = {
  airtel_money: { src: '/airtel-money.png', label: 'Airtel Money' },
  mtn_momo: { src: '/momo.png', label: 'MTN MoMo' },
}

export const MOBILE_MONEY: MobileMoney[] = ['airtel_money', 'mtn_momo']

export function isMobileMoney(method: string): method is MobileMoney {
  return method in METHODS
}

/** Logo seul (décoratif si le nom est affiché à côté). */
export function PaymentLogo({ method, size = 24, decorative = true }: { method: MobileMoney; size?: number; decorative?: boolean }) {
  const m = METHODS[method]
  return (
    <Image
      src={m.src}
      alt={decorative ? '' : m.label}
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-[22%] shadow-[0_0_0_1px_rgba(0,0,0,.06)]"
      style={{ width: size, height: size }}
    />
  )
}

/** Logo + nom, en pastille (listes de moyens acceptés). */
export function PaymentMethodChip({ method, size = 'md' }: { method: MobileMoney; size?: 'sm' | 'md' }) {
  const big = size === 'md'
  return (
    <span className={`inline-flex items-center gap-2.5 rounded-2xl bg-surface font-semibold text-ink shadow-[inset_0_0_0_1.5px_var(--line)] ${
      big ? 'h-12 pl-1.5 pr-4 text-[15px]' : 'h-9 pl-1 pr-3 text-sm'
    }`}>
      <PaymentLogo method={method} size={big ? 36 : 28} />
      {METHODS[method].label}
    </span>
  )
}

/** Logo + libellé sur une ligne (tableaux, reçu). Sans logo pour un moyen non mobile money. */
export function PaymentMethodInline({ method, label, size = 20 }: { method: string; label: string; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {isMobileMoney(method) && <PaymentLogo method={method} size={size} />}
      {label}
    </span>
  )
}
