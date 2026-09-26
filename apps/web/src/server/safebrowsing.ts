import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { UrlChecker } from '@link/db'

// Vérification anti-abus des URLs de destination via Google Safe Browsing, côté
// dashboard (server actions). Même contrat que apps/api/src/safebrowsing.ts : les
// deux Workers ont chacun leur secret, le code est dupliqué plutôt que partagé
// car @link/db ne doit pas dépendre d'un service HTTP externe.
//
// Enjeu : un seul lien de phishing signalé peut faire bloquer link.cg entier par
// Google ou WhatsApp, et casser tous les QR déjà imprimés par les clients.
//
// Sans clé (SAFE_BROWSING_KEY absente) : on laisse passer et on le signale dans
// les logs. On ne SIMULE pas une vérification. Activer la protection :
//   wrangler secret put SAFE_BROWSING_KEY                     (bêta)
//   wrangler secret put SAFE_BROWSING_KEY --env production    (qrcode.cg)

const ENDPOINT = 'https://safebrowsing.googleapis.com/v4/threatMatches:find'
/** Au-delà, on abandonne : un appel bloqué ne doit pas figer le formulaire. */
const TIMEOUT_MS = 5000

export function makeSafeBrowsingChecker(apiKey?: string): UrlChecker | undefined {
  if (!apiKey) {
    console.warn('[safebrowsing] SAFE_BROWSING_KEY absente — vérification désactivée')
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
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
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

/** Vérificateur du Worker courant (clé lue dans les secrets de la requête). */
export function getUrlChecker(): UrlChecker | undefined {
  return makeSafeBrowsingChecker(getCloudflareContext().env.SAFE_BROWSING_KEY)
}
