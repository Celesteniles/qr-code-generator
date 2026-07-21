import Link from 'next/link'
import { PLANS } from '@link/shared'

export const metadata = { title: 'Tarifs — link.cg' }

export default function PricingPage() {
  const order = [PLANS.free, PLANS.pro, PLANS.enterprise]

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="text-sm font-bold text-zinc-900 dark:text-zinc-100">link.</Link>
          <Link href="/dashboard" className="ml-auto text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
            Tableau de bord →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Des liens qui vivent avec vous</h1>
          <p className="text-sm text-zinc-500 mt-2">Commencez gratuitement. Payez en mobile money.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {order.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border p-6 bg-white dark:bg-zinc-900 ${
                p.id === 'pro'
                  ? 'border-blue-500 ring-1 ring-blue-500'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {p.id === 'pro' && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">Le plus populaire</span>
              )}
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{p.label}</h2>
              <p className="text-sm text-zinc-500 mb-4">
                {p.maxLinks === null ? 'Liens illimités' : `Jusqu'à ${p.maxLinks} liens`}
              </p>
              <ul className="space-y-2 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="text-blue-500 mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              {p.id === 'free' ? (
                <Link href="/signup" className="block text-center bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold py-2.5 rounded-xl">
                  Commencer
                </Link>
              ) : (
                <a
                  href="mailto:contact@nscreative.cg?subject=Abonnement%20link.cg"
                  className={`block text-center text-sm font-semibold py-2.5 rounded-xl ${
                    p.id === 'pro' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'border border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  Nous contacter
                </a>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-400 mt-8">
          Paiement par Airtel Money / MTN MoMo · facturation à la demande · un service{' '}
          <a href="https://nscreative.cg" className="underline hover:text-blue-500">NS Creative</a>
        </p>
      </main>
    </div>
  )
}
