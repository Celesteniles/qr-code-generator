// Numéros de téléphone : normalisation au format international E.164 (+242061234567)
// avec libphonenumber-js. Partagé par le champ PhoneField, les actions serveur,
// la carte de visite et sa fiche contact.

import {
  AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'

import { COUNTRY_NAMES_FR } from './countries-fr'

export type { CountryCode }

/** Pays par défaut : un numéro saisi sans indicatif est compris comme congolais. */
export const DEFAULT_COUNTRY: CountryCode = 'CG'

/** Pays proposés en tête de liste. */
export const FAVORITE_COUNTRIES: CountryCode[] = ['CG', 'CD', 'GA', 'CM', 'CF', 'AO', 'CI', 'SN', 'FR', 'BE']

export interface CountryOption { code: CountryCode; name: string; dial: string; flag: string }

/** Drapeau emoji d'un code pays (lettres régionales). */
export function flagOf(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

let cached: CountryOption[] | null = null
/** Tous les pays, noms en français (table figée, identique serveur et navigateur), triés. */
export function countryOptions(): CountryOption[] {
  if (cached) return cached
  // Ordre de la table (déjà triée à la française, accents compris).
  const known = new Set<string>(getCountries())
  cached = Object.keys(COUNTRY_NAMES_FR)
    .filter((code) => known.has(code))
    .map((code) => ({ code: code as CountryCode, name: COUNTRY_NAMES_FR[code], dial: `+${getCountryCallingCode(code as CountryCode)}`, flag: flagOf(code) }))
  return cached
}

export function dialCode(country: CountryCode): string {
  return `+${getCountryCallingCode(country)}`
}

/**
 * Numéro saisi → format international E.164. Sans indicatif, il est compris dans le
 * pays donné (Congo par défaut). null si ce n'est pas un numéro valide.
 */
export function normalizePhone(raw: string, country: CountryCode = DEFAULT_COUNTRY): string | null {
  const v = raw.trim()
  if (!v) return null
  const p = parsePhoneNumberFromString(v.startsWith('00') ? `+${v.slice(2)}` : v, country)
  return p && p.isValid() ? p.number : null
}

/** Numéro lisible, au format international (« +242 06 123 4567 ») ; tel quel sinon. */
export function formatPhone(raw: string, country: CountryCode = DEFAULT_COUNTRY): string {
  const v = raw.trim()
  const p = v ? parsePhoneNumberFromString(v, country) : undefined
  return p && p.isValid() ? p.formatInternational() : v
}

/** Lien tel: (E.164 si possible). */
export function telHref(raw: string): string {
  return `tel:${normalizePhone(raw) ?? raw.replace(/[^\d+]/g, '')}`
}

/** Découpe une valeur (E.164 ou ancien format local) en pays + numéro national lisible. */
export function splitPhone(value: string, fallback: CountryCode = DEFAULT_COUNTRY): { country: CountryCode; national: string } {
  const v = value.trim()
  if (!v) return { country: fallback, national: '' }
  const p = parsePhoneNumberFromString(v.startsWith('00') ? `+${v.slice(2)}` : v, fallback)
  if (p) return { country: p.country ?? fallback, national: p.formatNational() }
  return { country: fallback, national: v }
}

/** Numéro national (+ pays) → E.164, même incomplet (pour l'aperçu en direct). */
export function toE164(national: string, country: CountryCode): string {
  const digits = national.replace(/\D/g, '')
  if (!digits) return ''
  const p = parsePhoneNumberFromString(national, country)
  return p ? p.number : `${dialCode(country)}${digits}`
}

/** Mise en forme au fil de la frappe, pour l'affichage à la sortie du champ. */
export function formatNational(national: string, country: CountryCode): string {
  return new AsYouType(country).input(national)
}
