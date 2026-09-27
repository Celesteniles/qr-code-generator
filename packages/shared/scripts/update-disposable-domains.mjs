#!/usr/bin/env node
// Régénère src/disposable-domains.generated.ts depuis la liste communautaire
// https://github.com/disposable-email-domains/disposable-email-domains (licence CC0).
//
//   pnpm --filter @link/shared update:disposable
//
// Puis relancer les tests (`pnpm --filter @link/shared test`) et committer le fichier
// généré. Nos exceptions et ajouts locaux vivent dans src/disposable-email.ts, pas ici.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const REPO = 'disposable-email-domains/disposable-email-domains'
const OUT = fileURLToPath(new URL('../src/disposable-domains.generated.ts', import.meta.url))

// Commit précis : le fichier généré dit d'où il vient, la mise à jour est traçable.
const commitRes = await fetch(`https://api.github.com/repos/${REPO}/commits/main`, {
  headers: { accept: 'application/vnd.github+json', 'user-agent': 'link-platform' },
})
if (!commitRes.ok) throw new Error(`GitHub API : ${commitRes.status}`)
const commit = await commitRes.json()
const sha = commit.sha
const date = commit.commit.committer.date.slice(0, 10)

const listRes = await fetch(`https://raw.githubusercontent.com/${REPO}/${sha}/disposable_email_blocklist.conf`)
if (!listRes.ok) throw new Error(`Liste : ${listRes.status}`)
const domains = [...new Set(
  (await listRes.text())
    .split('\n')
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l && !l.startsWith('#') && /^[a-z0-9.-]+\.[a-z0-9-]+$/.test(l)),
)].sort()

// Garde-fou : une liste soudain vide ou minuscule signale un problème en amont.
if (domains.length < 1000) throw new Error(`Liste suspecte : ${domains.length} domaines`)

// Une seule chaîne plutôt qu'un tableau : plus léger à analyser pour le moteur JS,
// le Set est construit au premier appel (cf. disposable-email.ts).
writeFileSync(OUT, `// FICHIER GÉNÉRÉ, ne pas modifier à la main : scripts/update-disposable-domains.mjs
// Source : https://github.com/${REPO} (CC0), commit ${sha.slice(0, 7)} du ${date}.
// ${domains.length} domaines.
export const DISPOSABLE_DOMAINS_SOURCE = '${REPO}@${sha.slice(0, 7)} (${date})'
export const DISPOSABLE_DOMAINS_LIST =
  ${JSON.stringify(domains.join('\n'))}
`)
console.log(`${domains.length} domaines écrits dans ${OUT} (commit ${sha.slice(0, 7)} du ${date})`)
