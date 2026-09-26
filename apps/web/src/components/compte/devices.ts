// Présentation lisible des sessions : « Chrome sur macOS », IP masquée, dates
// en français. Fonctions pures, utilisées côté serveur.

export interface DeviceItem {
  id: string
  /** Ex. « Chrome sur macOS ». */
  label: string
  kind: 'phone' | 'tablet' | 'computer'
  current: boolean
  /** Ex. « il y a 5 min ». */
  lastActive: string
  /** Ex. « 12 sept. 2026 ». */
  createdAt: string
  /** IP partiellement masquée, ou null. */
  ip: string | null
}

const TZ = 'Africa/Brazzaville'

function browserOf(ua: string): string | null {
  if (/EdgA?\/|Edg\//.test(ua)) return 'Edge'
  if (/OPR\/|Opera/.test(ua)) return 'Opera'
  if (/SamsungBrowser\//.test(ua)) return 'Samsung Internet'
  if (/FxiOS\/|Firefox\//.test(ua)) return 'Firefox'
  if (/CriOS\/|Chrome\/|Chromium\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari'
  if (/iPhone|iPad/.test(ua)) return 'Safari'
  return null
}

function systemOf(ua: string): { os: string | null; kind: DeviceItem['kind'] } {
  if (/iPhone|iPod/.test(ua)) return { os: 'iPhone', kind: 'phone' }
  if (/iPad/.test(ua)) return { os: 'iPad', kind: 'tablet' }
  if (/Android/.test(ua)) return { os: 'Android', kind: /Mobile/.test(ua) ? 'phone' : 'tablet' }
  if (/Windows/.test(ua)) return { os: 'Windows', kind: 'computer' }
  if (/CrOS/.test(ua)) return { os: 'ChromeOS', kind: 'computer' }
  if (/Mac OS X|Macintosh/.test(ua)) return { os: 'macOS', kind: 'computer' }
  if (/Linux/.test(ua)) return { os: 'Linux', kind: 'computer' }
  return { os: null, kind: 'computer' }
}

/** « Chrome sur macOS », « Safari sur iPhone », ou « Appareil inconnu ». */
export function describeUserAgent(ua: string | null | undefined): { label: string; kind: DeviceItem['kind'] } {
  const s = ua ?? ''
  const browser = /HeadlessChrome/.test(s) ? 'Chrome (automatisé)' : browserOf(s)
  const { os, kind } = systemOf(s)
  if (browser && os) return { label: `${browser} sur ${os}`, kind }
  if (browser) return { label: browser, kind }
  if (os) return { label: `Appareil ${os}`, kind }
  return { label: 'Appareil inconnu', kind }
}

/**
 * Masque la fin de l'adresse IP : « 102.36.•.• », « 2c0f:f4c0:… ». Adresses
 * locales ou vides (serveur de dev, IP inconnue) : null, rien à montrer.
 */
export function maskIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  const v = ip.trim()
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) {
    const [a, b] = v.split('.')
    if (a === '127' || a === '0') return null
    return `${a}.${b}.•.•`
  }
  if (v.includes(':')) {
    // Better Auth enregistre l'IPv6 en forme longue (0000:…) : on retire les zéros de tête.
    const groups = v.split(':').filter(Boolean).map((g) => g.replace(/^0+(?=.)/, ''))
    if (groups.slice(0, -1).every((g) => g === '0') && ['0', '1'].includes(groups.at(-1) ?? '0')) return null // ::, ::1
    return `${groups.slice(0, 2).join(':')}:…`
  }
  return null
}

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto', style: 'short' })

/** « à l'instant », « il y a 5 min », « hier », « il y a 3 j »… */
export function relativeTime(date: Date, now = Date.now()): string {
  const s = Math.round((date.getTime() - now) / 1000)
  const a = Math.abs(s)
  if (a < 60) return 'à l\'instant'
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute')
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour')
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day')
  return rtf.format(Math.round(s / (86400 * 30)), 'month')
}

const dateFmt = new Intl.DateTimeFormat('fr', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })

export function shortDate(date: Date): string {
  return dateFmt.format(date)
}
