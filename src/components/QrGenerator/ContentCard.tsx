'use client'

import { useState, useEffect } from 'react'
import type { Lang } from './config'
import type { Translations } from './translations'
import { Card, SectionLabel, OptionBtn, IconCopy } from './atoms'
import {
  LinkIcon,
  DocumentTextIcon,
  WifiIcon,
  UserIcon,
  EnvelopeIcon,
  ChatBubbleLeftEllipsisIcon,
  PhoneIcon,
  MapPinIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'

// ── Local bilingual labels ────────────────────────────────────────────────────

const L = {
  fr: {
    copy: 'Copier', copied: 'Copié !',
    // Wi-Fi
    ssid: 'Nom du réseau (SSID)', password: 'Mot de passe', security: 'Sécurité',
    hidden: 'Réseau caché', secWpa: 'WPA / WPA2', secWep: 'WEP', secNone: 'Aucune',
    // vCard
    firstName: 'Prénom', lastName: 'Nom', phone: 'Téléphone', email: 'Email',
    org: 'Organisation', jobTitle: 'Poste', website: 'Site web', address: 'Adresse',
    // Email
    emailTo: 'Destinataire', subject: 'Objet', body: 'Message',
    // SMS / Phone
    smsPhone: 'Numéro de téléphone', message: 'Message', phoneNumber: 'Numéro de téléphone',
    // Geo
    latitude: 'Latitude', longitude: 'Longitude', place: 'Lieu (optionnel)',
    geoPlaceholder: 'Ex : Tour Eiffel',
    // App
    platform: 'Plateforme', appUrl: "URL de l'application",
    ios: 'iOS (App Store)', android: 'Android (Play Store)',
    appPlaceholderIos: 'https://apps.apple.com/app/id...',
    appPlaceholderAndroid: 'https://play.google.com/store/apps/details?id=...',
    // Social
    socialNetwork: 'Réseau social', profileUrl: 'URL du profil',
    // URL / Text
    urlPlaceholder: 'https://exemple.com', textPlaceholder: 'Votre texte...',
    // vCard collapsible
    vcMore: '+ Plus d\'infos', vcLess: '− Moins d\'infos',
  },
  en: {
    copy: 'Copy', copied: 'Copied!',
    ssid: 'Network name (SSID)', password: 'Password', security: 'Security',
    hidden: 'Hidden network', secWpa: 'WPA / WPA2', secWep: 'WEP', secNone: 'None',
    firstName: 'First name', lastName: 'Last name', phone: 'Phone', email: 'Email',
    org: 'Organization', jobTitle: 'Job title', website: 'Website', address: 'Address',
    emailTo: 'To', subject: 'Subject', body: 'Message',
    smsPhone: 'Phone number', message: 'Message', phoneNumber: 'Phone number',
    latitude: 'Latitude', longitude: 'Longitude', place: 'Place (optional)',
    geoPlaceholder: 'e.g. Eiffel Tower',
    platform: 'Platform', appUrl: 'App URL',
    ios: 'iOS (App Store)', android: 'Android (Play Store)',
    appPlaceholderIos: 'https://apps.apple.com/app/id...',
    appPlaceholderAndroid: 'https://play.google.com/store/apps/details?id=...',
    socialNetwork: 'Social network', profileUrl: 'Profile URL',
    urlPlaceholder: 'https://example.com', textPlaceholder: 'Your text...',
    vcMore: '+ More info', vcLess: '− Less info',
  },
} as const

const SOCIAL_PLATFORMS = [
  { id: 'facebook',  label: 'Facebook',   placeholder: 'https://facebook.com/yourpage' },
  { id: 'instagram', label: 'Instagram',  placeholder: 'https://instagram.com/yourhandle' },
  { id: 'linkedin',  label: 'LinkedIn',   placeholder: 'https://linkedin.com/in/yourname' },
  { id: 'x',         label: 'X',          placeholder: 'https://x.com/yourhandle' },
  { id: 'youtube',   label: 'YouTube',    placeholder: 'https://youtube.com/@yourchannel' },
  { id: 'tiktok',    label: 'TikTok',     placeholder: 'https://tiktok.com/@yourhandle' },
  { id: 'snapchat',  label: 'Snapchat',   placeholder: 'https://snapchat.com/add/yourhandle' },
  { id: 'whatsapp',  label: 'WhatsApp',   placeholder: 'https://wa.me/242060000000' },
  { id: 'pinterest', label: 'Pinterest',  placeholder: 'https://pinterest.com/yourprofile' },
]

// ── Type ──────────────────────────────────────────────────────────────────────

type QrType = 'url' | 'text' | 'wifi' | 'vcard' | 'email' | 'sms' | 'phone' | 'geo' | 'app' | 'social'

// ── WiFi string escaping ──────────────────────────────────────────────────────

function wifiEsc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/"/g, '\\"').replace(/,/g, '\\,')
}

// ── Form helpers ──────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
const labelCls = 'text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1.5'

function Field({ label, value, onChange, placeholder, type = 'text', rows }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; rows?: number
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {rows
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={`${inputCls} resize-none`} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
      }
    </label>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
      <span className="text-xs text-zinc-600 dark:text-zinc-400">{label}</span>
    </label>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ContentCard({ t, lang, onChange }: {
  t: Translations
  lang: Lang
  onChange: (text: string) => void
}) {
  const l = L[lang]

  const [qrType, setQrType] = useState<QrType>('url')
  const [copied, setCopied] = useState(false)
  const [vcExpanded, setVcExpanded] = useState(false)

  // Form state
  const [urlValue,     setUrlValue]     = useState('https://example.com')
  const [textValue,    setTextValue]    = useState('')
  const [wifiSsid,     setWifiSsid]     = useState('')
  const [wifiPassword, setWifiPassword] = useState('')
  const [wifiSecurity, setWifiSecurity] = useState('WPA')
  const [wifiHidden,   setWifiHidden]   = useState(false)
  const [vcFirst,      setVcFirst]      = useState('')
  const [vcLast,       setVcLast]       = useState('')
  const [vcPhone,      setVcPhone]      = useState('')
  const [vcEmail,      setVcEmail]      = useState('')
  const [vcOrg,        setVcOrg]        = useState('')
  const [vcTitle,      setVcTitle]      = useState('')
  const [vcWeb,        setVcWeb]        = useState('')
  const [vcAddr,       setVcAddr]       = useState('')
  const [emlTo,        setEmlTo]        = useState('')
  const [emlSubject,   setEmlSubject]   = useState('')
  const [emlBody,      setEmlBody]      = useState('')
  const [smsPhone,     setSmsPhone]     = useState('')
  const [smsMsg,       setSmsMsg]       = useState('')
  const [telPhone,     setTelPhone]     = useState('')
  const [geoLat,       setGeoLat]       = useState('')
  const [geoLng,       setGeoLng]       = useState('')
  const [geoQ,         setGeoQ]         = useState('')
  const [appPlatform,  setAppPlatform]  = useState('ios')
  const [appUrl,       setAppUrl]       = useState('')
  const [socialId,     setSocialId]     = useState('facebook')
  const [socialUrl,    setSocialUrl]    = useState('')

  // ── Text generator ──────────────────────────────────────────────────────────

  const buildText = (): string => {
    switch (qrType) {
      case 'url':   return urlValue.trim() || 'https://example.com'
      case 'text':  return textValue
      case 'wifi':  return `WIFI:T:${wifiSecurity};S:${wifiEsc(wifiSsid)};P:${wifiEsc(wifiPassword)};H:${wifiHidden};;`
      case 'vcard': {
        const lines = ['BEGIN:VCARD', 'VERSION:3.0']
        if (vcLast || vcFirst) {
          lines.push(`N:${vcLast};${vcFirst};;;`)
          lines.push(`FN:${[vcFirst, vcLast].filter(Boolean).join(' ')}`)
        }
        if (vcOrg)   lines.push(`ORG:${vcOrg}`)
        if (vcTitle) lines.push(`TITLE:${vcTitle}`)
        if (vcPhone) lines.push(`TEL:${vcPhone}`)
        if (vcEmail) lines.push(`EMAIL:${vcEmail}`)
        if (vcWeb)   lines.push(`URL:${vcWeb}`)
        if (vcAddr)  lines.push(`ADR:;;${vcAddr};;;;`)
        lines.push('END:VCARD')
        return lines.join('\n')
      }
      case 'email': {
        const params: string[] = []
        if (emlSubject) params.push(`subject=${encodeURIComponent(emlSubject)}`)
        if (emlBody)    params.push(`body=${encodeURIComponent(emlBody)}`)
        return `mailto:${emlTo}${params.length ? '?' + params.join('&') : ''}`
      }
      case 'sms':   return `smsto:${smsPhone}:${smsMsg}`
      case 'phone': return `tel:${telPhone}`
      case 'geo': {
        if (!geoLat || !geoLng) return ''
        const q = geoQ.trim() ? `?q=${encodeURIComponent(geoQ)}` : ''
        return `geo:${geoLat},${geoLng}${q}`
      }
      case 'app':    return appUrl.trim()
      case 'social': return socialUrl.trim()
    }
  }

  // Propagate to parent on any state change
  useEffect(() => {
    onChange(buildText())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrType, urlValue, textValue, wifiSsid, wifiPassword, wifiSecurity, wifiHidden,
      vcFirst, vcLast, vcPhone, vcEmail, vcOrg, vcTitle, vcWeb, vcAddr,
      emlTo, emlSubject, emlBody, smsPhone, smsMsg, telPhone,
      geoLat, geoLng, geoQ, appPlatform, appUrl, socialId, socialUrl])

  const copy = async () => {
    await navigator.clipboard.writeText(buildText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Type selector ───────────────────────────────────────────────────────────

  type IconComponent = React.ComponentType<{ className?: string }>
  const TYPES: { id: QrType; label: string; Icon: IconComponent }[] = [
    { id: 'url',    label: t.typeUrl,    Icon: LinkIcon },
    { id: 'text',   label: t.typeText,   Icon: DocumentTextIcon },
    { id: 'wifi',   label: t.typeWifi,   Icon: WifiIcon },
    { id: 'vcard',  label: t.typeVcard,  Icon: UserIcon },
    { id: 'email',  label: t.typeEmail,  Icon: EnvelopeIcon },
    { id: 'sms',    label: t.typeSms,    Icon: ChatBubbleLeftEllipsisIcon },
    { id: 'phone',  label: t.typePhone,  Icon: PhoneIcon },
    { id: 'geo',    label: t.typeGeo,    Icon: MapPinIcon },
    { id: 'app',    label: t.typeApp,    Icon: DevicePhoneMobileIcon },
    { id: 'social', label: t.typeSocial, Icon: GlobeAltIcon },
  ]

  const socialPlatformData = SOCIAL_PLATFORMS.find(p => p.id === socialId) ?? SOCIAL_PLATFORMS[0]

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Card>
      <SectionLabel>{t.contentType}</SectionLabel>

      {/* Type selector — grille 5×2 */}
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {TYPES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setQrType(id)}
            className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border text-[10px] font-semibold transition-all ${
              qrType === id
                ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="leading-tight text-center">{label}</span>
          </button>
        ))}
      </div>

      {/* ── URL ── */}
      {qrType === 'url' && (
        <div className="relative">
          <textarea
            value={urlValue}
            onChange={e => setUrlValue(e.target.value)}
            rows={3}
            placeholder={l.urlPlaceholder}
            className={`${inputCls} resize-none pr-11`}
          />
          <button type="button" onClick={copy} title={copied ? l.copied : l.copy}
            className="absolute top-2.5 right-2.5 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">
            <IconCopy done={copied} />
          </button>
        </div>
      )}

      {/* ── Texte ── */}
      {qrType === 'text' && (
        <div className="relative">
          <textarea
            value={textValue}
            onChange={e => setTextValue(e.target.value)}
            rows={4}
            placeholder={l.textPlaceholder}
            className={`${inputCls} resize-none pr-11`}
          />
          <button type="button" onClick={copy} title={copied ? l.copied : l.copy}
            className="absolute top-2.5 right-2.5 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">
            <IconCopy done={copied} />
          </button>
        </div>
      )}

      {/* ── Wi-Fi ── */}
      {qrType === 'wifi' && (
        <div className="space-y-3">
          <Field label={l.ssid}     value={wifiSsid}     onChange={setWifiSsid}     placeholder="MonReseau" />
          <Field label={l.password} value={wifiPassword} onChange={setWifiPassword} type="password" placeholder="••••••••" />
          <SelectField
            label={l.security} value={wifiSecurity} onChange={setWifiSecurity}
            options={[
              { value: 'WPA',    label: l.secWpa },
              { value: 'WEP',    label: l.secWep },
              { value: 'nopass', label: l.secNone },
            ]}
          />
          <CheckField label={l.hidden} checked={wifiHidden} onChange={setWifiHidden} />
        </div>
      )}

      {/* ── vCard ── */}
      {qrType === 'vcard' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={l.firstName} value={vcFirst} onChange={setVcFirst} />
            <Field label={l.lastName}  value={vcLast}  onChange={setVcLast}  />
          </div>
          <Field label={l.phone} value={vcPhone} onChange={setVcPhone} type="tel"   placeholder="+242 06 000 0000" />
          <Field label={l.email} value={vcEmail} onChange={setVcEmail} type="email" placeholder="nom@exemple.com" />

          {/* Champs optionnels */}
          <button
            type="button"
            onClick={() => setVcExpanded(v => !v)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-blue-500 transition-colors"
          >
            <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${vcExpanded ? 'rotate-180' : ''}`} />
            {vcExpanded ? l.vcLess : l.vcMore}
          </button>

          {vcExpanded && (
            <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Field label={l.org}      value={vcOrg}   onChange={setVcOrg}   />
              <Field label={l.jobTitle} value={vcTitle} onChange={setVcTitle} />
              <Field label={l.website}  value={vcWeb}   onChange={setVcWeb}   type="url" placeholder="https://..." />
              <Field label={l.address}  value={vcAddr}  onChange={setVcAddr}  />
            </div>
          )}
        </div>
      )}

      {/* ── Email ── */}
      {qrType === 'email' && (
        <div className="space-y-3">
          <Field label={l.emailTo} value={emlTo}      onChange={setEmlTo}      type="email" placeholder="destinataire@exemple.com" />
          <Field label={l.subject} value={emlSubject}  onChange={setEmlSubject} />
          <Field label={l.body}    value={emlBody}    onChange={setEmlBody}    rows={3} />
        </div>
      )}

      {/* ── SMS ── */}
      {qrType === 'sms' && (
        <div className="space-y-3">
          <Field label={l.smsPhone} value={smsPhone} onChange={setSmsPhone} type="tel" placeholder="+242 06 000 0000" />
          <Field label={l.message}  value={smsMsg}   onChange={setSmsMsg}   rows={3} />
        </div>
      )}

      {/* ── Téléphone ── */}
      {qrType === 'phone' && (
        <Field label={l.phoneNumber} value={telPhone} onChange={setTelPhone} type="tel" placeholder="+242 06 000 0000" />
      )}

      {/* ── Localisation ── */}
      {qrType === 'geo' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={l.latitude}  value={geoLat} onChange={setGeoLat} placeholder="48.8566" />
            <Field label={l.longitude} value={geoLng} onChange={setGeoLng} placeholder="2.3522" />
          </div>
          <Field label={l.place} value={geoQ} onChange={setGeoQ} placeholder={l.geoPlaceholder} />
        </div>
      )}

      {/* ── App ── */}
      {qrType === 'app' && (
        <div className="space-y-3">
          <SelectField
            label={l.platform} value={appPlatform} onChange={setAppPlatform}
            options={[
              { value: 'ios',     label: l.ios },
              { value: 'android', label: l.android },
            ]}
          />
          <Field
            label={l.appUrl} value={appUrl} onChange={setAppUrl} type="url"
            placeholder={appPlatform === 'ios' ? l.appPlaceholderIos : l.appPlaceholderAndroid}
          />
        </div>
      )}

      {/* ── Réseaux sociaux ── */}
      {qrType === 'social' && (
        <div className="space-y-3">
          <div>
            <span className={labelCls}>{l.socialNetwork}</span>
            <div className="flex flex-wrap gap-1.5">
              {SOCIAL_PLATFORMS.map(p => (
                <OptionBtn
                  key={p.id}
                  active={socialId === p.id}
                  onClick={() => { setSocialId(p.id); setSocialUrl('') }}
                >
                  {p.label}
                </OptionBtn>
              ))}
            </div>
          </div>
          <Field
            label={l.profileUrl} value={socialUrl} onChange={setSocialUrl} type="url"
            placeholder={socialPlatformData.placeholder}
          />
        </div>
      )}
    </Card>
  )
}
