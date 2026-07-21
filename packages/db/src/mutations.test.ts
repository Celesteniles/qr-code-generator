import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import { createLink, type Db, type KVWriter } from './mutations'

// Base SQLite en mémoire (asynchrone, comme D1) avec la migration réelle appliquée.
function freshDb(): Db {
  const client = createClient({ url: ':memory:' })
  const migDir = join(__dirname, '..', 'migrations')
  const file = readdirSync(migDir).find((f) => f.endsWith('.sql'))!
  const sql = readFileSync(join(migDir, file), 'utf8')
  for (const stmt of sql.split('--> statement-breakpoint')) {
    const s = stmt.trim()
    if (s) client.execute(s)
  }
  return drizzle(client, { schema }) as unknown as Db
}

function fakeKv(): KVWriter & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return { store, put: async (k, v) => void store.set(k, v) }
}

async function seedDomain(db: Db, hostname = 'link.cg') {
  await db.insert(schema.workspaces).values({ id: 'ws_1', name: 'NS', plan: 'free', createdAt: 0 })
  await db.insert(schema.domains).values({ id: 'dom_1', workspaceId: 'ws_1', hostname, verified: true, isDefault: true })
}

let db: Db
beforeEach(async () => { db = freshDb(); await seedDomain(db) })

const base = { workspaceId: 'ws_1', domainId: 'dom_1', newIdCounter: 0 }
const deps = (kv: KVWriter, extra = {}) => ({ db, kv, newId: () => 'lnk_fixed', now: () => 1000, ...extra })

describe('createLink', () => {
  it('insère en D1 et propage vers KV', async () => {
    const kv = fakeKv()
    const res = await createLink(deps(kv), { ...base, slug: 'promo', rule: { type: 'static', url: 'https://qrcode.cg' } })
    expect(res).toEqual({ ok: true, id: 'lnk_fixed', key: 'link.cg:promo' })

    // D1 contient la ligne
    const rows = await db.query.links.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0].slug).toBe('promo')

    // KV contient la valeur compilée
    expect(JSON.parse(kv.store.get('link.cg:promo')!)).toEqual({
      slug: 'promo', active: true, rule: { type: 'static', url: 'https://qrcode.cg' },
    })
  })

  it('rejette un slug déjà pris sur le domaine', async () => {
    const kv = fakeKv()
    const input = { ...base, slug: 'dup', rule: { type: 'static' as const, url: 'https://a.cg' } }
    await createLink(deps(kv, { newId: () => 'id1' }), input)
    const res = await createLink(deps(kv, { newId: () => 'id2' }), input)
    expect(res).toEqual({ ok: false, error: 'slug_taken' })
  })

  it('rejette un domaine inexistant', async () => {
    const res = await createLink(deps(fakeKv()), { ...base, domainId: 'nope', slug: 'x', rule: { type: 'static', url: 'https://a.cg' } })
    expect(res).toEqual({ ok: false, error: 'domain_not_found' })
  })

  it('rejette une entrée invalide (slug avec espace)', async () => {
    const res = await createLink(deps(fakeKv()), { ...base, slug: 'a b', rule: { type: 'static', url: 'https://a.cg' } })
    expect(res.ok).toBe(false)
    if (!res.ok && res.error === 'invalid') expect(res.issues.length).toBeGreaterThan(0)
  })

  it('bloque une URL jugée dangereuse et n\'écrit rien', async () => {
    const kv = fakeKv()
    const res = await createLink(
      deps(kv, { checkUrl: async () => false }),
      { ...base, slug: 'bad', rule: { type: 'static', url: 'https://malware.example' } },
    )
    expect(res).toEqual({ ok: false, error: 'unsafe_url', url: 'https://malware.example' })
    const rows = await db.query.links.findMany()
    expect(rows).toHaveLength(0)
    expect(kv.store.size).toBe(0)
  })

  it('vérifie toutes les URLs d\'une règle app', async () => {
    const checked: string[] = []
    await createLink(
      deps(fakeKv(), { checkUrl: async (u: string) => { checked.push(u); return true } }),
      { ...base, slug: 'app', rule: { type: 'app', ios: 'https://i', android: 'https://a', fallback: 'https://f' } },
    )
    expect(checked).toEqual(['https://i', 'https://a', 'https://f'])
  })
})
