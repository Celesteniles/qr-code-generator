import { describe, it, expect } from 'vitest'
import worker, { type Env } from './index'
import type { CompiledLink } from '@link/shared'

// Le handler n'utilise que des primitives standard (Request/Response/URL) : on le
// teste sans workerd, avec un KV et un ExecutionContext factices.

function makeEnv(store: Record<string, CompiledLink>): Env {
  return {
    CARD_BASE_URL: 'https://qrcode.cg',
    LINKS: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: async (key: string) => (key in store ? JSON.stringify(store[key]) : null),
    } as any,
  }
}

const waited: Promise<unknown>[] = []
const ctx = { waitUntil: (p: Promise<unknown>) => void waited.push(p), passThroughOnException: () => {} }

function get(url: string, env: Env, ua = 'desktop'): Promise<Response> {
  const req = new Request(url, { headers: { 'user-agent': ua } })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return worker.fetch(req, env, ctx as any)
}

describe('router fetch', () => {
  it('302 no-store vers la destination statique', async () => {
    const env = makeEnv({ 'link.cg:a1': { slug: 'a1', active: true, rule: { type: 'static', url: 'https://dest.cg' } } })
    const res = await get('https://link.cg/a1', env)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://dest.cg')
    expect(res.headers.get('cache-control')).toContain('no-store')
  })

  it('route app selon le User-Agent', async () => {
    const env = makeEnv({
      'link.cg:app': { slug: 'app', active: true, rule: { type: 'app', ios: 'itms://i', android: 'market://a', fallback: 'https://w' } },
    })
    const ios = await get('https://link.cg/app', env, 'iPhone OS 17')
    expect(ios.headers.get('location')).toBe('itms://i')
  })

  it('carte → page de profil qrcode.cg', async () => {
    const env = makeEnv({ 'link.cg:celeste': { slug: 'celeste', active: true, rule: { type: 'card' } } })
    const res = await get('https://link.cg/celeste', env)
    expect(res.headers.get('location')).toBe('https://qrcode.cg/c/celeste')
  })

  it('slug inconnu → 404', async () => {
    const res = await get('https://link.cg/nope', makeEnv({}))
    expect(res.status).toBe(404)
  })

  it('lien expiré → 410', async () => {
    const env = makeEnv({ 'link.cg:old': { slug: 'old', active: true, expiresAt: 1, rule: { type: 'static', url: 'https://x' } } })
    const res = await get('https://link.cg/old', env)
    expect(res.status).toBe(410)
  })

  it('lien inactif → 410', async () => {
    const env = makeEnv({ 'link.cg:off': { slug: 'off', active: false, rule: { type: 'static', url: 'https://x' } } })
    const res = await get('https://link.cg/off', env)
    expect(res.status).toBe(410)
  })

  it('JSON KV corrompu → 404, pas d\'exception', async () => {
    const env: Env = {
      CARD_BASE_URL: 'https://qrcode.cg',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      LINKS: { get: async () => '{ pas du json' } as any,
    }
    const res = await get('https://link.cg/broken', env)
    expect(res.status).toBe(404)
  })

  it('racine → 200 sans redirection', async () => {
    const res = await get('https://link.cg/', makeEnv({}))
    expect(res.status).toBe(200)
  })

  it('résout par hostname (domaine personnalisé)', async () => {
    const env = makeEnv({ 'go.client.cg:promo': { slug: 'promo', active: true, rule: { type: 'static', url: 'https://client.cg' } } })
    const res = await get('https://go.client.cg/promo', env)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://client.cg')
  })

  it('enregistre la ville et le canal (QR « ?q » ou clic), sans toucher à la redirection', async () => {
    const points: { blobs: string[] }[] = []
    const env: Env = {
      ...makeEnv({ 'link.cg:m1': { slug: 'm1', active: true, rule: { type: 'static', url: 'https://menu.cg/carte' } } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      SCANS: { writeDataPoint: (p: any) => void points.push(p) } as any,
    }
    const scan = new Request('https://link.cg/m1?q', { headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 13) Mobile' } })
    Object.assign(scan, { cf: { country: 'CG', city: 'Brazzaville' } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await worker.fetch(scan, env, ctx as any)
    expect(res.status).toBe(302)
    // La marque « ?q » n'est jamais transmise à la destination
    expect(res.headers.get('location')).toBe('https://menu.cg/carte')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await worker.fetch(new Request('https://link.cg/m1'), env, ctx as any)
    await Promise.all(waited)

    expect(points).toHaveLength(2)
    expect(points[0].blobs).toEqual(['m1', 'redirect', 'CG', 'Mozilla/5.0 (Linux; Android 13) Mobile', '', 'Brazzaville', 'qr'])
    // Sans métadonnées Cloudflare : pays XX, ville vide ; sans « ?q » : clic
    expect(points[1].blobs.slice(2)).toEqual(['XX', '', '', '', 'link'])
  })
})
