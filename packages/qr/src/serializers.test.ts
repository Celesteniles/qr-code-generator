import { describe, it, expect } from 'vitest'
import {
  wifiEsc, toUrl, toText, toWifi, toVCard, toEmail,
  toSms, toPhone, toGeo, toApp, toSocial, DEFAULT_URL,
} from './serializers'

describe('toUrl', () => {
  it('rend l\'URL trimmée', () => {
    expect(toUrl('  https://link.cg  ')).toBe('https://link.cg')
  })
  it('remplace le vide par l\'URL de démonstration', () => {
    expect(toUrl('')).toBe(DEFAULT_URL)
    expect(toUrl('   ')).toBe(DEFAULT_URL)
  })
})

describe('toText', () => {
  it('rend le texte tel quel, sans trim', () => {
    expect(toText('  bonjour  ')).toBe('  bonjour  ')
  })
})

describe('wifiEsc', () => {
  it('échappe les caractères réservés', () => {
    expect(wifiEsc('a;b')).toBe('a\\;b')
    expect(wifiEsc('a,b')).toBe('a\\,b')
    expect(wifiEsc('a"b')).toBe('a\\"b')
    expect(wifiEsc('a\\b')).toBe('a\\\\b')
  })
  it('échappe le backslash avant les autres (ordre correct)', () => {
    // ';' → '\;' ; un backslash déjà présent est doublé en premier
    expect(wifiEsc('\\;')).toBe('\\\\\\;')
  })
})

describe('toWifi', () => {
  it('sérialise un réseau WPA visible', () => {
    expect(toWifi({ ssid: 'MonWifi', password: 'secret', security: 'WPA', hidden: false }))
      .toBe('WIFI:T:WPA;S:MonWifi;P:secret;H:false;;')
  })
  it('échappe le SSID et le mot de passe', () => {
    expect(toWifi({ ssid: 'Café;Bar', password: 'a,b', security: 'WPA', hidden: true }))
      .toBe('WIFI:T:WPA;S:Café\\;Bar;P:a\\,b;H:true;;')
  })
})

describe('toVCard', () => {
  it('inclut nom, FN et champs renseignés uniquement', () => {
    expect(toVCard({ first: 'Celeste', last: 'GAKONO', org: 'NS Creative' })).toBe(
      'BEGIN:VCARD\nVERSION:3.0\nN:GAKONO;Celeste;;;\nFN:Celeste GAKONO\nORG:NS Creative\nEND:VCARD',
    )
  })
  it('omet la ligne N si ni prénom ni nom', () => {
    expect(toVCard({ phone: '+242000000' })).toBe(
      'BEGIN:VCARD\nVERSION:3.0\nTEL:+242000000\nEND:VCARD',
    )
  })
  it('gère un prénom seul', () => {
    expect(toVCard({ first: 'Celeste' })).toBe(
      'BEGIN:VCARD\nVERSION:3.0\nN:;Celeste;;;\nFN:Celeste\nEND:VCARD',
    )
  })
})

describe('toEmail', () => {
  it('mailto simple sans paramètres', () => {
    expect(toEmail({ to: 'a@b.cg' })).toBe('mailto:a@b.cg')
  })
  it('encode sujet et corps', () => {
    expect(toEmail({ to: 'a@b.cg', subject: 'Salut & co', body: 'ligne 1' }))
      .toBe('mailto:a@b.cg?subject=Salut%20%26%20co&body=ligne%201')
  })
})

describe('toSms', () => {
  it('formate smsto avec message', () => {
    expect(toSms({ phone: '+242000', message: 'coucou' })).toBe('smsto:+242000:coucou')
  })
  it('message absent → deux-points final vide', () => {
    expect(toSms({ phone: '+242000' })).toBe('smsto:+242000:')
  })
})

describe('toPhone', () => {
  it('préfixe tel:', () => {
    expect(toPhone('+242000')).toBe('tel:+242000')
  })
})

describe('toGeo', () => {
  it('coordonnées seules', () => {
    expect(toGeo({ lat: '-4.26', lng: '15.28' })).toBe('geo:-4.26,15.28')
  })
  it('ajoute la requête encodée', () => {
    expect(toGeo({ lat: '-4.26', lng: '15.28', query: 'Chez NS' }))
      .toBe('geo:-4.26,15.28?q=Chez%20NS')
  })
  it('coordonnées manquantes → chaîne vide', () => {
    expect(toGeo({ lat: '', lng: '15.28' })).toBe('')
    expect(toGeo({ lat: '-4.26', lng: '' })).toBe('')
  })
})

describe('toApp / toSocial', () => {
  it('trimment leur entrée', () => {
    expect(toApp('  myapp://x  ')).toBe('myapp://x')
    expect(toSocial('  https://fb.com/x  ')).toBe('https://fb.com/x')
  })
})
