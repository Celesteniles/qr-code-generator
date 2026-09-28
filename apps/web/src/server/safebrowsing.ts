import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { UrlChecker } from '@link/db'

// Vérification anti-abus des URLs de destination auprès de Google, côté
// dashboard (server actions). Même contrat que apps/api/src/safebrowsing.ts : les
// deux Workers ont chacun leur secret, le code est dupliqué plutôt que partagé
// car @link/db ne doit pas dépendre d'un service HTTP externe.
//
// Enjeu : un seul lien de phishing signalé peut faire bloquer link.cg entier par
// Google ou WhatsApp, et casser tous les QR déjà imprimés par les clients.
//
// Deux services, mêmes listes de menaces :
//   WEB_RISK_KEY       — Google Web Risk (Lookup API), prévu pour un usage
//                        commercial : c'est celui à utiliser pour link.cg.
//   SAFE_BROWSING_KEY  — Google Safe Browsing, réservé par ses conditions à un
//                        usage non commercial ; gardé en repli pendant la bascule.
// Web Risk l'emporte dès que sa clé est posée. Sans aucune clé : on laisse passer
// et on le signale dans les logs. On ne SIMULE pas une vérification.
//   wrangler secret put WEB_RISK_KEY                     (bêta)
//   wrangler secret put WEB_RISK_KEY --env production    (qrcode.cg)

/** Au-delà, on abandonne : un appel bloqué ne doit pas figer le formulaire. */
const TIMEOUT_MS = 5000
const THREATS = ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE']

const WEB_RISK_ENDPOINT = 'https://webrisk.googleapis.com/v1/uris:search'

export function makeWebRiskChecker(apiKey: string): UrlChecker {
  return async (url: string): Promise<boolean> => {
    const q = new URLSearchParams({ uri: url, key: apiKey })
    for (const t of THREATS) q.append('threatTypes', t)
    try {
      const res = await fetch(`${WEB_RISK_ENDPOINT}?${q}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
      // En cas d'erreur API (clé refusée, quota…), on refuse par prudence.
      if (!res.ok) {
        console.error('[webrisk] API erreur', res.status)
        return false
      }
      // Réponse vide ({}) = aucune menace connue ; `threat` présent = URL listée.
      const data = (await res.json()) as { threat?: unknown }
      return !data.threat
    } catch (e) {
      console.error('[webrisk] vérification impossible', e)
      return false
    }
  }
}

const ENDPOINT = 'https://safebrowsing.googleapis.com/v4/threatMatches:find'

export function makeSafeBrowsingChecker(apiKey?: string): UrlChecker | undefined {
  if (!apiKey) {
    console.warn('[safebrowsing] ni WEB_RISK_KEY ni SAFE_BROWSING_KEY — vérification désactivée')
    return undefined
  }

  return async (url: string): Promise<boolean> => {
    try {
      const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
          client: { clientId: 'link-platform', clientVersion: '0.1.0' },
          threatInfo: {
            threatTypes: THREATS,
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }],
          },
        }),
      })
      // En cas d'erreur API, on refuse par prudence (fail-closed), comme l'API.
      if (!res.ok) {
        console.error('[safebrowsing] API erreur', res.status)
        return false
      }
      const data = (await res.json()) as { matches?: unknown[] }
      // Aucune correspondance de menace = URL sûre.
      return !data.matches || data.matches.length === 0
    } catch (e) {
      // Réseau coupé ou délai dépassé : même règle, on refuse.
      console.error('[safebrowsing] vérification impossible', e)
      return false
    }
  }
}

/** Vérificateur du Worker courant : Web Risk si sa clé est posée, sinon Safe Browsing. */
export function getUrlChecker(): UrlChecker | undefined {
  const env = getCloudflareContext().env
  const webRisk = env.WEB_RISK_KEY?.trim()
  return webRisk ? makeWebRiskChecker(webRisk) : makeSafeBrowsingChecker(env.SAFE_BROWSING_KEY)
}
