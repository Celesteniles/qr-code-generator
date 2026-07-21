import { describe, it, expect } from 'vitest'
import { compileLink, serializeEntry } from './compile'
import type { LinkRow } from './schema'

function row(over: Partial<LinkRow> = {}): LinkRow {
  return {
    id: 'lnk_1',
    workspaceId: 'ws_1',
    domainId: 'dom_1',
    slug: 'promo',
    kind: 'static',
    rule: { type: 'static', url: 'https://qrcode.cg' },
    active: true,
    expiresAt: null,
    createdAt: 1_700_000_000,
    updatedAt: 1_700_000_000,
    ...over,
  }
}

describe('compileLink', () => {
  it('compose la clé hostname:slug et la valeur KV', () => {
    const { key, value } = compileLink(row(), 'link.cg')
    expect(key).toBe('link.cg:promo')
    expect(value).toEqual({ slug: 'promo', active: true, rule: { type: 'static', url: 'https://qrcode.cg' } })
  })

  it('omet expiresAt quand null (pas de clé parasite dans KV)', () => {
    const { value } = compileLink(row({ expiresAt: null }), 'link.cg')
    expect('expiresAt' in value).toBe(false)
  })

  it('conserve expiresAt quand défini', () => {
    const { value } = compileLink(row({ expiresAt: 1_800_000_000 }), 'link.cg')
    expect(value.expiresAt).toBe(1_800_000_000)
  })

  it('utilise le hostname du domaine personnalisé', () => {
    const { key } = compileLink(row(), 'go.client.cg')
    expect(key).toBe('go.client.cg:promo')
  })

  it('transporte une règle app telle quelle', () => {
    const { value } = compileLink(
      row({ kind: 'app', rule: { type: 'app', ios: 'itms://i', android: 'market://a', fallback: 'https://w' } }),
      'link.cg',
    )
    expect(value.rule).toEqual({ type: 'app', ios: 'itms://i', android: 'market://a', fallback: 'https://w' })
  })
})

describe('serializeEntry', () => {
  it('produit une valeur JSON prête pour KV.put', () => {
    const entry = compileLink(row(), 'link.cg')
    const { key, value } = serializeEntry(entry)
    expect(key).toBe('link.cg:promo')
    expect(JSON.parse(value)).toEqual(entry.value)
  })
})
