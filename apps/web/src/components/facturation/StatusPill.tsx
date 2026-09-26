import type { PaymentStatus } from '@link/db'
import { STATUS } from './format'

/** État d'un paiement en pastille colorée (Payé, En attente, Échoué, Remboursé). */
export function StatusPill({ status }: { status: PaymentStatus }) {
  const s = STATUS[status]
  return <span className={`pill ${s.pill}`}>{s.label}</span>
}
