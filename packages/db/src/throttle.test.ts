import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import type { Db } from './mutations'
import {
  checkLinkCreationRate, checkLinkUpdateRate, decideThrottle,
  LINK_CREATIONS_PER_HOUR, LINK_UPDATES_PER_HOUR, THROTTLE_WINDOW_MS,
} from './throttle'

// Base SQLite en mémoire avec la première migration (tables workspaces, domains, links).
function freshDb(): Db {
  const client = createClient({ url: ':memory:' })
  const migDir = join(__dirname, '..', 'migrations')
  const file = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()[0]
  const sql = readFileSync(join(migDir, file), 'utf8')
  for (const stmt of sql.split('--> statement-breakpoint')) {
    const s = stmt.trim()
    if (s) client.execute(s)
  }
  return drizzle(client, { schema }) as unknown as Db
}

const NOW = 10 * THROTTLE_WINDOW_MS
const MIN = 60_000

let db: Db
beforeEach(async () => {
  db = freshDb()
  for (const id of ['ws_1', 'ws_2']) {
    await db.insert(schema.workspaces).values({ id, name: id, plan: 'free', createdAt: 0 })
  }
  await db.insert(schema.domains).values({ id: 'dom_1', workspaceId: 'ws_1', hostname: 'link.cg', verified: true, isDefault: true })
})

let seq = 0
async function addLink(workspaceId: string, createdAt: number, updatedAt = createdAt) {
  const id = `l${++seq}`
  await db.insert(schema.links).values({
    id, workspaceId, domainId: 'dom_1', slug: id, kind: 'static',
    rule: { type: 'static', url: 'https://qrcode.cg' }, active: true, createdAt, updatedAt,
  })
  return { id, createdAt, updatedAt }
}

describe('decideThrottle', () => {
  it('sous la limite → ok', () => {
    expect(decideThrottle(19, NOW - 5 * MIN, 20, NOW)).toEqual({ ok: true })
  })
  it('à la limite → refus, délai jusqu\'à la sortie du plus ancien', () => {
    expect(decideThrottle(20, NOW - 50 * MIN, 20, NOW)).toEqual({ ok: false, max: 20, retryInMinutes: 10 })
  })
  it('délai d\'au moins une minute', () => {
    expect(decideThrottle(20, NOW - THROTTLE_WINDOW_MS, 20, NOW)).toEqual({ ok: false, max: 20, retryInMinutes: 1 })
  })
})

describe('checkLinkCreationRate', () => {
  const max = LINK_CREATIONS_PER_HOUR.free

  it('refuse au-delà de la limite horaire du palier', async () => {
    for (let i = 0; i < max - 1; i++) await addLink('ws_1', NOW - 30 * MIN + i)
    expect(await checkLinkCreationRate(db, 'ws_1', 'free', NOW)).toEqual({ ok: true })
    await addLink('ws_1', NOW - MIN)
    expect(await checkLinkCreationRate(db, 'ws_1', 'free', NOW)).toEqual({ ok: false, max, retryInMinutes: 30 })
  })

  it('ignore les liens de plus d\'une heure et ceux des autres espaces', async () => {
    for (let i = 0; i < max; i++) await addLink('ws_1', NOW - THROTTLE_WINDOW_MS - MIN)
    for (let i = 0; i < max; i++) await addLink('ws_2', NOW - MIN)
    expect(await checkLinkCreationRate(db, 'ws_1', 'free', NOW)).toEqual({ ok: true })
  })

  it('palier payant : limite plus haute', async () => {
    for (let i = 0; i < max; i++) await addLink('ws_1', NOW - MIN)
    expect(await checkLinkCreationRate(db, 'ws_1', 'pro', NOW)).toEqual({ ok: true })
  })
})

describe('checkLinkUpdateRate', () => {
  const max = LINK_UPDATES_PER_HOUR.free

  it('compte les liens modifiés dans l\'heure, pas les simples créations', async () => {
    for (let i = 0; i < max; i++) await addLink('ws_1', NOW - 5 * MIN) // créés, jamais modifiés
    const target = await addLink('ws_1', 0)
    expect(await checkLinkUpdateRate(db, 'ws_1', 'free', target, NOW)).toEqual({ ok: true })
  })

  it('refuse un nouveau lien au-delà de la limite', async () => {
    for (let i = 0; i < max; i++) await addLink('ws_1', 0, NOW - 20 * MIN)
    const target = await addLink('ws_1', 0)
    expect(await checkLinkUpdateRate(db, 'ws_1', 'free', target, NOW)).toEqual({ ok: false, max, retryInMinutes: 40 })
  })

  it('laisse repasser un lien déjà modifié dans l\'heure', async () => {
    for (let i = 0; i < max; i++) await addLink('ws_1', 0, NOW - 20 * MIN)
    const target = await addLink('ws_1', 0, NOW - 2 * MIN)
    expect(await checkLinkUpdateRate(db, 'ws_1', 'free', target, NOW)).toEqual({ ok: true })
  })
})
