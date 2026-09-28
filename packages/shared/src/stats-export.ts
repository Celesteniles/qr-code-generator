// Export CSV des statistiques (paliers avec `statsExport`). Fonctions PURES, sans
// E/S : la lecture d'Analytics Engine vit dans apps/web/src/server/scans.ts, la
// route dans apps/web/src/app/api/stats/export.
//
// Format pensé pour Excel en français : séparateur « ; » (la virgule y est le
// séparateur décimal), UTF-8 avec BOM (sans lui, Excel lit les accents en
// Windows-1252), fins de ligne CRLF. LibreOffice et Google Sheets lisent le même
// fichier.
//
// On n'exporte que ce que le routeur enregistre vraiment et qu'on sait agréger
// par jour : visites humaines (robots exclus), dont scans de QR et clics.

/** Lien exporté, décrit côté serveur (seules ses visites sont lues). */
export interface ExportLink {
  slug: string
  /** Adresse complète, ex. https://link.cg/menu. */
  shortUrl: string
  /** Type en clair (« Lien court », « Carte »…). */
  type: string
  /** Destination en clair. */
  destination: string
}

/** Ligne brute de dailyLinkVisitsSql : adresse, jour, canal, visites. */
export interface DailyLinkRow {
  slug: unknown
  day: unknown
  channel: unknown
  visits: unknown
}

export const STATS_CSV_HEADER = [
  'Date (UTC)',
  'Lien court',
  'Type',
  'Destination',
  'Visites',
  'dont scans de QR',
  'dont clics sur le lien',
] as const

export type CsvValue = string | number

const num = (x: unknown) => {
  const n = Number(x)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Lignes de l'export (sans l'en-tête) : une par lien et par jour ayant au moins
 * une visite, du plus ancien au plus récent puis par adresse. Les lignes d'une
 * adresse absente de `links` sont ignorées (ceinture et bretelles : la requête
 * est déjà bornée à ces adresses). Le total couvre aussi les visites antérieures
 * à la distinction QR / clic : il peut dépasser la somme des deux colonnes.
 */
export function statsExportRows(links: readonly ExportLink[], rows: readonly DailyLinkRow[]): CsvValue[][] {
  const bySlug = new Map(links.map((l) => [l.slug, l]))
  const cells = new Map<string, { day: string; link: ExportLink; visits: number; qr: number; click: number }>()
  for (const r of rows) {
    const link = bySlug.get(String(r.slug ?? ''))
    // `day` arrive sous la forme « AAAA-MM-JJ HH:MM:SS » : les 10 premiers caractères suffisent.
    const day = String(r.day ?? '').slice(0, 10)
    const v = num(r.visits)
    if (!link || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !v) continue
    const key = `${day} ${link.slug}`
    const c = cells.get(key) ?? { day, link, visits: 0, qr: 0, click: 0 }
    const channel = String(r.channel ?? '').trim().toLowerCase()
    c.visits += v
    if (channel === 'qr') c.qr += v
    else if (channel === 'link') c.click += v
    cells.set(key, c)
  }
  return [...cells.values()]
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.link.slug < b.link.slug ? -1 : a.link.slug > b.link.slug ? 1 : 0))
    .map((c) => [c.day, c.link.shortUrl, c.link.type, c.link.destination, Math.round(c.visits), Math.round(c.qr), Math.round(c.click)])
}

/**
 * Une cellule CSV. Guillemets si la valeur contient « ; », « " » ou un retour
 * ligne (guillemets internes doublés). Texte commençant par = + - @ (ou une
 * tabulation) : préfixé d'une apostrophe, sinon Excel l'exécute comme une
 * formule (injection de formule via une destination saisie par l'utilisateur).
 */
export function csvCell(value: CsvValue): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  let s = value
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Document CSV complet : BOM UTF-8, « ; », CRLF, retour ligne final. */
export function toCsv(rows: readonly (readonly CsvValue[])[]): string {
  return '﻿' + rows.map((r) => r.map(csvCell).join(';') + '\r\n').join('')
}

/** CSV de l'export, en-tête compris. */
export function statsExportCsv(links: readonly ExportLink[], rows: readonly DailyLinkRow[]): string {
  return toCsv([[...STATS_CSV_HEADER], ...statsExportRows(links, rows)])
}

/** Nom du fichier : « link-cg-statistiques-30j-2026-09-28.csv » (ou « …-menu-30j-… » pour un lien). */
export function statsExportFilename(today: string, days: number, slug?: string): string {
  const one = slug ? `-${slug.replace(/[^a-zA-Z0-9_-]/g, '')}` : ''
  return `link-cg-statistiques${one}-${days}j-${today}.csv`
}
