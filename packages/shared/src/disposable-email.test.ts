import { describe, expect, it } from 'vitest'
import { DISPOSABLE_DOMAINS_LIST } from './disposable-domains.generated'
import { emailDomain, isDisposableEmail } from './disposable-email'

describe('isDisposableEmail', () => {
  it('bloque les services jetables connus', () => {
    for (const e of [
      'test@yopmail.com', 'a@mailinator.com', 'b@10minutemail.com', 'c@guerrillamail.com',
      'd@sharklasers.com', 'e@temp-mail.org', 'f@maildrop.cc', 'g@temp-mail.io',
    ]) {
      expect(isDisposableEmail(e), e).toBe(true)
    }
  })

  it('normalise : majuscules et espaces', () => {
    expect(isDisposableEmail('  Test@YOPMAIL.com  ')).toBe(true)
    expect(isDisposableEmail('x@Mailinator.COM.')).toBe(true)
  })

  it('bloque les sous-domaines d\'un domaine listé', () => {
    expect(isDisposableEmail('x@x.yopmail.com')).toBe(true)
    expect(isDisposableEmail('x@a.b.mailinator.com')).toBe(true)
  })

  it('ne confond pas un domaine qui ressemble', () => {
    expect(isDisposableEmail('x@notyopmail.com')).toBe(false)
    expect(isDisposableEmail('x@yopmail.com.cg')).toBe(false)
  })

  it('laisse passer les messageries courantes', () => {
    for (const e of [
      'a@gmail.com', 'b@yahoo.fr', 'c@outlook.com', 'd@icloud.com', 'e@hotmail.fr',
      'f@yahoo.com', 'g@proton.me', 'h@orange.fr',
    ]) {
      expect(isDisposableEmail(e), e).toBe(false)
    }
  })

  it('ne bloque jamais un domaine congolais .cg', () => {
    for (const e of ['contact@nscreative.cg', 'x@mtn.cg', 'y@airtel.cg', 'z@sous.domaine.cg', 'w@gouv.cg']) {
      expect(isDisposableEmail(e), e).toBe(false)
    }
  })

  it('renvoie false pour une adresse invalide (validée ailleurs)', () => {
    for (const e of ['', '   ', 'yopmail.com', '@yopmail.com', 'x@', 'x@yopmail', 'x@yop mail.com', 'x@@']) {
      expect(isDisposableEmail(e), e).toBe(false)
    }
  })
})

describe('emailDomain', () => {
  it('extrait le domaine en minuscules', () => {
    expect(emailDomain(' Jean.Dupont@Exemple.CG ')).toBe('exemple.cg')
    expect(emailDomain('"a@b"@exemple.cg')).toBe('exemple.cg')
    expect(emailDomain('pas-une-adresse')).toBeNull()
  })
})

describe('liste générée', () => {
  it('est bien remplie et sans messagerie courante', () => {
    const list = DISPOSABLE_DOMAINS_LIST.split('\n')
    expect(list.length).toBeGreaterThan(1000)
    for (const d of ['gmail.com', 'yahoo.fr', 'outlook.com', 'icloud.com']) expect(list).not.toContain(d)
    expect(list.some((d) => d.endsWith('.cg'))).toBe(false)
  })
})
