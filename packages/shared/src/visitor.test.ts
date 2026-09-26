import { describe, expect, it } from 'vitest'
import { BOT_UA_PATTERNS, describeVisitor, humanVisitSql, isBotUserAgent } from './visitor'

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  androidChrome: 'Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 12; SM-A125F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36',
  operaMini: 'Opera/9.80 (Android; Opera Mini/7.6.40234/191.249; U; fr) Presto/2.12.423 Version/12.16',
  kaios: 'Mozilla/5.0 (Mobile; LYF/F300B/LYF-F300B-001-01-15-130718-i;Android; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5',
  facebookInApp: 'Mozilla/5.0 (Linux; Android 12; TECNO KG5) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.0;]',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 309.0.0.0',
  androidWebView: 'Mozilla/5.0 (Linux; Android 11; itel A571W; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  androidTablet: 'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  windowsEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
  whatsappPreview: 'WhatsApp/2.23.20.0 A',
  facebookPreview: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  telegram: 'TelegramBot (like TwitterBot)',
  imessage: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  curl: 'curl/8.4.0',
}

describe('isBotUserAgent', () => {
  it('reconnaît les aperçus de lien et les robots', () => {
    for (const ua of [UA.whatsappPreview, UA.facebookPreview, UA.telegram, UA.imessage, UA.googlebot, UA.curl, '', '   ']) {
      expect(isBotUserAgent(ua), ua).toBe(true)
    }
  })
  it('ne classe pas les vrais visiteurs comme robots', () => {
    for (const ua of [UA.iphoneSafari, UA.androidChrome, UA.samsung, UA.operaMini, UA.kaios, UA.facebookInApp, UA.instagram, UA.androidWebView, UA.macChrome]) {
      expect(isBotUserAgent(ua), ua).toBe(false)
    }
  })
})

describe('describeVisitor', () => {
  it('appareil et système', () => {
    expect(describeVisitor(UA.iphoneSafari)).toMatchObject({ device: 'mobile', os: 'iOS', browser: 'Safari', app: null })
    expect(describeVisitor(UA.androidChrome)).toMatchObject({ device: 'mobile', os: 'Android', browser: 'Chrome' })
    expect(describeVisitor(UA.ipad)).toMatchObject({ device: 'tablet', os: 'iOS' })
    expect(describeVisitor(UA.androidTablet)).toMatchObject({ device: 'tablet', os: 'Android' })
    expect(describeVisitor(UA.macChrome)).toMatchObject({ device: 'desktop', os: 'macOS', browser: 'Chrome' })
    expect(describeVisitor(UA.windowsEdge)).toMatchObject({ device: 'desktop', os: 'Windows', browser: 'Edge' })
    expect(describeVisitor(UA.kaios)).toMatchObject({ device: 'mobile', os: 'KaiOS' })
  })
  it('navigateurs courants en Afrique centrale', () => {
    expect(describeVisitor(UA.samsung).browser).toBe('Samsung Internet')
    expect(describeVisitor(UA.operaMini)).toMatchObject({ browser: 'Opera Mini', device: 'mobile' })
  })
  it('applications qui se déclarent', () => {
    expect(describeVisitor(UA.facebookInApp)).toMatchObject({ app: 'Facebook', browser: 'Navigateur intégré', os: 'Android' })
    expect(describeVisitor(UA.instagram)).toMatchObject({ app: 'Instagram', os: 'iOS' })
    expect(describeVisitor(UA.androidWebView)).toMatchObject({ app: null, browser: 'Navigateur intégré' })
  })
})

describe('humanVisitSql', () => {
  it('reprend chaque motif et échappe les apostrophes', () => {
    const sql = humanVisitSql()
    expect(sql).toContain("blob4 != ''")
    for (const p of BOT_UA_PATTERNS) expect(sql).toContain(`blob4 NOT ILIKE '${p}'`)
    expect(humanVisitSql("x'y")).toContain("x'y NOT ILIKE")
  })
  it('la version SQL et la version code s’accordent sur les motifs', () => {
    // Un motif SQL ajouté doit être reconnu côté code (et inversement).
    expect(isBotUserAgent('Something-Crawler/1.0')).toBe(true)
    expect(isBotUserAgent('Mozilla/5.0 LinkPreview/2')).toBe(true)
  })
})
