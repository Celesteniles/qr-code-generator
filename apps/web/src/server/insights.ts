import { describeVisitor, type DeviceType } from '@link/shared'

// Statistiques détaillées d'un lien : fonctions PURES d'agrégation (lignes brutes
// renvoyées par l'API SQL d'Analytics Engine → résultats affichables). Aucune E/S
// ici : les requêtes vivent dans scans.ts. Ce module se vérifie avec des lignes
// d'exemple, sans jeton.
//
// Honnêteté : on ne décrit que ce que les données disent. Le navigateur intégré de
// WhatsApp ne se déclare pas dans son user-agent : il n'est donc jamais « détecté ».

/** Ligne « clé → visites » (GROUP BY sur une colonne). */
export interface KeyRow { k: unknown; v: unknown }
/** Ligne « jour de la semaine × heure » en UTC (toDayOfWeek : 1 = lundi … 7 = dimanche). */
export interface MomentRow { d: unknown; h: unknown; v: unknown }

export interface Share {
  key: string
  label: string
  visits: number
  /** Part de 0 à 1 (par rapport au total indiqué pour la liste). */
  share: number
  /** Drapeau emoji (pays uniquement). */
  flag?: string
}

export interface Channel {
  qr: number
  link: number
  /** Visites enregistrées avant la distinction scan / clic. */
  unknown: number
}

export interface Peak {
  /** 0 = lundi … 6 = dimanche */
  day: number
  /** Heure de début (heure de Brazzaville) */
  from: number
  /** Heure de fin, exclue (from + 3, jusqu'à 24) */
  to: number
  visits: number
}

export interface LinkInsights {
  days: number
  /** Visites humaines sur la période (robots exclus). */
  total: number
  countries: Share[]
  cities: Share[]
  /** Visites dont la ville est connue. */
  citiesKnown: number
  devices: Share[]
  systems: Share[]
  browsers: Share[]
  apps: Share[]
  /** Visites couvertes par l'analyse des appareils (les ~300 user-agents les plus fréquents). */
  analyzed: number
  sources: Share[]
  channel: Channel
  /** 7 lignes (lundi → dimanche) × 24 heures, heure de Brazzaville. */
  moments: number[][]
  peak: Peak | null
}

export interface WorkspaceInsights {
  days: number
  total: number
  topCountry: Share | null
  /** Part des visites sur téléphone (0 à 1), null si inconnue. */
  mobileShare: number | null
  topSystem: Share | null
  /** Part des scans de QR parmi les visites dont le canal est connu, null si aucun canal connu. */
  qrShare: number | null
}

/** En dessous, on montre les listes sans en tirer de conclusion. */
export const MIN_VISITS_FOR_TRENDS = 20

/** Congo-Brazzaville : UTC+1 toute l'année (pas d'heure d'été). */
export const BRAZZAVILLE_UTC_OFFSET = 1

export const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const

export const DIRECT_LABEL = 'Direct ou QR (WhatsApp, SMS, e-mail…)'

const num = (x: unknown) => {
  const n = Number(x)
  return Number.isFinite(n) && n > 0 ? n : 0
}
const str = (x: unknown) => (typeof x === 'string' ? x : x == null ? '' : String(x))

/** Trie par visites décroissantes (puis libellé) et calcule les parts. */
function toShares(map: Map<string, { label: string; visits: number; flag?: string }>, total: number): Share[] {
  const denom = total > 0 ? total : 1
  return [...map.entries()]
    .filter(([, e]) => e.visits > 0)
    .sort((a, b) => b[1].visits - a[1].visits || a[1].label.localeCompare(b[1].label, 'fr'))
    .map(([key, e]) => ({ key, label: e.label, visits: e.visits, share: e.visits / denom, ...(e.flag ? { flag: e.flag } : {}) }))
}

function add(map: Map<string, { label: string; visits: number; flag?: string }>, key: string, label: string, visits: number, flag?: string) {
  const e = map.get(key)
  if (e) e.visits += visits
  else map.set(key, { label, visits, ...(flag ? { flag } : {}) })
}

// ── Pays ─────────────────────────────────────────────────────────────────────

let regionNames: Intl.DisplayNames | null | undefined
function regionName(code: string): string | null {
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames('fr', { type: 'region' })
    } catch {
      regionNames = null
    }
  }
  try {
    const name = regionNames?.of(code)
    return name && name !== code ? name : null
  } catch {
    return null
  }
}

/** Drapeau emoji depuis un code ISO-2 (« CG » → 🇨🇬). */
export function flagOf(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

/** Nom du pays en français ; « Inconnu » pour XX ou un code non reconnu. */
export function countryLabel(code: string): string {
  if (code === 'T1') return 'Réseau anonyme (Tor)'
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX') return 'Inconnu'
  return regionName(code) ?? 'Inconnu'
}

export function aggregateCountries(rows: KeyRow[], total: number): Share[] {
  const map = new Map<string, { label: string; visits: number; flag?: string }>()
  let listed = 0
  for (const r of rows) {
    const raw = str(r.k).trim().toUpperCase()
    const v = num(r.v)
    listed += v
    const label = countryLabel(raw)
    const key = label === 'Inconnu' ? 'XX' : raw
    add(map, key, label, v, key === 'XX' ? undefined : flagOf(key) || undefined)
  }
  const base = Math.max(total, listed)
  const out = toShares(map, base)
  // « Inconnu » toujours en fin de liste, puis le reste des pays hors top.
  const known = out.filter((s) => s.key !== 'XX')
  const unknown = out.filter((s) => s.key === 'XX')
  const rest = base - listed
  if (rest > 0) known.push({ key: 'autres', label: 'Autres pays', visits: rest, share: rest / base })
  return [...known, ...unknown]
}

export function aggregateCities(rows: KeyRow[], total: number): { cities: Share[]; known: number } {
  const map = new Map<string, { label: string; visits: number }>()
  for (const r of rows) {
    const name = str(r.k).trim()
    if (!name) continue
    add(map, name.toLowerCase(), name, num(r.v))
  }
  const cities = toShares(map, total)
  return { cities, known: cities.reduce((a, c) => a + c.visits, 0) }
}

// ── Appareils ────────────────────────────────────────────────────────────────

export const DEVICE_LABELS: Record<DeviceType, string> = { mobile: 'Mobile', tablet: 'Tablette', desktop: 'Ordinateur' }

export function aggregateUserAgents(rows: KeyRow[]) {
  const devices = new Map<string, { label: string; visits: number }>()
  const systems = new Map<string, { label: string; visits: number }>()
  const browsers = new Map<string, { label: string; visits: number }>()
  const apps = new Map<string, { label: string; visits: number }>()
  let analyzed = 0
  for (const r of rows) {
    const v = num(r.v)
    const ua = str(r.k)
    if (!v || !ua.trim()) continue
    const who = describeVisitor(ua)
    if (who.bot) continue // déjà filtré en SQL ; ceinture et bretelles
    analyzed += v
    add(devices, who.device, DEVICE_LABELS[who.device], v)
    add(systems, who.os, who.os, v)
    const browser = who.browser === 'Navigateur intégré' ? 'Navigateur intégré d’une appli' : who.browser
    add(browsers, browser, browser, v)
    if (who.app) add(apps, who.app, who.app, v)
  }
  return {
    analyzed,
    devices: toShares(devices, analyzed),
    systems: toShares(systems, analyzed),
    browsers: toShares(browsers, analyzed),
    apps: toShares(apps, analyzed),
  }
}

// ── Provenance ───────────────────────────────────────────────────────────────

const SOURCE_NAMES: [RegExp, string][] = [
  [/(^|\.)facebook\.com$|(^|\.)fb\.me$|(^|\.)messenger\.com$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, 'LinkedIn'],
  [/^t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/, 'X (Twitter)'],
  [/(^|\.)youtube\.com$|^youtu\.be$/, 'YouTube'],
  [/(^|\.)google\.[a-z.]+$/, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)snapchat\.com$/, 'Snapchat'],
  [/(^|\.)telegram\.org$|^t\.me$/, 'Telegram'],
  [/(^|\.)whatsapp\.com$|^wa\.me$/, 'WhatsApp (site web)'],
]

/** Domaine lisible d'un referer (« https://l.facebook.com/… » → Facebook). */
export function sourceOf(referer: string): { key: string; label: string } {
  const raw = referer.trim()
  if (!raw) return { key: '', label: DIRECT_LABEL }
  let host = ''
  let app = false
  try {
    const u = new URL(raw)
    host = u.hostname.toLowerCase()
    app = u.protocol === 'android-app:'
  } catch {
    host = raw.toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#:]/)[0] ?? ''
  }
  if (!host) return { key: '?', label: 'Autre provenance' }
  if (app) return { key: `app:${host}`, label: `Appli Android (${host})` }
  host = host.replace(/^(www|m|l|lm|mobile|mbasic)\./, '')
  const named = SOURCE_NAMES.find(([re]) => re.test(host))?.[1]
  return named ? { key: named, label: named } : { key: host, label: host }
}

export function aggregateSources(rows: KeyRow[], total: number): Share[] {
  const map = new Map<string, { label: string; visits: number }>()
  let listed = 0
  for (const r of rows) {
    const v = num(r.v)
    listed += v
    const s = sourceOf(str(r.k))
    add(map, s.key, s.label, v)
  }
  const base = Math.max(total, listed)
  const out = toShares(map, base)
  const rest = base - listed
  if (rest > 0) out.push({ key: 'autres', label: 'Autres sites', visits: rest, share: rest / base })
  return out
}

// ── Canal : scan de QR ou clic ───────────────────────────────────────────────

export function aggregateChannel(rows: KeyRow[]): Channel {
  const c: Channel = { qr: 0, link: 0, unknown: 0 }
  for (const r of rows) {
    const k = str(r.k).trim().toLowerCase()
    const v = num(r.v)
    if (k === 'qr') c.qr += v
    else if (k === 'link') c.link += v
    else c.unknown += v
  }
  return c
}

export const channelTotal = (c: Channel) => c.qr + c.link + c.unknown

// ── Moments forts ────────────────────────────────────────────────────────────

/**
 * Grille 7 × 24 en heure de Brazzaville à partir de lignes (jour, heure) en UTC.
 * Décaler d'une heure fait au plus passer au jour suivant (dimanche → lundi).
 */
export function aggregateMoments(rows: MomentRow[], offsetHours = BRAZZAVILLE_UTC_OFFSET): number[][] {
  const grid = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  for (const r of rows) {
    const d = Math.round(Number(r.d))
    const h = Math.round(Number(r.h))
    const v = num(r.v)
    if (!v || !(d >= 1 && d <= 7) || !(h >= 0 && h <= 23)) continue
    const idx = (d - 1) * 24 + h + offsetHours // index de l'heure dans la semaine
    const w = ((idx % 168) + 168) % 168
    grid[Math.floor(w / 24)][w % 24] += v
  }
  return grid
}

/** Créneau de `width` heures le plus fréquenté (dans une même journée). */
export function peakOf(grid: number[][], width = 3): Peak | null {
  let best: Peak | null = null
  for (let day = 0; day < 7; day++) {
    for (let from = 0; from + width <= 24; from++) {
      let v = 0
      for (let h = from; h < from + width; h++) v += grid[day]?.[h] ?? 0
      if (v > 0 && (!best || v > best.visits)) best = { day, from, to: from + width, visits: v }
    }
  }
  return best
}

export function formatPeak(p: Peak): string {
  return `${DAY_NAMES[p.day]} ${p.from} h–${p.to} h`
}

// ── Assemblage ───────────────────────────────────────────────────────────────

export interface RawInsights {
  countries: KeyRow[]
  cities: KeyRow[]
  userAgents: KeyRow[]
  sources: KeyRow[]
  channel: KeyRow[]
  moments: MomentRow[]
}

export function buildLinkInsights(raw: RawInsights, days: number): LinkInsights {
  const channel = aggregateChannel(raw.channel)
  const total = channelTotal(channel) // la requête « canal » couvre toutes les visites
  const { cities, known } = aggregateCities(raw.cities, total)
  const ua = aggregateUserAgents(raw.userAgents)
  const moments = aggregateMoments(raw.moments)
  return {
    days,
    total,
    countries: aggregateCountries(raw.countries, total),
    cities,
    citiesKnown: known,
    devices: ua.devices,
    systems: ua.systems,
    browsers: ua.browsers,
    apps: ua.apps,
    analyzed: ua.analyzed,
    sources: aggregateSources(raw.sources, total),
    channel,
    moments,
    peak: peakOf(moments),
  }
}

export function buildWorkspaceInsights(
  raw: Pick<RawInsights, 'countries' | 'userAgents' | 'channel'>,
  days: number,
): WorkspaceInsights {
  const channel = aggregateChannel(raw.channel)
  const total = channelTotal(channel)
  const countries = aggregateCountries(raw.countries, total).filter((c) => c.key !== 'XX' && c.key !== 'autres')
  const ua = aggregateUserAgents(raw.userAgents)
  const mobile = ua.devices.find((d) => d.key === 'mobile')
  const known = channel.qr + channel.link
  return {
    days,
    total,
    topCountry: countries[0] ?? null,
    mobileShare: ua.analyzed > 0 ? (mobile?.share ?? 0) : null,
    topSystem: ua.systems.find((s) => s.key !== 'Autre') ?? null,
    qrShare: known > 0 ? channel.qr / known : null,
  }
}
