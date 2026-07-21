import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import type { Db } from './mutations'
import { upsertCardProfile, getCardBySlug } from './card'

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
})
