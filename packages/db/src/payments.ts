// Paiements d'abonnement et reçus (FCFA, mobile money). Aucune intégration
// opérateur ici : ce module est le point d'entrée que les intégrations appelleront.
//
// Future intégration (webhook Airtel Money / MTN MoMo) — contrat :
//   1. Vérifier la signature / l'authenticité de la notification AVANT tout
//      (secret partagé, HMAC ou rappel de l'API de l'opérateur). Ne jamais faire
//      confiance au corps de la requête seul.
//   2. Appeler `recordPayment(deps, { …, method, providerReference })` avec la
//      référence de transaction de l'opérateur : l'appel est idempotent sur
//      (method, providerReference) — une notification reçue deux fois renvoie le
//      même paiement (`duplicate: true`) sans créer de second reçu.
//   3. Pour un changement d'état ultérieur (confirmation, échec, remboursement),
//      retrouver le paiement puis `markPaymentStatus(deps, id, status, paidAt?)`.
//   4. Répondre 2xx à l'opérateur dès que l'écriture D1 est faite (ou si le
//      paiement existait déjà), pour qu'il cesse de renvoyer la notification.
// Mettre à jour `workspaces.plan` après un paiement « paid » relève de l'appelant.

import { and, desc, eq, like, sql } from 'drizzle-orm'
import { z } from 'zod'
import * as schema from './schema'
import type { Db } from './mutations'
import type { PaymentRow } from './schema'

export const PAYMENT_METHODS = ['airtel_money', 'mtn_momo', 'manual'] as const
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

const RECEIPT_PREFIX = 'LCG'
/** Décalage de l'heure du Congo (WAT, UTC+1, sans heure d'été) : l'année du reçu est l'année locale. */
const WAT_OFFSET_MS = 60 * 60 * 1000

/** Année locale (Brazzaville) d'un horodatage en millisecondes. */
export function receiptYear(ts: number): number {
  return new Date(ts + WAT_OFFSET_MS).getUTCFullYear()
}

/** LCG-2026-00042 (5 chiffres minimum ; au-delà de 99 999, le numéro s'allonge). */
export function formatReceiptNumber(year: number, seq: number): string {
  return `${RECEIPT_PREFIX}-${year}-${String(seq).padStart(5, '0')}`
}

/** Numéro de téléphone masqué pour l'affichage : « +242 •• ••• 45 67 » → seuls les 4 derniers chiffres. */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '••••'
  const last = digits.slice(-4)
  const intl = phone.trim().startsWith('+') && digits.startsWith('242') ? '+242 ' : ''
  return `${intl}•• ••• ${last.slice(0, 2)} ${last.slice(2)}`
}

export const recordPaymentInput = z
  .object({
    workspaceId: z.string().min(1),
    plan: z.enum(['free', 'pro', 'enterprise']),
    periodStart: z.number().int().nonnegative(),
    periodEnd: z.number().int().positive(),
    amount: z.number().int('montant entier en FCFA').positive('montant strictement positif').max(1_000_000_000),
    currency: z.literal('XAF').default('XAF'),
    method: z.enum(PAYMENT_METHODS),
    providerReference: z.string().trim().min(1).max(128).optional(),
    payerPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ]{8,20}$/, 'numéro de téléphone invalide')
      .transform((p) => (p.startsWith('+') ? '+' : '') + p.replace(/\D/g, ''))
      .optional(),
    status: z.enum(PAYMENT_STATUSES).default('pending'),
    paidAt: z.number().int().positive().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((v) => v.periodEnd > v.periodStart, { message: 'la fin de période doit suivre le début', path: ['periodEnd'] })
export type RecordPaymentInput = z.input<typeof recordPaymentInput>

export interface PaymentDeps {
  db: Db
  newId?: () => string
  now?: () => number
}

export type RecordPaymentResult =
  | { ok: true; id: string; receiptNumber: string; duplicate: boolean }
  | { ok: false; error: 'invalid'; issues: string[] }
  | { ok: false; error: 'workspace_not_found' }
  /** La référence opérateur existe déjà pour un autre espace : anomalie, rien n'est écrit. */
  | { ok: false; error: 'reference_conflict' }
  | { ok: false; error: 'receipt_number_exhausted' }

const MAX_ATTEMPTS = 8

/** Message d'erreur SQLite, y compris quand le pilote l'enveloppe (`cause`). */
function uniqueViolation(err: unknown): string | null {
  for (let e: unknown = err, i = 0; e && i < 4; e = (e as { cause?: unknown }).cause, i++) {
    const msg = String((e as { message?: unknown }).message ?? '')
    if (msg.includes('UNIQUE constraint failed')) return msg
  }
  return null
}

async function findByReference(db: Db, method: PaymentMethod, ref: string) {
  return db.query.payments.findFirst({
    where: and(eq(schema.payments.method, method), eq(schema.payments.providerReference, ref)),
  })
}

/** Prochain numéro de séquence pour l'année (max + 1 ; tri numérique, pas lexical). */
async function nextSequence(db: Db, year: number): Promise<number> {
  const prefix = `${RECEIPT_PREFIX}-${year}-`
  const [row] = await db
    .select({ max: sql<number | null>`max(cast(substr(${schema.payments.receiptNumber}, ${prefix.length + 1}) as integer))` })
    .from(schema.payments)
    .where(like(schema.payments.receiptNumber, `${prefix}%`))
  return (row?.max ?? 0) + 1
}

/**
 * Enregistre un paiement et lui attribue le prochain numéro de reçu de l'année.
 * L'unicité du numéro est garantie par la contrainte ; en cas de collision
 * (écritures concurrentes), le numéro est recalculé et l'insertion retentée.
 * Idempotent sur (method, providerReference) quand la référence est fournie.
 */
export async function recordPayment(deps: PaymentDeps, raw: unknown): Promise<RecordPaymentResult> {
  const parsed = recordPaymentInput.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'invalid', issues: parsed.error.issues.map((i) => i.message) }
  }
  const input = parsed.data
  const { db } = deps

  const existingRef = async (): Promise<RecordPaymentResult | null> => {
    if (!input.providerReference) return null
    const found = await findByReference(db, input.method, input.providerReference)
    if (!found) return null
    if (found.workspaceId !== input.workspaceId) return { ok: false, error: 'reference_conflict' }
    return { ok: true, id: found.id, receiptNumber: found.receiptNumber, duplicate: true }
  }

  const dup = await existingRef()
  if (dup) return dup

  const ws = await db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, input.workspaceId) })
  if (!ws) return { ok: false, error: 'workspace_not_found' }

  const id = (deps.newId ?? (() => crypto.randomUUID()))()
  const ts = (deps.now ?? (() => Date.now()))()
  const year = receiptYear(ts)

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const receiptNumber = formatReceiptNumber(year, await nextSequence(db, year))
    try {
      await db.insert(schema.payments).values({
        id,
        workspaceId: input.workspaceId,
        receiptNumber,
        plan: input.plan,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        amount: input.amount,
        currency: input.currency,
        method: input.method,
        providerReference: input.providerReference ?? null,
        payerPhone: input.payerPhone ?? null,
        status: input.status,
        paidAt: input.status === 'paid' ? (input.paidAt ?? ts) : (input.paidAt ?? null),
        createdAt: ts,
        metadata: input.metadata ?? null,
      })
      return { ok: true, id, receiptNumber, duplicate: false }
    } catch (err) {
      const msg = uniqueViolation(err)
      if (!msg) throw err
      // Même transaction notifiée en parallèle : on renvoie celle qui a gagné.
      if (msg.includes('provider_reference')) {
        const winner = await existingRef()
        if (winner) return winner
        throw err
      }
      if (!msg.includes('receipt_number')) throw err
      // Collision de numéro : on recalcule et on réessaie.
    }
  }
  return { ok: false, error: 'receipt_number_exhausted' }
}

// ── Changement d'état ─────────────────────────────────────────────────────────

/** Transitions autorisées. Un échec peut devenir payé (confirmation tardive de l'opérateur). */
const TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['paid', 'failed'],
  failed: ['paid'],
  paid: ['refunded'],
  refunded: [],
}

export type MarkPaymentResult =
  | { ok: true; payment: PaymentRow; changed: boolean }
  | { ok: false; error: 'not_found' }
  | { ok: false; error: 'invalid_status' }
  | { ok: false; error: 'invalid_transition'; from: PaymentStatus; to: PaymentStatus }

/**
 * Change l'état d'un paiement. Idempotent : repasser le même état ne change rien.
 * `paidAt` n'est utilisé que pour « paid » (par défaut : maintenant).
 */
export async function markPaymentStatus(
  deps: PaymentDeps,
  id: string,
  status: PaymentStatus,
  paidAt?: number,
): Promise<MarkPaymentResult> {
  if (!(PAYMENT_STATUSES as readonly string[]).includes(status)) return { ok: false, error: 'invalid_status' }
  const current = await getPayment(deps.db, id)
  if (!current) return { ok: false, error: 'not_found' }
  if (current.status === status) return { ok: true, payment: current, changed: false }
  if (!TRANSITIONS[current.status].includes(status)) {
    return { ok: false, error: 'invalid_transition', from: current.status, to: status }
  }

  const patch: Partial<PaymentRow> = { status }
  if (status === 'paid') patch.paidAt = paidAt ?? (deps.now ?? (() => Date.now()))()
  // Mise à jour conditionnelle : si l'état a changé entre-temps (notification
  // concurrente), on ne l'écrase pas et on réévalue à partir de l'état réel.
  const updated = await deps.db
    .update(schema.payments)
    .set(patch)
    .where(and(eq(schema.payments.id, id), eq(schema.payments.status, current.status)))
    .returning({ id: schema.payments.id })
  if (!updated.length) return markPaymentStatus(deps, id, status, paidAt)
  return { ok: true, payment: { ...current, ...patch }, changed: true }
}

// ── Lectures ─────────────────────────────────────────────────────────────────

/** Paiements d'un espace, du plus récent au plus ancien. */
export async function listPayments(db: Db, workspaceId: string): Promise<PaymentRow[]> {
  return db.query.payments.findMany({
    where: eq(schema.payments.workspaceId, workspaceId),
    orderBy: [desc(schema.payments.createdAt), desc(schema.payments.receiptNumber)],
  })
}

/** Un paiement par id. La vérification de propriété (workspaceId) incombe à l'appelant. */
export async function getPayment(db: Db, id: string): Promise<PaymentRow | undefined> {
  return db.query.payments.findFirst({ where: eq(schema.payments.id, id) })
}

/** Paiement « paid » dont la période couvre `at`, s'il existe (le plus tardif). */
export function activePaidPeriod(payments: PaymentRow[], at: number): PaymentRow | null {
  let best: PaymentRow | null = null
  for (const p of payments) {
    if (p.status !== 'paid' || p.periodStart > at || p.periodEnd <= at) continue
    if (!best || p.periodEnd > best.periodEnd) best = p
  }
  return best
}
