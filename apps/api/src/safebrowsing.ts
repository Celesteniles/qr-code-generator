// Vérification anti-abus des URLs de destination via Google Safe Browsing.
//
// IMPORTANT sur la sécurité : sans clé API configurée, ce module renvoie un
// vérificateur qui laisse tout passer, et le signale. Il ne SIMULE pas une
// vérification. Activer la protection = fournir SAFE_BROWSING_KEY en secret :
//   wrangler secret put SAFE_BROWSING_KEY
// (voir docs/ARCHITECTURE.md §7 — la vérification est un prérequis anti-abus).

import type { UrlChecker } from '@link/db'

const ENDPOINT = 'https://safebrowsing.googleapis.com/v4/threatMatches:find'

export function makeSafeBrowsingChecker(apiKey?: string): UrlChecker | undefined {
  if (!apiKey) {
    console.warn('[safebrowsing] SAFE_BROWSING_KEY absente — vérification désactivée')
    return undefined
  }

  return async (url: string): Promise<boolean> => {
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
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

    // En cas d'erreur réseau/API, on refuse par prudence (fail-closed).
    if (!res.ok) {
      console.error('[safebrowsing] API erreur', res.status)
      return false
    }
    const data = (await res.json()) as { matches?: unknown[] }
    // Aucune correspondance de menace = URL sûre.
    return !data.matches || data.matches.length === 0
  }
}
