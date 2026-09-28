import { describe, expect, it } from 'vitest'
import {
  clampDays,
  dailyLinkVisitsSql,
  dailyVisitsSql,
  insightsQueries,
  linksScopeSql,
  safeStatsLinks,
  scanCountsSql,
  sqlDateTime,
  statsKey,
} from './stats-sql'

const T = Date.UTC(2026, 8, 20, 14, 30, 5, 750) // 2026-09-20 14:30:05.750

describe('safeStatsLinks', () => {
  it('écarte les slugs non conformes (injection) et les dates invalides', () => {
    const out = safeStatsLinks([
      { slug: "x' OR 1=1 --", createdAt: T },
      { slug: 'ok', createdAt: T },
      { slug: 'zero', createdAt: 0 },
      { slug: 'nan', createdAt: Number.NaN },
      { slug: 'futur', createdAt: Date.UTC(2200, 0, 1) },
      { slug: 'a'.repeat(65), createdAt: T },
    ])
    expect(out).toEqual([{ slug: 'ok', createdAt: T }])
  })

  it('dédoublonne par slug (création la plus récente) et trie', () => {
    const out = safeStatsLinks([
      { slug: 'b', createdAt: T },
      { slug: 'a', createdAt: T },
      { slug: 'b', createdAt: T + 1000 },
      { slug: 'b', createdAt: T - 1000 },
    ])
    expect(out).toEqual([{ slug: 'a', createdAt: T }, { slug: 'b', createdAt: T + 1000 }])
  })

  it('clé de mémoïsation différente si le slug est repris (autre création)', () => {
    expect(statsKey([{ slug: 'a', createdAt: T }])).not.toBe(statsKey([{ slug: 'a', createdAt: T + 1 }]))
  })
})

describe('domaines (blob8)', () => {
  it('garde le domaine, écarte un domaine non conforme, distingue le même slug sur deux domaines', () => {
    const out = safeStatsLinks([
      { slug: 'menu', createdAt: T, hostname: 'link.cg' },
      { slug: 'menu', createdAt: T + 1000, hostname: 'go.resto.cg' },
      { slug: 'menu', createdAt: T, hostname: "x' OR 1=1 --" },
      { slug: 'menu', createdAt: T, hostname: 'GO.RESTO.CG' },
    ])
    expect(out).toEqual([
      { slug: 'menu', createdAt: T + 1000, hostname: 'go.resto.cg' },
      { slug: 'menu', createdAt: T, hostname: 'link.cg' },
    ])
    expect(statsKey(out)).toBe(`menu/go.resto.cg@${T + 1000},menu/link.cg@${T}`)
  })

  it('link.cg compte aussi les visites sans domaine enregistré ; un domaine personnalisé seulement les siennes', () => {
    expect(linksScopeSql([{ slug: 'menu', createdAt: T, hostname: 'link.cg' }])).toBe(
      "(index1 = 'menu' AND blob8 IN ('', 'link.cg') AND timestamp >= toDateTime('2026-09-20 14:30:05'))",
    )
    expect(linksScopeSql([{ slug: 'menu', createdAt: T, hostname: 'go.resto.cg' }])).toBe(
      "(index1 = 'menu' AND blob8 = 'go.resto.cg' AND timestamp >= toDateTime('2026-09-20 14:30:05'))",
    )
  })

  it('refuse un domaine non validé', () => {
    expect(() => linksScopeSql([{ slug: 'a', createdAt: T, hostname: "a'b.cg" }])).toThrow()
  })
})

describe('sqlDateTime', () => {
  it('formate en UTC à la seconde', () => {
    expect(sqlDateTime(T)).toBe('2026-09-20 14:30:05')
  })
  it('refuse ce qui n’est pas un entier vraisemblable', () => {
    for (const v of [1.5, -1, 0, Number.NaN, Date.UTC(2200, 0, 1)]) expect(() => sqlDateTime(v)).toThrow()
  })
})

describe('linksScopeSql', () => {
  it('borne chaque adresse à la création de son lien actuel', () => {
    expect(linksScopeSql([{ slug: 'promo', createdAt: T }])).toBe(
      "(index1 = 'promo' AND timestamp >= toDateTime('2026-09-20 14:30:05'))",
    )
    const two = linksScopeSql(safeStatsLinks([{ slug: 'b', createdAt: T }, { slug: 'a', createdAt: Date.UTC(2025, 0, 2) }]))
    expect(two).toBe(
      "((index1 = 'a' AND timestamp >= toDateTime('2025-01-02 00:00:00')) OR " +
        "(index1 = 'b' AND timestamp >= toDateTime('2026-09-20 14:30:05')))",
    )
  })

  it('refuse une liste vide et un slug non validé', () => {
    expect(() => linksScopeSql([])).toThrow()
    expect(() => linksScopeSql([{ slug: "a'", createdAt: T }])).toThrow()
  })
})

describe('requêtes', () => {
  const links = [{ slug: 'promo', createdAt: T }]
  const scope = "(index1 = 'promo' AND timestamp >= toDateTime('2026-09-20 14:30:05'))"

  it('compteurs : bornés par adresse, groupés par slug', () => {
    const sql = scanCountsSql(links)
    expect(sql).toContain(scope)
    expect(sql).toContain("INTERVAL '30' DAY")
    expect(sql).toContain('GROUP BY slug')
  })

  it('série par jour : bornée par adresse, jour validé', () => {
    expect(dailyVisitsSql(links, '2026-08-28')).toContain(`toDateTime('2026-08-28 00:00:00') AND ${scope} AND`)
    expect(() => dailyVisitsSql(links, "2026-08-28' OR 1=1")).toThrow()
  })

  it('export : par adresse, jour et canal, borné par adresse, jour validé', () => {
    const sql = dailyLinkVisitsSql(links, '2026-08-28')
    expect(sql).toContain(`toDateTime('2026-08-28 00:00:00') AND ${scope} AND`)
    expect(sql).toContain('GROUP BY slug, day, channel')
    expect(() => dailyLinkVisitsSql(links, "2026-08-28' OR 1=1")).toThrow()
  })

  it('statistiques détaillées : toutes les requêtes portent la borne', () => {
    const q = insightsQueries(links, 30)
    for (const sql of Object.values(q)) {
      expect(sql).toContain(`WHERE ${scope} AND timestamp > NOW() - INTERVAL '30' DAY AND (blob4 != ''`)
    }
    expect(q.cities).toContain("AND blob6 != '' GROUP BY k")
    expect(q.countries).toMatch(/LIMIT 12$/)
  })

  it('période bornée de 1 à 90 jours', () => {
    expect(clampDays(365)).toBe(90)
    expect(clampDays(0)).toBe(30)
    expect(clampDays(-5)).toBe(1)
    expect(insightsQueries(links, 1000).channel).toContain("INTERVAL '90' DAY")
  })
})
