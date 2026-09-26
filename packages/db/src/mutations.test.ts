import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import { takenSlugs } from './queries'
import { createLink, setLinkActive, deleteLink, updateLinkRule, type Db, type KVWriter } from './mutations'

// Base SQLite en mémoire (asynchrone, comme D1) avec la migration réelle appliquée.
function freshDb(): Db {
  const client = createClient({ url: ':memory:' })
  const migDir = join(__dirname, '..', 'migrations')
  const file = readdirSync(migDir).find((f) => f.endsWith('.sql'))!
  const sql = readFileSync(join(migDir, file), 'utf8')
  // Comme D1 : les clés étrangères sont appliquées.
  client.execute('PRAGMA foreign_keys = ON')
  for (const stmt of sql.split('--> statement-breakpoint')) {
    const s = stmt.trim()
    if (s) client.execute(s)
  }
  return drizzle(client, { schema }) as unknown as Db
}

function fakeKv(): KVWriter & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    put: async (k, v) => void store.set(k, v),
    delete: async (k) => void store.delete(k),
  }
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

describe('setLinkActive', () => {
  it('désactive : D1 à jour, KV conserve la clé avec active=false', async () => {
    const kv = fakeKv()
    await createLink(deps(kv, { newId: () => 'lid' }), { ...base, slug: 's', rule: { type: 'static', url: 'https://a.cg' } })
    const res = await setLinkActive({ db, kv, now: () => 2000 }, 'lid', false)
    expect(res).toEqual({ ok: true, key: 'link.cg:s' })
    expect(JSON.parse(kv.store.get('link.cg:s')!).active).toBe(false)
    const row = await db.query.links.findFirst()
    expect(row!.active).toBe(false)
  })

  it('lien inexistant → not_found', async () => {
    expect(await setLinkActive({ db, kv: fakeKv() }, 'nope', false)).toEqual({ ok: false, error: 'not_found' })
  })
})

describe('deleteLink', () => {
  it('supprime de D1 et retire la clé KV', async () => {
    const kv = fakeKv()
    await createLink(deps(kv, { newId: () => 'lid' }), { ...base, slug: 'gone', rule: { type: 'static', url: 'https://a.cg' } })
    const res = await deleteLink({ db, kv }, 'lid')
    expect(res).toEqual({ ok: true, key: 'link.cg:gone' })
    expect(kv.store.has('link.cg:gone')).toBe(false)
    expect(await db.query.links.findMany()).toHaveLength(0)
  })

  it('supprime aussi le profil de carte et le style du QR (clés étrangères)', async () => {
    const kv = fakeKv()
    await createLink(deps(kv, { newId: () => 'card' }), { ...base, slug: 'ma-carte', rule: { type: 'card' } })
    await db.insert(schema.cardProfiles).values({ id: 'cp', linkId: 'card', fullName: 'Niles' })
    await db.insert(schema.qrDesigns).values({ id: 'qd', linkId: 'card', config: {} })
    await db.insert(schema.linkReviews).values({ linkId: 'card', status: 'clean' })
    expect(await deleteLink({ db, kv }, 'card')).toEqual({ ok: true, key: 'link.cg:ma-carte' })
    expect(await db.query.links.findMany()).toHaveLength(0)
    expect(await db.query.cardProfiles.findMany()).toHaveLength(0)
    expect(await db.query.qrDesigns.findMany()).toHaveLength(0)
    expect(await db.query.linkReviews.findMany()).toHaveLength(0)
  })

  it('lien inexistant → not_found', async () => {
    expect(await deleteLink({ db, kv: fakeKv() }, 'nope')).toEqual({ ok: false, error: 'not_found' })
  })
})

describe('updateLinkRule', () => {
  async function seed(kv: KVWriter, rule: unknown = { type: 'static', url: 'https://a.cg' }) {
    await createLink(deps(kv, { newId: () => 'lid' }), { ...base, slug: 'dest', rule })
  }

  it('change l\'URL : D1 (rule, updatedAt) puis KV', async () => {
    const kv = fakeKv()
    await seed(kv)
    const res = await updateLinkRule({ db, kv, now: () => 5000 }, 'lid', { type: 'static', url: 'https://b.cg' })
    expect(res).toEqual({ ok: true, key: 'link.cg:dest' })
    const row = await db.query.links.findFirst()
    expect(row!.rule).toEqual({ type: 'static', url: 'https://b.cg' })
    expect(row!.updatedAt).toBe(5000)
    expect(JSON.parse(kv.store.get('link.cg:dest')!).rule).toEqual({ type: 'static', url: 'https://b.cg' })
  })

  it('static → app met à jour kind, et inversement', async () => {
    const kv = fakeKv()
    await seed(kv)
    await updateLinkRule({ db, kv }, 'lid', { type: 'app', ios: 'https://i.cg', fallback: 'https://f.cg' })
    expect((await db.query.links.findFirst())!.kind).toBe('app')
    expect(JSON.parse(kv.store.get('link.cg:dest')!).rule.type).toBe('app')
    await updateLinkRule({ db, kv }, 'lid', { type: 'static', url: 'https://s.cg' })
    expect((await db.query.links.findFirst())!.kind).toBe('static')
  })

  it('conserve l\'état inactif en KV', async () => {
    const kv = fakeKv()
    await seed(kv)
    await setLinkActive({ db, kv }, 'lid', false)
    await updateLinkRule({ db, kv }, 'lid', { type: 'static', url: 'https://b.cg' })
    expect(JSON.parse(kv.store.get('link.cg:dest')!).active).toBe(false)
    expect((await db.query.links.findFirst())!.active).toBe(false)
  })

  it('URL dangereuse → unsafe_url, rien n\'est écrit', async () => {
    const kv = fakeKv()
    await seed(kv)
    const before = kv.store.get('link.cg:dest')
    const res = await updateLinkRule({ db, kv, checkUrl: async () => false }, 'lid', { type: 'static', url: 'https://bad.example' })
    expect(res).toEqual({ ok: false, error: 'unsafe_url', url: 'https://bad.example' })
    expect(kv.store.get('link.cg:dest')).toBe(before)
    expect((await db.query.links.findFirst())!.rule).toEqual({ type: 'static', url: 'https://a.cg' })
  })

  it('règle invalide ou card → invalid', async () => {
    const kv = fakeKv()
    await seed(kv)
    const r1 = await updateLinkRule({ db, kv }, 'lid', { type: 'static', url: 'javascript:alert(1)' })
    expect(r1.ok === false && r1.error).toBe('invalid')
    const r2 = await updateLinkRule({ db, kv }, 'lid', { type: 'card' })
    expect(r2.ok === false && r2.error).toBe('invalid')
  })

  it('lien carte → not_editable', async () => {
    const kv = fakeKv()
    await seed(kv, { type: 'card' })
    expect(await updateLinkRule({ db, kv }, 'lid', { type: 'static', url: 'https://b.cg' }))
      .toEqual({ ok: false, error: 'not_editable' })
  })

  it('lien inexistant → not_found', async () => {
    expect(await updateLinkRule({ db, kv: fakeKv() }, 'nope', { type: 'static', url: 'https://b.cg' }))
      .toEqual({ ok: false, error: 'not_found' })
  })
})

describe('takenSlugs', () => {
  it('renvoie uniquement les slugs pris sur le domaine', async () => {
    await createLink(deps(fakeKv(), { newId: () => 'a' }), { ...base, slug: 'pris', rule: { type: 'static', url: 'https://a.cg' } })
    expect(await takenSlugs(db, 'dom_1', ['pris', 'libre'])).toEqual(new Set(['pris']))
    expect(await takenSlugs(db, 'autre', ['pris'])).toEqual(new Set())
    expect(await takenSlugs(db, 'dom_1', [])).toEqual(new Set())
  })
})
