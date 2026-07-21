// Entrées des sérialiseurs de contenu QR. Un type par nature de contenu.

export type QrType =
  | 'url' | 'text' | 'wifi' | 'vcard' | 'email'
  | 'sms' | 'phone' | 'geo' | 'app' | 'social'

export interface WifiInput {
  ssid: string
  password: string
  /** 'WPA' | 'WEP' | 'nopass' — libre pour rester aligné sur l'UI actuelle. */
  security: string
  hidden: boolean
}

export interface VCardInput {
  first?: string
  last?: string
  phone?: string
  email?: string
  org?: string
  title?: string
  web?: string
  addr?: string
}

export interface EmailInput {
  to: string
  subject?: string
  body?: string
}

export interface SmsInput {
  phone: string
  message?: string
}

export interface GeoInput {
  lat: string
  lng: string
  /** Libellé optionnel du point. */
  query?: string
}
