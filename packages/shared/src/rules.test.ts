import { describe, it, expect } from 'vitest'
import {
  resolveApp, resolveLink, linkKey,
  type AppRule, type CompiledLink, type ResolveContext,
} from './rules'
import { ruleSchema, compiledLinkSchema } from './schemas'

const ctx: ResolveContext = {
  userAgent: 'Mozilla/5.0 (desktop)',
  cardBaseUrl: 'https://qrcode.cg',
}
const NOW = 1_700_000_000_000

const ios = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 8)'

describe('resolveApp', () => {
  const rule: AppRule = { type: 'app', ios: 'itms://ios', android: 'market://android', fallback: 'https://web' }
  it('iOS → App Store', () => expect(resolveApp(ios, rule)).toBe('itms://ios'))
  it('Android → Play Store', () => expect(resolveApp(android, rule)).toBe('market://android'))
  it('desktop → fallback', () => expect(resolveApp('Mozilla/5.0 (Macintosh)', rule)).toBe('https://web'))
  it('iPad compte comme iOS', () =>
    expect(resolveApp('Mozilla/5.0 (iPad; CPU OS 17_0)', rule)).toBe('itms://ios'))
  it('champ plateforme absent → fallback', () =>
    expect(resolveApp(ios, { type: 'app', fallback: 'https://web' })).toBe('https://web'))
})

describe('resolveLink', () => {
  it('règle statique', () => {
    const link: CompiledLink = { slug: 'a1', rule: { type: 'static', url: 'https://dest.cg' }, active: true }
    expect(resolveLink(link, ctx, NOW)).toEqual({ kind: 'redirect', url: 'https://dest.cg' })
  })

  it('règle app selon le UA', () => {
    const link: CompiledLink = {
      slug: 'a2', active: true,
      rule: { type: 'app', ios: 'itms://ios', android: 'market://a', fallback: 'https://web' },
    }
    expect(resolveLink(link, { ...ctx, userAgent: android }, NOW)).toEqual({ kind: 'redirect', url: 'market://a' })
  })

  it('règle carte → page de profil sur qrcode.cg', () => {
    const link: CompiledLink = { slug: 'celeste', rule: { type: 'card' }, active: true }
    expect(resolveLink(link, ctx, NOW)).toEqual({ kind: 'redirect', url: 'https://qrcode.cg/c/celeste' })
  })

  it('lien inactif', () => {
    const link: CompiledLink = { slug: 'a3', rule: { type: 'static', url: 'https://x' }, active: false }
    expect(resolveLink(link, ctx, NOW)).toEqual({ kind: 'inactive' })
  })

  it('lien expiré (now >= expiresAt)', () => {
    const link: CompiledLink = {
      slug: 'a4', active: true, expiresAt: NOW,
      rule: { type: 'static', url: 'https://x' },
    }
    expect(resolveLink(link, ctx, NOW)).toEqual({ kind: 'expired' })
  })

  it('lien encore valide juste avant expiration', () => {
    const link: CompiledLink = {
      slug: 'a5', active: true, expiresAt: NOW + 1,
      rule: { type: 'static', url: 'https://x' },
    }
    expect(resolveLink(link, ctx, NOW)).toEqual({ kind: 'redirect', url: 'https://x' })
  })
})

describe('linkKey', () => {
  it('compose hostname:slug', () => expect(linkKey('link.cg', 'a1b2')).toBe('link.cg:a1b2'))
})

describe('schémas', () => {
  it('accepte une règle statique valide', () => {
    expect(ruleSchema.safeParse({ type: 'static', url: 'https://ok.cg' }).success).toBe(true)
  })
  it('rejette une URL non http', () => {
    expect(ruleSchema.safeParse({ type: 'static', url: 'javascript:alert(1)' }).success).toBe(false)
  })
  it('rejette un type inconnu', () => {
    expect(ruleSchema.safeParse({ type: 'wormhole', url: 'https://x' }).success).toBe(false)
  })
  it('valide un lien compilé complet', () => {
    const parsed = compiledLinkSchema.safeParse({
      slug: 'a1', active: true, rule: { type: 'card' },
    })
    expect(parsed.success).toBe(true)
  })
})
