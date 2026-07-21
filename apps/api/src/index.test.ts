import { describe, it, expect } from 'vitest'
import worker, { type Env } from './index'

// La logique createLink (D1 + KV) est testée en base réelle dans @link/db. Ici on
// couvre la coquille HTTP : auth, routage, parsing, codes d'erreur sans toucher D1.
// Le chemin nominal est validé par un smoke test sur le Worker déployé.

const TOKEN = 'test-token-123'
const env = { ADMIN_TOKEN: TOKEN } as Env

function req(method: string, path: string, opts: { body?: string; token?: string | null } = {}): Promise<Response> {
  const headers: Record<string, string> = {}
  const token = opts.token === undefined ? TOKEN : opts.token
  if (token) headers.authorization = `Bearer ${token}`
  const init: RequestInit = { method, headers }
  if (opts.body !== undefined) init.body = opts.body
  return worker.fetch(new Request(`https://api.link.cg${path}`, init), env)
}

describe('auth', () => {
  it('sans jeton → 401', async () => {
    const res = await req('POST', '/links', { token: null, body: '{}' })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })

  it('mauvais jeton → 401', async () => {
    expect((await req('POST', '/links', { token: 'faux', body: '{}' })).status).toBe(401)
  })

  it('ADMIN_TOKEN non configuré → 503 (fail-closed)', async () => {
    const res = await worker.fetch(
      new Request('https://api.link.cg/links', { method: 'POST', headers: { authorization: 'Bearer x' }, body: '{}' }),
      {} as Env,
    )
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'auth_not_configured' })
  })
})

describe('api routing (authentifié)', () => {
  it('route inconnue → 404 JSON', async () => {
    const res = await req('GET', '/autre')
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toEqual({ error: 'not_found' })
  })

  it('GET /links (mauvaise méthode) → 404', async () => {
    expect((await req('GET', '/links')).status).toBe(404)
  })

  it('POST /links avec corps non-JSON → 400', async () => {
    const res = await req('POST', '/links', { body: 'pas du json {' })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_json' })
  })
})
