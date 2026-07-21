import { describe, it, expect } from 'vitest'
import worker, { type Env } from './index'

// La logique createLink (D1 + KV) est testée en base réelle dans @link/db. Ici on
// couvre la coquille HTTP : routage, parsing, codes d'erreur qui ne touchent pas D1.
// Le chemin nominal est validé par un smoke test sur le Worker déployé.

const env = {} as Env

function req(method: string, path: string, body?: string): Promise<Response> {
  const init: RequestInit = { method }
  if (body !== undefined) init.body = body
  return worker.fetch(new Request(`https://api.link.cg${path}`, init), env)
}

describe('api routing', () => {
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
    const res = await req('POST', '/links', 'pas du json {')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_json' })
  })
})
