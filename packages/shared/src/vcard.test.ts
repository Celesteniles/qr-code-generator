import { describe, expect, it } from 'vitest'
import { vcardRaw, vcardText } from './vcard'

describe('vcardText', () => {
  it('échappe \\ , ; et écrit les retours à la ligne « \\n »', () => {
    expect(vcardText('A, B; C\\D')).toBe('A\\, B\\; C\\\\D')
    expect(vcardText('l1\r\nl2\rl3\nl4')).toBe('l1\\nl2\\nl3\\nl4')
  })
  it('ne laisse aucun caractère de contrôle (pas de nouvelle ligne possible)', () => {
    const out = vcardText('Nom\r\nTEL:+33600000000\u0000\u001b\t')
    expect(out).not.toMatch(/[\u0000-\u001f\u007f]/)
    expect(out).toBe('Nom\\nTEL:+33600000000')
  })
})

describe('vcardRaw', () => {
  it('retire CR, LF et caractères de contrôle (injection de propriété)', () => {
    expect(vcardRaw(' a@b.cg\r\nURL:https://evil.example ')).toBe('a@b.cgURL:https://evil.example')
    expect(vcardRaw('+242061234567\n')).toBe('+242061234567')
    expect(vcardRaw('x\u0000\u007fy')).toBe('xy')
  })
  it('une fiche assemblée garde une propriété par ligne', () => {
    const lines = ['BEGIN:VCARD', `TEL;TYPE=CELL:${vcardRaw('06\r\nNOTE:x')}`, `EMAIL:${vcardRaw('a@b\nX:y')}`, 'END:VCARD']
    expect(lines.join('\r\n').split('\r\n')).toHaveLength(4)
  })
})
