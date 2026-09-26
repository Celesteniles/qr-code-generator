'use client'

import { useState, type ReactNode } from 'react'
import {
  LinkIcon, DocumentTextIcon, ChatBubbleLeftEllipsisIcon, WifiIcon, UserIcon, DevicePhoneMobileIcon,
  EllipsisHorizontalIcon, EnvelopeIcon, ChatBubbleBottomCenterTextIcon, PhoneIcon, MapPinIcon, GlobeAltIcon,
  SparklesIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { toUrl, toText, toWifi, toVCard, toEmail, toSms, toPhone, toGeo, toApp, toSocial } from '@link/qr'
import { hostOf, isWebUrl, normalizeUrl, waUrl, type ContentType } from './helpers'
import { Field } from './ui'

// Types de contenu d'un QR (porté de QrGenerator/ContentCard) et sérialisation via @link/qr.

export type { ContentType }
const MAIN: ContentType[] = ['site', 'menu', 'whatsapp', 'wifi', 'vcard', 'app']
const OTHER: ContentType[] = ['texte', 'email', 'sms', 'appel', 'lieu', 'reseaux']

type Icon = typeof LinkIcon
export const TYPE_META: Record<ContentType, { label: string; icon: Icon; title: string; hint: string; fixedWhy?: string }> = {
  site: { label: 'Site web', icon: LinkIcon, title: 'Quelle page doit-il ouvrir ?', hint: 'Collez le lien de la page : boutique, formulaire, vidéo, document…' },
  menu: { label: 'Menu', icon: DocumentTextIcon, title: 'Où se trouve votre menu ?', hint: 'Collez le lien de votre menu en ligne.' },
  whatsapp: { label: 'WhatsApp', icon: ChatBubbleLeftEllipsisIcon, title: 'Sur quel numéro vous écrire ?', hint: 'En scannant, la personne ouvre une discussion WhatsApp avec vous.' },
  wifi: {
    label: 'Wi‑Fi', icon: WifiIcon, title: 'Quel est votre réseau Wi‑Fi ?', hint: 'En scannant, le téléphone se connecte sans taper le mot de passe.',
    fixedWhy: 'Un QR Wi‑Fi contient directement le nom du réseau et le mot de passe : le téléphone se connecte sans passer par internet. Il reste donc fixe. Si le mot de passe change, créez un nouveau QR.',
  },
  vcard: {
    label: 'Carte de visite', icon: UserIcon, title: 'Vos coordonnées', hint: 'En scannant, la personne enregistre votre contact dans son téléphone.',
    fixedWhy: 'Ce QR contient directement vos coordonnées : il reste fixe. Pour une carte que vous pourrez modifier sans réimprimer, utilisez la Carte de visite link.cg.',
  },
  app: { label: 'Application', icon: DevicePhoneMobileIcon, title: 'Où trouver votre application ?', hint: 'Le lien de l’App Store, du Play Store ou de votre site.' },
  texte: {
    label: 'Texte', icon: DocumentTextIcon, title: 'Quel texte afficher ?', hint: 'Le texte s’affiche sur le téléphone, sans connexion.',
    fixedWhy: 'Ce QR contient directement votre texte, pas un lien : il reste fixe.',
  },
  email: {
    label: 'Email', icon: EnvelopeIcon, title: 'À qui écrire ?', hint: 'En scannant, un email prêt à envoyer s’ouvre.',
    fixedWhy: 'Ce QR contient directement l’adresse et le message, pas un lien : il reste fixe.',
  },
  sms: {
    label: 'SMS', icon: ChatBubbleBottomCenterTextIcon, title: 'À quel numéro envoyer le SMS ?', hint: 'En scannant, un SMS prêt à envoyer s’ouvre.',
    fixedWhy: 'Ce QR contient directement le numéro et le message, pas un lien : il reste fixe.',
  },
  appel: {
    label: 'Appel', icon: PhoneIcon, title: 'Quel numéro appeler ?', hint: 'En scannant, le téléphone propose d’appeler ce numéro.',
    fixedWhy: 'Ce QR contient directement le numéro, pas un lien : il reste fixe.',
  },
  lieu: {
    label: 'Lieu', icon: MapPinIcon, title: 'Où se trouve le lieu ?', hint: 'En scannant, la carte s’ouvre sur ce point.',
    fixedWhy: 'Ce QR contient directement les coordonnées du lieu, pas un lien : il reste fixe.',
  },
  reseaux: { label: 'Réseaux sociaux', icon: GlobeAltIcon, title: 'Quelle page de réseau social ?', hint: 'Votre page Facebook, Instagram, TikTok…' },
}

export const SOCIALS = [
  { id: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/votrepage' },
  { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/votrecompte' },
  { id: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@votrecompte' },
  { id: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@votrechaine' },
  { id: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/votrenom' },
  { id: 'x', label: 'X', placeholder: 'https://x.com/votrecompte' },
  { id: 'snapchat', label: 'Snapchat', placeholder: 'https://snapchat.com/add/votrecompte' },
] as const

export interface ContentValues {
  url: string
  menu: string
  waPhone: string; waMsg: string
  ssid: string; wifiPass: string; wifiSec: string; wifiHidden: boolean
  first: string; last: string; phone: string; email: string; org: string; title: string; web: string; addr: string
  appUrl: string
  text: string
  mailTo: string; mailSubject: string; mailBody: string
  smsPhone: string; smsMsg: string
  tel: string
  lat: string; lng: string; place: string
  socialId: string; socialUrl: string
}

export function initialValues(url = ''): ContentValues {
  return {
    url, menu: '', waPhone: '', waMsg: '', ssid: '', wifiPass: '', wifiSec: 'WPA', wifiHidden: false,
    first: '', last: '', phone: '', email: '', org: '', title: '', web: '', addr: '', appUrl: '', text: '',
    mailTo: '', mailSubject: '', mailBody: '', smsPhone: '', smsMsg: '', tel: '', lat: '', lng: '', place: '',
    socialId: 'facebook', socialUrl: '',
  }
}

export interface BuiltContent {
  /** Contenu encodé dans un QR fixe ('' = pas encore rempli). */
  data: string
  /** Lien web vers lequel un QR modifiable redirigera (null = contenu non-lien). */
  link: string | null
  /** Nom lisible par défaut (pour « Mes liens & QR » et le fichier). */
  label: string
}

/** Sérialise le contenu. Les QR déjà produits par l'ancien générateur restent identiques (@link/qr). */
export function buildContent(type: ContentType, v: ContentValues): BuiltContent {
  const web = (raw: string, label: string): BuiltContent => {
    const u = normalizeUrl(raw)
    if (!isWebUrl(u)) return { data: '', link: null, label }
    return { data: toUrl(u), link: u, label: hostOf(u) || label }
  }
  switch (type) {
    case 'site': return web(v.url, 'Site web')
    case 'menu': return web(v.menu, 'Menu')
    case 'reseaux': {
      const s = SOCIALS.find((x) => x.id === v.socialId)
      const u = normalizeUrl(v.socialUrl)
      if (!isWebUrl(u)) return { data: '', link: null, label: s?.label ?? 'Réseau social' }
      return { data: toSocial(u), link: u, label: s?.label ?? hostOf(u) }
    }
    case 'app': {
      const u = normalizeUrl(v.appUrl)
      if (!isWebUrl(u)) return { data: '', link: null, label: 'Application' }
      return { data: toApp(u), link: u, label: 'Application' }
    }
    case 'whatsapp': {
      const u = waUrl(v.waPhone, v.waMsg)
      return { data: u, link: u || null, label: v.waPhone.trim() ? `WhatsApp ${v.waPhone.trim()}` : 'WhatsApp' }
    }
    case 'wifi':
      return { data: v.ssid.trim() ? toWifi({ ssid: v.ssid, password: v.wifiPass, security: v.wifiSec, hidden: v.wifiHidden }) : '', link: null, label: v.ssid.trim() ? `Wi‑Fi ${v.ssid.trim()}` : 'Wi‑Fi' }
    case 'vcard': {
      const any = [v.first, v.last, v.phone, v.email, v.org].some((x) => x.trim())
      const name = [v.first, v.last].filter((x) => x.trim()).join(' ') || v.org
      return { data: any ? toVCard({ first: v.first, last: v.last, phone: v.phone, email: v.email, org: v.org, title: v.title, web: v.web, addr: v.addr }) : '', link: null, label: name ? `Contact ${name}` : 'Carte de visite' }
    }
    case 'texte': return { data: v.text.trim() ? toText(v.text) : '', link: null, label: 'Texte' }
    case 'email': return { data: v.mailTo.trim() ? toEmail({ to: v.mailTo.trim(), subject: v.mailSubject, body: v.mailBody }) : '', link: null, label: v.mailTo.trim() ? `Email ${v.mailTo.trim()}` : 'Email' }
    case 'sms': return { data: v.smsPhone.trim() ? toSms({ phone: v.smsPhone.trim(), message: v.smsMsg }) : '', link: null, label: v.smsPhone.trim() ? `SMS ${v.smsPhone.trim()}` : 'SMS' }
    case 'appel': return { data: v.tel.trim() ? toPhone(v.tel.trim()) : '', link: null, label: v.tel.trim() ? `Appel ${v.tel.trim()}` : 'Appel' }
    case 'lieu': return { data: toGeo({ lat: v.lat.trim(), lng: v.lng.trim(), query: v.place }), link: null, label: v.place.trim() || 'Lieu' }
  }
}

/** Contenus qui sont des liens : ils peuvent passer par un lien court (QR modifiable). */
export function canBeModifiable(type: ContentType): boolean {
  return !TYPE_META[type].fixedWhy
}

// ── Choix du type ───────────────────────────────────────────────────────────

export function TypePicker({ value, onChange }: { value: ContentType; onChange: (t: ContentType) => void }) {
  const [showOther, setShowOther] = useState(OTHER.includes(value))
  const otherOpen = showOther || OTHER.includes(value)
  const chip = (t: ContentType) => {
    const { label, icon: I } = TYPE_META[t]
    return (
      <button key={t} type="button" className="chip" aria-pressed={value === t} onClick={() => onChange(t)}>
        <I />{label}
      </button>
    )
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Type de contenu">
        {MAIN.map(chip)}
        <button type="button" className="chip" aria-pressed={OTHER.includes(value)} aria-expanded={otherOpen} onClick={() => setShowOther((s) => !s)}>
          <EllipsisHorizontalIcon />Autre<ChevronDownIcon className={`!h-4 !w-4 transition ${otherOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {otherOpen && (
        <div className="mt-3 flex flex-wrap gap-2 rounded-[18px] bg-soft p-3" role="group" aria-label="Autres types de contenu">
          {OTHER.map(chip)}
        </div>
      )}
    </div>
  )
}

// ── Champs selon le type ────────────────────────────────────────────────────

export function ContentFields({ type, v, set, appDevice }: {
  type: ContentType
  v: ContentValues
  set: <K extends keyof ContentValues>(k: K, val: ContentValues[K]) => void
  /** Champs iPhone / Android (QR modifiable d'une application), rendus sous le lien principal. */
  appDevice?: ReactNode
}) {
  const [more, setMore] = useState(false)
  const input = (k: keyof ContentValues, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input className="input" value={String(v[k])} onChange={(e) => set(k, e.target.value as never)} {...props} />
  )
  const urlProps = { type: 'url', inputMode: 'url' as const, autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false }
  const tel = { type: 'tel', inputMode: 'tel' as const, autoComplete: 'tel', placeholder: '+242 06 123 45 67' }

  switch (type) {
    case 'site':
      return <Field label="Lien de la page">{input('url', { ...urlProps, placeholder: 'https://votre-site.cg/page' })}</Field>
    case 'menu':
      return (
        <Field label="Lien du menu" hint={<><SparklesIcon />Menu en PDF ? Déposez-le sur Google Drive, puis « Partager » → « Copier le lien ».</>}>
          {input('menu', { ...urlProps, placeholder: 'https://drive.google.com/…' })}
        </Field>
      )
    case 'whatsapp':
      return (
        <div className="grid gap-[18px]">
          <Field label="Numéro WhatsApp" hint="Avec l’indicatif du pays. Un numéro qui commence par 06 ou 05 est compris comme un numéro du Congo (+242).">{input('waPhone', tel)}</Field>
          <Field label="Message déjà écrit" opt>
            <textarea className="input" rows={2} value={v.waMsg} onChange={(e) => set('waMsg', e.target.value)} placeholder="Bonjour, je vous contacte depuis votre affiche." />
          </Field>
        </div>
      )
    case 'wifi':
      return (
        <div className="grid gap-[18px]">
          <div className="grid gap-[18px] sm:grid-cols-2">
            <Field label="Nom du réseau">{input('ssid', { placeholder: 'Maquis-Wifi', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false })}</Field>
            <Field label="Mot de passe">{input('wifiPass', { type: 'text', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false, disabled: v.wifiSec === 'nopass' })}</Field>
          </div>
          <div className="grid gap-[18px] sm:grid-cols-2">
            <Field label="Sécurité">
              <select className="input" value={v.wifiSec} onChange={(e) => set('wifiSec', e.target.value)}>
                <option value="WPA">WPA / WPA2 (le plus courant)</option>
                <option value="WEP">WEP</option>
                <option value="nopass">Aucune (réseau ouvert)</option>
              </select>
            </Field>
            <label className="flex items-center gap-3 self-end pb-3.5 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" checked={v.wifiHidden} onChange={(e) => set('wifiHidden', e.target.checked)} />
              Réseau masqué
            </label>
          </div>
        </div>
      )
    case 'vcard':
      return (
        <div className="grid gap-[18px]">
          <div className="grid gap-[18px] sm:grid-cols-2">
            <Field label="Prénom">{input('first', { autoComplete: 'given-name' })}</Field>
            <Field label="Nom">{input('last', { autoComplete: 'family-name' })}</Field>
          </div>
          <div className="grid gap-[18px] sm:grid-cols-2">
            <Field label="Téléphone">{input('phone', tel)}</Field>
            <Field label="Email">{input('email', { type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'vous@exemple.cg' })}</Field>
          </div>
          <button type="button" className="link w-fit text-sm" aria-expanded={more} onClick={() => setMore((m) => !m)}>
            <ChevronDownIcon className={`h-4 w-4 transition ${more ? 'rotate-180' : ''}`} />{more ? 'Moins d’informations' : 'Entreprise, poste, site, adresse'}
          </button>
          {more && (
            <div className="grid gap-[18px] sm:grid-cols-2">
              <Field label="Entreprise" opt>{input('org', { autoComplete: 'organization' })}</Field>
              <Field label="Poste" opt>{input('title', { autoComplete: 'organization-title' })}</Field>
              <Field label="Site web" opt>{input('web', { ...urlProps, placeholder: 'https://…' })}</Field>
              <Field label="Adresse" opt>{input('addr', { autoComplete: 'street-address' })}</Field>
            </div>
          )}
        </div>
      )
    case 'app':
      return (
        <div className="grid gap-[18px]">
          <Field label="Lien de l’application" hint="App Store, Play Store ou la page de votre application sur votre site.">
            {input('appUrl', { ...urlProps, placeholder: 'https://play.google.com/store/apps/details?id=…' })}
          </Field>
          {appDevice}
        </div>
      )
    case 'texte':
      return (
        <Field label="Texte">
          <textarea className="input" rows={4} value={v.text} onChange={(e) => set('text', e.target.value)} placeholder="Horaires : du lundi au samedi, 8 h – 19 h" />
        </Field>
      )
    case 'email':
      return (
        <div className="grid gap-[18px]">
          <Field label="Adresse email">{input('mailTo', { type: 'email', inputMode: 'email', placeholder: 'contact@exemple.cg' })}</Field>
          <Field label="Objet" opt>{input('mailSubject')}</Field>
          <Field label="Message" opt><textarea className="input" rows={3} value={v.mailBody} onChange={(e) => set('mailBody', e.target.value)} /></Field>
        </div>
      )
    case 'sms':
      return (
        <div className="grid gap-[18px]">
          <Field label="Numéro">{input('smsPhone', tel)}</Field>
          <Field label="Message déjà écrit" opt><textarea className="input" rows={2} value={v.smsMsg} onChange={(e) => set('smsMsg', e.target.value)} /></Field>
        </div>
      )
    case 'appel':
      return <Field label="Numéro à appeler">{input('tel', tel)}</Field>
    case 'lieu':
      return (
        <div className="grid gap-[18px]">
          <div className="grid gap-[18px] sm:grid-cols-2">
            <Field label="Latitude">{input('lat', { inputMode: 'decimal', placeholder: '-4.2634' })}</Field>
            <Field label="Longitude">{input('lng', { inputMode: 'decimal', placeholder: '15.2429' })}</Field>
          </div>
          <Field label="Nom du lieu" opt hint={<><SparklesIcon />Dans Google Maps, appuyez longuement sur le lieu : les coordonnées s’affichent en haut.</>}>
            {input('place', { placeholder: 'Marché Total, Brazzaville' })}
          </Field>
        </div>
      )
    case 'reseaux': {
      const s = SOCIALS.find((x) => x.id === v.socialId) ?? SOCIALS[0]
      return (
        <div className="grid gap-[18px]">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Réseau social">
            {SOCIALS.map((x) => (
              <button key={x.id} type="button" className="chip h-9 text-[13px]" aria-pressed={v.socialId === x.id} onClick={() => set('socialId', x.id)}>{x.label}</button>
            ))}
          </div>
          <Field label={`Lien de votre page ${s.label}`}>{input('socialUrl', { ...urlProps, placeholder: s.placeholder })}</Field>
        </div>
      )
    }
  }
}
