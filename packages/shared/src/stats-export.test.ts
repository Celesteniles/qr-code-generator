import { describe, expect, it } from 'vitest'
import { csvCell, statsExportCsv, statsExportFilename, statsExportRows, toCsv, type ExportLink } from './stats-export'

const menu: ExportLink = { slug: 'menu', shortUrl: 'https://link.cg/menu', type: 'Lien court', destination: 'https://resto.cg/carte' }
const promo: ExportLink = { slug: 'promo', shortUrl: 'https://link.cg/promo', type: 'Lien · App', destination: 'iPhone → apps.apple.com · sinon promo.cg' }

describe('csvCell', () => {
  it('laisse passer le texte simple et les nombres', () => {
    expect(csvCell('https://link.cg/menu')).toBe('https://link.cg/menu')
    expect(csvCell(42)).toBe('42')
    expect(csvCell(Number.NaN)).toBe('')
  })

  it('met entre guillemets les « ; », guillemets et retours ligne', () => {
    expect(csvCell('a;b')).toBe('"a;b"')
    expect(csvCell('dit "bonjour"')).toBe('"dit ""bonjour"""')
    expect(csvCell('ligne 1\nligne 2')).toBe('"ligne 1\nligne 2"')
    expect(csvCell('a\r\nb')).toBe('"a\r\nb"')
  })

  it('neutralise les formules Excel', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('+33')).toBe("'+33")
    expect(csvCell('-1')).toBe("'-1")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    // Les nombres restent des nombres
    expect(csvCell(-1)).toBe('-1')
  })
})

describe('toCsv', () => {
  it('BOM UTF-8, séparateur « ; », CRLF et retour ligne final', () => {
    const csv = toCsv([['Date', 'Destination'], ['2026-09-28', 'a;b']])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toBe('﻿Date;Destination\r\n2026-09-28;"a;b"\r\n')
  })

  it('le BOM encode bien EF BB BF', () => {
    expect([...new TextEncoder().encode(toCsv([['é']])).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  })
})

describe('statsExportRows', () => {
  it('une ligne par lien et par jour, canaux cumulés, triée par jour puis adresse', () => {
    const rows = statsExportRows([menu, promo], [
      { slug: 'promo', day: '2026-09-02 00:00:00', channel: 'link', visits: 3 },
      { slug: 'menu', day: '2026-09-02 00:00:00', channel: 'qr', visits: 5 },
      { slug: 'menu', day: '2026-09-02 00:00:00', channel: 'link', visits: 2 },
      { slug: 'menu', day: '2026-09-01 00:00:00', channel: '', visits: 4 },
      { slug: 'menu', day: '2026-09-01 00:00:00', channel: 'qr', visits: '1' },
    ])
    expect(rows).toEqual([
      ['2026-09-01', 'https://link.cg/menu', 'Lien court', 'https://resto.cg/carte', 5, 1, 0],
      ['2026-09-02', 'https://link.cg/menu', 'Lien court', 'https://resto.cg/carte', 7, 5, 2],
      ['2026-09-02', 'https://link.cg/promo', 'Lien · App', 'iPhone → apps.apple.com · sinon promo.cg', 3, 0, 3],
    ])
  })

  it('ignore les adresses inconnues, les jours invalides et les visites nulles', () => {
    expect(statsExportRows([menu], [
      { slug: 'autre', day: '2026-09-01 00:00:00', channel: 'qr', visits: 9 },
      { slug: 'menu', day: 'hier', channel: 'qr', visits: 9 },
      { slug: 'menu', day: '2026-09-01 00:00:00', channel: 'qr', visits: 0 },
      { slug: 'menu', day: '2026-09-01 00:00:00', channel: 'qr', visits: null },
    ])).toEqual([])
  })
})

describe('statsExportCsv', () => {
  it('en-tête en français puis les lignes', () => {
    const csv = statsExportCsv([menu], [{ slug: 'menu', day: '2026-09-01 00:00:00', channel: 'qr', visits: 2 }])
    expect(csv).toBe(
      '﻿Date (UTC);Lien court;Type;Destination;Visites;dont scans de QR;dont clics sur le lien\r\n' +
        '2026-09-01;https://link.cg/menu;Lien court;https://resto.cg/carte;2;2;0\r\n',
    )
  })

  it('sans visite : en-tête seul', () => {
    expect(statsExportCsv([menu], []).split('\r\n')).toHaveLength(2)
  })
})

describe('statsExportFilename', () => {
  it('nomme le fichier par période et date, avec l’adresse si un seul lien', () => {
    expect(statsExportFilename('2026-09-28', 30)).toBe('link-cg-statistiques-30j-2026-09-28.csv')
    expect(statsExportFilename('2026-09-28', 7, 'menu')).toBe('link-cg-statistiques-menu-7j-2026-09-28.csv')
    expect(statsExportFilename('2026-09-28', 7, 'a"b')).toBe('link-cg-statistiques-ab-7j-2026-09-28.csv')
  })
})
