import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import { createLink, type Db, type KVWriter } from './mutations'
import { listLinks, getLink } from './queries'
import {
  normalizeHostname, addCustomDomain, listWorkspaceDomains, getWorkspaceDomain,
  getWorkspaceDomainByHostname, updateDomainStatus, checkDomainRemoval, removeCustomDomain,
  canManageDomains,
} from './domains'

// Base SQLite en mémoire avec TOUTES les migrations réelles, clés étrangères actives (comme D1).
async function freshDb(): Promise<Db> {
  const client = createClient({ url: ':memory:' })
  await client.execute('PRAGMA foreign_keys = ON')
  const migDir = join(__dirname, '..', 'migrations')
  for (const file of readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(migDir, file), 'utf8')
    for (const stmt of sql.split('--> statement-breakpoint')) {
      const s = stmt.trim()
      if (s) await client.execute(s)
    }
  }
  return drizzle(client, { schema }) as unknown as Db
}

function fakeKv(): KVWriter & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return { store, put: async (k, v) => void store.set(k, v), delete: async (k) => void store.delete(k) }
}

let db: Db
let seq = 0
const deps = () => ({ db, newId: () => `dom_${++seq}`, now: () => 1_700_000_000_000 + seq })

beforeEach(async () => {
  db = await freshDb()
  seq = 0
  // Espace plateforme (propriétaire de link.cg) + deux clients.
  await db.insert(schema.workspaces).values([
    { id: 'ws_ns', name: 'NS', plan: 'enterprise', createdAt: 0 },
    { id: 'ws_a', name: 'Resto A', plan: 'business', createdAt: 0 },
    { id: 'ws_b', name: 'Boutique B', plan: 'business', createdAt: 0 },
  ])
  await db.insert(schema.domains).values({ id: 'dom_linkcg', workspaceId: 'ws_ns', hostname: 'link.cg', verified: true, isDefault: true })
})

describe('normalizeHostname', () => {
  it('normalise la saisie courante', () => {
    expect(normalizeHostname('  Go.MonResto.cg ')).toEqual({ ok: true, hostname: 'go.monresto.cg' })
    expect(normalizeHostname('https://go.monresto.cg/')).toEqual({ ok: true, hostname: 'go.monresto.cg' })
    expect(normalizeHostname('go.monresto.cg.')).toEqual({ ok: true, hostname: 'go.monresto.cg' })
    expect(normalizeHostname('liens.boutique.co.uk')).toEqual({ ok: true, hostname: 'liens.boutique.co.uk' })
    expect(normalizeHostname('go.xn--caf-dma.cg')).toEqual({ ok: true, hostname: 'go.xn--caf-dma.cg' })
  })

  it('exige un sous-domaine', () => {
    expect(normalizeHostname('monresto.cg')).toEqual({ ok: false, error: 'apex' })
    expect(normalizeHostname('localhost')).toEqual({ ok: false, error: 'apex' })
  })

  it('refuse les domaines de la plateforme et leurs sous-domaines', () => {
    for (const h of ['link.cg', 'qrcode.cg', 'go.link.cg', 'beta.qrcode.cg', 'a.b.link.cg', 'LINK.CG']) {
      expect(normalizeHostname(h)).toEqual({ ok: false, error: 'reserved' })
    }
    // Un domaine qui se termine par les mêmes lettres n'est pas un sous-domaine.
    expect(normalizeHostname('go.monlink.cg').ok).toBe(true)
  })

  it('refuse les adresses IP', () => {
    expect(normalizeHostname('192.168.1.10')).toEqual({ ok: false, error: 'ip' })
    expect(normalizeHostname('2001:db8::1')).toEqual({ ok: false, error: 'ip' })
    expect(normalizeHostname('[2001:db8::1]')).toEqual({ ok: false, error: 'ip' })
  })

  it('refuse tout ce qui n\'est pas un nom de domaine strict', () => {
    for (const h of [
      '', ' ', 'go.monresto.cg/promo', 'go.monresto.cg:8080', 'user@go.monresto.cg', 'go_x.monresto.cg',
      '-go.monresto.cg', 'go-.monresto.cg', 'go..monresto.cg', 'go.monresto.123', 'café.monresto.cg',
      'go.monresto.c', 'go monresto.cg', `${'a'.repeat(64)}.monresto.cg`, `${'a.'.repeat(130)}cg`,
      'ftp://go.monresto.cg', '*.monresto.cg', "go.monresto.cg'--",
    ]) {
      expect(normalizeHostname(h), h).toEqual({ ok: false, error: 'invalid' })
    }
  })
})

describe('addCustomDomain', () => {
  it('réserve le domaine, non vérifié, sans identifiant Cloudflare', async () => {
    const res = await addCustomDomain(deps(), { workspaceId: 'ws_a', hostname: 'Go.MonResto.cg', maxDomains: 1 })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.domain).toMatchObject({
      id: 'dom_1', workspaceId: 'ws_a', hostname: 'go.monresto.cg', verified: false, isDefault: false,
      cfHostnameId: null, sslStatus: null,
    })
    expect(res.domain.createdAt).toBeGreaterThan(0)
  })

  it('renvoie l\'erreur de validation sans rien écrire', async () => {
    expect(await addCustomDomain(deps(), { workspaceId: 'ws_a', hostname: 'monresto.cg', maxDomains: 5 }))
      .toEqual({ ok: false, error: 'apex' })
    expect(await addCustomDomain(deps(), { workspaceId: 'ws_a', hostname: 'x.link.cg', maxDomains: 5 }))
      .toEqual({ ok: false, error: 'reserved' })
    expect(await listWorkspaceDomains(db, 'ws_a')).toEqual([])
  })

  it('refuse un domaine déjà pris, dans le même espace ou un autre', async () => {
    await addCustomDomain(deps(), { workspaceId: 'ws_a', hostname: 'go.monresto.cg', maxDomains: 5 })
    expect(await addCustomDomain(deps(), { workspaceId: 'ws_a', hostname: 'GO.monresto.cg', maxDomains: 5 }))
      .toEqual({ ok: false, error: 'taken' })
    expect(await addCustomDomain(deps(), { workspaceId: 'ws_b', hostname: 'go.monresto.cg', maxDomains: 5 }))
      .toEqual({ ok: false, error: 'taken' })
  })

  it('applique le plafond de l\'offre (domaines de la plateforme non comptés)', async () => {
    // L'espace plateforme possède link.cg : il ne compte pas dans son plafond.
    expect((await addCustomDomain(deps(), { workspaceId: 'ws_ns', hostname: 'go.ns.cg', maxDomains: 1 })).ok).toBe(true)

    expect((await addCustomDomain(deps(), { workspaceId: 'ws_a', hostname: 'go.a.cg', maxDomains: 1 })).ok).toBe(true)
    expect(await addCustomDomain(deps(), { workspaceId: 'ws_a', hostname: 'liens.a.cg', maxDomains: 1 }))
      .toEqual({ ok: false, error: 'limit_reached' })
    // Offre sans domaine personnalisé : plafond 0.
    expect(await addCustomDomain(deps(), { workspaceId: 'ws_b', hostname: 'go.b.cg', maxDomains: 0 }))
      .toEqual({ ok: false, error: 'limit_reached' })
  })

  it('deux ajouts simultanés du même domaine : un seul passe', async () => {
    const results = await Promise.all([
      addCustomDomain(deps(), { workspaceId: 'ws_a', hostname: 'go.dup.cg', maxDomains: 5 }),
      addCustomDomain(deps(), { workspaceId: 'ws_b', hostname: 'go.dup.cg', maxDomains: 5 }),
    ])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.find((r) => !r.ok)).toEqual({ ok: false, error: 'taken' })
  })
})

describe('lecture et garde anti-IDOR', () => {
  beforeEach(async () => {
    await addCustomDomain(deps(), { workspaceId: 'ws_a', hostname: 'go.a.cg', maxDomains: 5 })   // dom_1
    await addCustomDomain(deps(), { workspaceId: 'ws_a', hostname: 'liens.a.cg', maxDomains: 5 }) // dom_2
    await addCustomDomain(deps(), { workspaceId: 'ws_b', hostname: 'go.b.cg', maxDomains: 5 })   // dom_3
  })

  it('liste les domaines d\'un espace seulement, du plus ancien au plus récent', async () => {
    expect((await listWorkspaceDomains(db, 'ws_a')).map((d) => d.hostname)).toEqual(['go.a.cg', 'liens.a.cg'])
    expect((await listWorkspaceDomains(db, 'ws_b')).map((d) => d.hostname)).toEqual(['go.b.cg'])
  })

  it('ne liste jamais link.cg, même pour l\'espace qui le possède', async () => {
    expect(await listWorkspaceDomains(db, 'ws_ns')).toEqual([])
    expect(await getWorkspaceDomain(db, 'ws_ns', 'dom_linkcg')).toBeNull()
  })

  it('ne donne pas le domaine d\'un autre espace', async () => {
    expect(await getWorkspaceDomain(db, 'ws_a', 'dom_3')).toBeNull()
    expect(await getWorkspaceDomainByHostname(db, 'ws_a', 'go.b.cg')).toBeNull()
    expect((await getWorkspaceDomainByHostname(db, 'ws_b', 'go.b.cg'))?.id).toBe('dom_3')
  })

  it('met à jour le statut, seulement dans l\'espace propriétaire', async () => {
    expect(await updateDomainStatus(db, 'ws_b', 'dom_1', { verified: true, sslStatus: 'active', cfHostnameId: 'cf_x' })).toBe(false)
    expect((await getWorkspaceDomain(db, 'ws_a', 'dom_1'))?.verified).toBe(false)

    expect(await updateDomainStatus(db, 'ws_a', 'dom_1', { cfHostnameId: 'cf_1', verified: false, sslStatus: 'pending_validation' })).toBe(true)
    expect(await getWorkspaceDomain(db, 'ws_a', 'dom_1')).toMatchObject({ cfHostnameId: 'cf_1', verified: false, sslStatus: 'pending_validation' })

    // cfHostnameId omis : conservé.
    expect(await updateDomainStatus(db, 'ws_a', 'dom_1', { verified: true, sslStatus: 'active' })).toBe(true)
    expect(await getWorkspaceDomain(db, 'ws_a', 'dom_1')).toMatchObject({ cfHostnameId: 'cf_1', verified: true, sslStatus: 'active' })
  })

  it('ne touche jamais link.cg', async () => {
    expect(await updateDomainStatus(db, 'ws_ns', 'dom_linkcg', { verified: false, sslStatus: null })).toBe(false)
    expect(await removeCustomDomain(db, 'ws_ns', 'dom_linkcg')).toEqual({ ok: false, error: 'not_found' })
  })
})

describe('canManageDomains', () => {
  it('propriétaire et administrateur seulement', async () => {
    await db.insert(schema.memberships).values([
      { userId: 'u_owner', workspaceId: 'ws_a', role: 'owner' },
      { userId: 'u_admin', workspaceId: 'ws_a', role: 'admin' },
      { userId: 'u_member', workspaceId: 'ws_a', role: 'member' },
    ])
    expect(await canManageDomains(db, 'u_owner', 'ws_a')).toBe(true)
    expect(await canManageDomains(db, 'u_admin', 'ws_a')).toBe(true)
    expect(await canManageDomains(db, 'u_member', 'ws_a')).toBe(false)
    expect(await canManageDomains(db, 'u_owner', 'ws_b')).toBe(false)
  })
})

describe('liens sur un domaine personnalisé', () => {
  const rule = { type: 'static' as const, url: 'https://monresto.cg/menu' }
  let n = 0
  const linkDeps = (kv: KVWriter) => ({ db, kv, newId: () => `lnk_${++n}`, now: () => 1_700_000_000_000 })

  beforeEach(async () => {
    await addCustomDomain(deps(), { workspaceId: 'ws_a', hostname: 'go.a.cg', maxDomains: 5 }) // dom_1
  })

  it('refuse un domaine pas encore vérifié', async () => {
    const res = await createLink(linkDeps(fakeKv()), { workspaceId: 'ws_a', domainId: 'dom_1', slug: 'menu', rule })
    expect(res).toEqual({ ok: false, error: 'domain_not_verified' })
  })

  it('refuse le domaine d\'un autre espace, même vérifié', async () => {
    await updateDomainStatus(db, 'ws_a', 'dom_1', { verified: true, sslStatus: 'active' })
    const res = await createLink(linkDeps(fakeKv()), { workspaceId: 'ws_b', domainId: 'dom_1', slug: 'menu', rule })
    expect(res).toEqual({ ok: false, error: 'domain_not_found' })
  })

  it('link.cg reste partagé par tous les espaces', async () => {
    const kv = fakeKv()
    const res = await createLink(linkDeps(kv), { workspaceId: 'ws_b', domainId: 'dom_linkcg', slug: 'promo', rule })
    expect(res).toMatchObject({ ok: true, key: 'link.cg:promo' })
  })

  it('propage vers KV sous le hostname du domaine choisi ; listLinks/getLink le donnent', async () => {
    await updateDomainStatus(db, 'ws_a', 'dom_1', { verified: true, sslStatus: 'active' })
    const kv = fakeKv()
    const custom = await createLink(linkDeps(kv), { workspaceId: 'ws_a', domainId: 'dom_1', slug: 'menu', rule })
    expect(custom).toMatchObject({ ok: true, key: 'go.a.cg:menu' })
    // Même adresse sur link.cg : indépendante (unicité par domaine).
    const shared = await createLink(linkDeps(kv), { workspaceId: 'ws_a', domainId: 'dom_linkcg', slug: 'menu', rule })
    expect(shared).toMatchObject({ ok: true, key: 'link.cg:menu' })
    expect([...kv.store.keys()].sort()).toEqual(['go.a.cg:menu', 'link.cg:menu'])

    const links = await listLinks(db, 'ws_a')
    expect(links.map((l) => `${l.hostname}/${l.slug}`).sort()).toEqual(['go.a.cg/menu', 'link.cg/menu'])
    expect(links[0]!.rule).toEqual(rule)
    expect(links[0]!.active).toBe(true)
    if (custom.ok) expect(await getLink(db, custom.id)).toMatchObject({ slug: 'menu', hostname: 'go.a.cg', domainId: 'dom_1' })
  })

  it('refuse de retirer un domaine qui porte des liens', async () => {
    await updateDomainStatus(db, 'ws_a', 'dom_1', { verified: true, sslStatus: 'active' })
    await createLink(linkDeps(fakeKv()), { workspaceId: 'ws_a', domainId: 'dom_1', slug: 'menu', rule })
    expect(await checkDomainRemoval(db, 'ws_a', 'dom_1')).toEqual({ ok: false, error: 'has_links', links: 1 })
    expect(await removeCustomDomain(db, 'ws_a', 'dom_1')).toEqual({ ok: false, error: 'has_links', links: 1 })
    expect(await getWorkspaceDomain(db, 'ws_a', 'dom_1')).not.toBeNull()
  })

  it('retire un domaine sans lien, seulement depuis son espace', async () => {
    expect(await removeCustomDomain(db, 'ws_b', 'dom_1')).toEqual({ ok: false, error: 'not_found' })
    const res = await removeCustomDomain(db, 'ws_a', 'dom_1')
    expect(res).toMatchObject({ ok: true, domain: { id: 'dom_1', hostname: 'go.a.cg' } })
    expect(await listWorkspaceDomains(db, 'ws_a')).toEqual([])
    // Le nom est de nouveau libre.
    expect((await addCustomDomain(deps(), { workspaceId: 'ws_b', hostname: 'go.a.cg', maxDomains: 1 })).ok).toBe(true)
  })
})
