import Link from 'next/link'
import { PLANS } from '@link/shared'
import { Blobs, Nav, GhostButton } from '@/components/ui'

export const metadata = { title: 'Tarifs — link.cg' }

export default function PricingPage() {
  const order = [PLANS.free, PLANS.pro, PLANS.enterprise]

  return (
    <div className="min-h-screen relative">
      <Blobs />
      <Nav right={<GhostButton href="/dashboard">Tableau de bord →</GhostButton>} />

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Des liens qui <span className="text-grad">vivent</span> avec vous</h1>
          <p className="text-[color:var(--muted)] mt-3">Commencez gratuitement. Payez en mobile money.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {order.map((p) => (
            <div
              key={p.id}
              className={`card-soft p-6 relative ${p.id === 'pro' ? 'ring-2 ring-brand md:-translate-y-2' : ''}`}
            >
              {p.id === 'pro' && (
                <span className="absolute -top-3 left-6 bg-brand text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full">
                  Le plus populaire
                </span>
              )}
              <h2 className="text-lg font-bold text-[color:var(--foreground)]">{p.label}</h2>
              <p className="text-sm text-[color:var(--muted)] mb-5">
                {p.maxLinks === null ? 'Liens illimités' : `Jusqu'à ${p.maxLinks} liens`}
              </p>
              <ul className="space-y-2.5 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[color:var(--foreground)]">
                    <span className="text-grad font-bold mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              {p.id === 'free' ? (
                <Link href="/signup" className="block text-center border border-[color:var(--border)] hover:border-brand hover:text-brand text-[color:var(--foreground)] text-sm font-semibold py-2.5 rounded-full transition-colors">
                  Commencer gratuitement
                </Link>
              ) : (
                <a href="mailto:contact@nscreative.cg?subject=Abonnement%20link.cg"
                  className={`block text-center text-sm font-semibold py-2.5 rounded-full transition ${
                    p.id === 'pro' ? 'btn-grad' : 'border border-[color:var(--border)] hover:border-brand hover:text-brand'
                  }`}>
                  Nous contacter
                </a>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-[color:var(--muted)] mt-10">
          Paiement par Airtel Money / MTN MoMo · facturation à la demande · un service{' '}
          <a href="https://nscreative.cg" className="text-grad font-semibold hover:underline">NS Creative</a>
        </p>
      </main>
    </div>
  )
}
