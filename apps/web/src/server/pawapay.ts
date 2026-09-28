import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { DepositOutcome } from '@link/db'

// Client pawaPay (API v2) : page de paiement hébergée et lecture d'un dépôt.
// Docs : https://docs.pawapay.io/v2/api-reference
//
// Secret : PAWAPAY_API_TOKEN (jeton du tableau de bord pawaPay, sandbox ou prod).
// Var : PAWAPAY_ENV = "production" pour l'API réelle ; toute autre valeur (ou
// absence) = sandbox. Sans jeton, le paiement en ligne est désactivé : l'interface
// renvoie vers le contact commercial, rien n'est simulé.
//
// Confiance : le statut d'un dépôt n'est JAMAIS lu dans un callback. On relit
// toujours GET /v2/deposits/{id} avec notre jeton (cf. getDeposit).

const BASE = { sandbox: 'https://api.sandbox.pawapay.io', production: 'https://api.pawapay.io' } as const
const TIMEOUT_MS = 10_000

/** Pays des paiements (ISO 3166-1 alpha-3) : la page ne propose que MTN et Airtel Congo. */
export const PAWAPAY_COUNTRY = 'COG'

export interface PawapayConfig {
  token: string
  base: string
  sandbox: boolean
}

export function getPawapayConfig(): PawapayConfig | null {
  const env = getCloudflareContext().env
  const token = env.PAWAPAY_API_TOKEN
  if (!token) return null
  const production = env.PAWAPAY_ENV === 'production'
  return { token, base: production ? BASE.production : BASE.sandbox, sandbox: !production }
}

async function call(cfg: PawapayConfig, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${cfg.base}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json', ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
}

export type PaymentPageResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; code: string; message?: string }

/** Crée la session de page de paiement pawaPay (montant fixe, en FCFA). */
export async function createPaymentPage(
  cfg: PawapayConfig,
  input: { depositId: string; amount: number; returnUrl: string; reason: string; customerMessage: string },
): Promise<PaymentPageResult> {
  let res: Response
  try {
    res = await call(cfg, '/v2/paymentpage', {
      method: 'POST',
      body: JSON.stringify({
        depositId: input.depositId,
        returnUrl: input.returnUrl,
        customerMessage: input.customerMessage,
        amountDetails: { amount: String(input.amount), currency: 'XAF' },
        country: PAWAPAY_COUNTRY,
        reason: input.reason.slice(0, 50),
        language: 'FR',
      }),
    })
  } catch (err) {
    console.error('[pawapay] page de paiement injoignable', err)
    return { ok: false, code: 'NETWORK_ERROR' }
  }
  const body = (await res.json().catch(() => null)) as
    | { redirectUrl?: string; status?: string; failureReason?: { failureCode?: string; failureMessage?: string } }
    | null
  if (res.ok && body?.redirectUrl) return { ok: true, redirectUrl: body.redirectUrl }
  const code = body?.failureReason?.failureCode ?? `HTTP_${res.status}`
  console.error('[pawapay] page de paiement refusée', res.status, code, body?.failureReason?.failureMessage)
  return { ok: false, code, message: body?.failureReason?.failureMessage }
}

const PENDING = new Set(['ACCEPTED', 'PROCESSING', 'IN_RECONCILIATION', 'SUBMITTED', 'ENQUEUED'])

/**
 * Statut d'un dépôt, lu chez pawaPay. null : pawaPay injoignable ou réponse
 * illisible (on réessaiera). NOT_FOUND = PENDING : la page de paiement crée le
 * dépôt seulement quand le client valide son numéro.
 */
export async function getDeposit(cfg: PawapayConfig, depositId: string): Promise<DepositOutcome | null> {
  try {
    const res = await call(cfg, `/v2/deposits/${encodeURIComponent(depositId)}`)
    if (!res.ok) {
      console.error('[pawapay] lecture du dépôt', res.status)
      return null
    }
    const body = (await res.json()) as {
      status?: string
      data?: {
        status?: string
        amount?: string
        currency?: string
        payer?: { accountDetails?: { phoneNumber?: string; provider?: string } }
        providerTransactionId?: string
        failureReason?: { failureCode?: string }
      }
    }
    if (body.status === 'NOT_FOUND' || !body.data) return { status: 'PENDING' }
    const d = body.data
    const status = d.status === 'COMPLETED' ? 'COMPLETED' : d.status === 'FAILED' ? 'FAILED' : PENDING.has(d.status ?? '') ? 'PENDING' : null
    if (!status) {
      console.error('[pawapay] statut de dépôt inconnu', d.status)
      return { status: 'PENDING' }
    }
    return {
      status,
      amount: d.amount,
      currency: d.currency,
      provider: d.payer?.accountDetails?.provider,
      phoneNumber: d.payer?.accountDetails?.phoneNumber,
      providerTransactionId: d.providerTransactionId,
      failureCode: d.failureReason?.failureCode,
    }
  } catch (err) {
    console.error('[pawapay] dépôt injoignable', err)
    return null
  }
}
