// Classement des visiteurs d'un lien court, à partir de leur user-agent.
// Partagé entre le routeur (enregistrement) et le dashboard (statistiques).
//
// Robots : quand un lien est collé dans WhatsApp, Facebook, Telegram, iMessage…
// ces services visitent l'adresse pour fabriquer l'aperçu. Ce ne sont pas des
// visites : on les exclut des statistiques. La liste est tenue en motifs SQL LIKE
// (insensibles à la casse) pour servir telle quelle dans les requêtes Analytics
// Engine ET, convertie en expression régulière, dans le code.

export const BOT_UA_PATTERNS: readonly string[] = [
  '%bot%', // Googlebot, bingbot, Twitterbot, TelegramBot, Slackbot, Discordbot, LinkedInBot, Facebot…
  '%crawler%',
  '%spider%',
  '%facebookexternalhit%', // aperçus Facebook, Messenger, iMessage
  'whatsapp/%', // aperçus WhatsApp (le navigateur intégré, lui, ne s'annonce pas ainsi)
  '%skypeuripreview%',
  '%preview%',
  '%headlesschrome%',
  'curl/%',
  'wget/%',
  'python-%',
  'go-http-client%',
  'okhttp%',
  'node-fetch%',
  'axios/%',
]

function likeToRegExp(pattern: string): RegExp {
  const body = pattern
    .split('%')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${body}$`, 'i')
}
const BOT_REGEXPS = BOT_UA_PATTERNS.map(likeToRegExp)

/** true si le user-agent est celui d'un robot (ou absent). */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  const s = (ua ?? '').trim()
  if (!s) return true
  return BOT_REGEXPS.some((re) => re.test(s))
}

/**
 * Condition SQL (Analytics Engine) qui écarte les robots : à ajouter au WHERE.
 * `column` = colonne du user-agent (blob4 dans link_scans).
 */
export function humanVisitSql(column = 'blob4'): string {
  const parts = BOT_UA_PATTERNS.map((p) => `${column} NOT ILIKE '${p.replace(/'/g, "''")}'`)
  return `(${column} != '' AND ${parts.join(' AND ')})`
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export interface Visitor {
  bot: boolean
  device: DeviceType
  /** Android, iOS, KaiOS, Windows, macOS, ChromeOS, Linux, Autre */
  os: string
  /** Chrome, Safari, Samsung Internet, Opera Mini, Opera, UC Browser, Firefox, Edge, Navigateur intégré, Autre */
  browser: string
  /** Application dans laquelle le lien a été ouvert (Facebook, Instagram, TikTok…), si elle se déclare. */
  app: string | null
}

const APPS: [RegExp, string][] = [
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, 'Facebook'],
  [/musical_ly|BytedanceWebview|TikTok/i, 'TikTok'],
  [/Snapchat/i, 'Snapchat'],
  [/LinkedInApp/i, 'LinkedIn'],
  [/Twitter for|TwitterAndroid/i, 'X (Twitter)'],
  [/\bLine\//i, 'LINE'],
]

function osOf(ua: string): string {
  if (/KAIOS/i.test(ua)) return 'KaiOS'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/CrOS/i.test(ua)) return 'ChromeOS'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS'
  if (/Linux/i.test(ua)) return 'Linux'
  return 'Autre'
}

function deviceOf(ua: string, os: string): DeviceType {
  // Opera Mini et KaiOS : toujours des téléphones (Opera Mini n'annonce pas « Mobile »)
  if (/Opera Mini|KAIOS/i.test(ua)) return 'mobile'
  if (/iPad|Tablet/i.test(ua)) return 'tablet'
  if (os === 'Android' && !/Mobile/i.test(ua)) return 'tablet'
  if (/Mobi|iPhone|iPod|Android|KAIOS|Opera Mini/i.test(ua)) return 'mobile'
  return 'desktop'
}

function browserOf(ua: string, app: string | null): string {
  if (/Opera Mini|OPiOS/i.test(ua)) return 'Opera Mini'
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet'
  if (/UCBrowser|UCWEB/i.test(ua)) return 'UC Browser'
  if (/OPR\/|Opera/i.test(ua)) return 'Opera'
  if (/Edg(e|A|iOS)?\//i.test(ua)) return 'Edge'
  if (/Firefox|FxiOS/i.test(ua)) return 'Firefox'
  if (app) return 'Navigateur intégré'
  if (/; wv\)/i.test(ua)) return 'Navigateur intégré' // WebView Android d'une application
  if (/Chrome|CriOS|Chromium/i.test(ua)) return 'Chrome'
  if (/Safari/i.test(ua)) return 'Safari'
  return 'Autre'
}

/** Décrit un visiteur à partir de son user-agent. */
export function describeVisitor(ua: string | null | undefined): Visitor {
  const s = (ua ?? '').trim()
  const app = APPS.find(([re]) => re.test(s))?.[1] ?? null
  const os = osOf(s)
  return {
    bot: isBotUserAgent(s),
    device: deviceOf(s, os),
    os,
    browser: browserOf(s, app),
    app,
  }
}
