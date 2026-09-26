import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import type { Db } from './mutations'
import { upsertCardProfile, getCardBySlug, CardProfileError } from './card'
import { upsertQrDesign, getQrDesign, getQrDesigns, QrDesignError, QR_DESIGN_MAX_BYTES } from './qr-design'

function freshDb(): Db {
  const client = createClient({ url: ':memory:' })
  const migDir = join(__dirname, '..', 'migrations')
  for (const f of readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(migDir, f), 'utf8')
    for (const stmt of sql.split('--> statement-breakpoint')) {
      const s = stmt.trim()
      if (s) client.execute(s)
    }
  }
  return drizzle(client, { schema }) as unknown as Db
}

let db: Db
beforeEach(async () => {
  db = freshDb()
  await db.insert(schema.workspaces).values({ id: 'ws', name: 'NS', plan: 'free', createdAt: 0 })
  await db.insert(schema.domains).values({ id: 'dom', workspaceId: 'ws', hostname: 'link.cg', verified: true, isDefault: true })
  await db.insert(schema.links).values({
    id: 'lnk', workspaceId: 'ws', domainId: 'dom', slug: 'celeste', kind: 'card',
    rule: { type: 'card' }, active: true, expiresAt: null, createdAt: 0, updatedAt: 0,
  })
})

describe('carte de visite', () => {
  it('getCardBySlug sans profil → link présent, profile null', async () => {
    const res = await getCardBySlug(db, 'celeste')
    expect(res?.link.slug).toBe('celeste')
    expect(res?.profile).toBeNull()
  })

  it('slug inexistant → null', async () => {
    expect(await getCardBySlug(db, 'nope')).toBeNull()
  })

  it('upsert crée puis met à jour le profil (pas de doublon)', async () => {
    await upsertCardProfile(db, 'lnk', { fullName: 'Celeste GAKONO', title: 'Fondateur' }, () => 'p1')
    let res = await getCardBySlug(db, 'celeste')
    expect(res?.profile?.fullName).toBe('Celeste GAKONO')
    expect(res?.profile?.title).toBe('Fondateur')

    await upsertCardProfile(db, 'lnk', { fullName: 'Celeste GAKONO', org: 'NS Creative' }, () => 'p2')
    res = await getCardBySlug(db, 'celeste')
    expect(res?.profile?.org).toBe('NS Creative')
    expect(res?.profile?.title).toBeUndefined()

    const rows = await db.query.cardProfiles.findMany()
    expect(rows).toHaveLength(1) // upsert, pas d'insert en double
  })

  it('conserve les réseaux sociaux (JSON)', async () => {
    await upsertCardProfile(db, 'lnk', {
      fullName: 'C',
      socials: [{ label: 'Site', url: 'https://nscreative.cg' }],
    }, () => 'p1')
    const res = await getCardBySlug(db, 'celeste')
    expect(res?.profile?.socials).toEqual([{ label: 'Site', url: 'https://nscreative.cg' }])
  })

  it('enregistre et relit la couleur de thème', async () => {
    await upsertCardProfile(db, 'lnk', { fullName: 'C', theme: '#e11d48' }, () => 'p1')
    expect((await getCardBySlug(db, 'celeste'))?.profile?.theme).toBe('#e11d48')
    await upsertCardProfile(db, 'lnk', { fullName: 'C' }, () => 'p1')
    expect((await getCardBySlug(db, 'celeste'))?.profile?.theme).toBeUndefined()
  })

  it('refuse un profil invalide sans rien écrire (CardProfileError)', async () => {
    const bad = [
      { fullName: '' },
      { fullName: 'x'.repeat(101) },
      { fullName: 'C', title: 'x'.repeat(121) },
      { fullName: 'C', phone: '+242 06\r\nX-INJ:1' },
      { fullName: 'C', email: 'pas-un-email' },
      { fullName: 'C', email: 'a@b.cg\r\nNOTE:x' },
      { fullName: 'C\nNOTE:x' },
      { fullName: 'C', theme: 'red' },
      { fullName: 'C', socials: [{ label: 'Site', url: 'javascript:alert(1)' }] },
      { fullName: 'C', socials: [{ label: 'Site', url: `https://a.cg/${'x'.repeat(500)}` }] },
      { fullName: 'C', socials: Array.from({ length: 13 }, () => ({ label: 'Site', url: 'https://a.cg' })) },
    ]
    for (const input of bad) {
      await expect(upsertCardProfile(db, 'lnk', input, () => 'p1'), JSON.stringify(input)).rejects.toBeInstanceOf(CardProfileError)
    }
    expect(await db.query.cardProfiles.findMany()).toHaveLength(0)
  })

  it('accepte un profil complet aux formats attendus', async () => {
    await upsertCardProfile(db, 'lnk', {
      fullName: 'Celeste GAKONO', title: 'Fondateur', org: 'NS Creative', phone: '+242061234567',
      email: 'contact@nscreative.cg', theme: '#E11D48',
      socials: [{ label: 'WhatsApp', url: 'https://wa.me/242061234567' }],
    }, () => 'p1')
    expect((await getCardBySlug(db, 'celeste'))?.profile?.email).toBe('contact@nscreative.cg')
  })
})

describe('design QR', () => {
  it('refuse une config non objet ou trop lourde', async () => {
    for (const config of [null, 'x', [1, 2], 42]) {
      await expect(upsertQrDesign(db, 'lnk', config)).rejects.toBeInstanceOf(QrDesignError)
    }
    const heavy = { logo: `data:image/png;base64,${'A'.repeat(QR_DESIGN_MAX_BYTES)}` }
    await expect(upsertQrDesign(db, 'lnk', heavy)).rejects.toBeInstanceOf(QrDesignError)
    expect(await getQrDesign(db, 'lnk')).toBeNull()
  })

  it('getQrDesigns ne renvoie que les liens demandés', async () => {
    await db.insert(schema.links).values({
      id: 'lnk2', workspaceId: 'ws', domainId: 'dom', slug: 'autre', kind: 'static',
      rule: { type: 'static', url: 'https://a.cg' }, active: true, expiresAt: null, createdAt: 0, updatedAt: 0,
    })
    await upsertQrDesign(db, 'lnk', { dotColor: '#000000' }, () => 'd1')
    await upsertQrDesign(db, 'lnk2', { dotColor: '#ffffff' }, () => 'd2')
    expect(await getQrDesigns(db, ['lnk'])).toEqual({ lnk: { dotColor: '#000000' } })
    expect(await getQrDesigns(db, [])).toEqual({})
    // Au-delà d'un lot (90 identifiants) : les lots sont fusionnés.
    const many = [...Array.from({ length: 150 }, (_, i) => `x${i}`), 'lnk2']
    expect(await getQrDesigns(db, many)).toEqual({ lnk2: { dotColor: '#ffffff' } })
  })
})
