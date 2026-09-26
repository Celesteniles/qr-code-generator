'use client'

import { useId, useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { isValidPhoneNumber } from 'libphonenumber-js'
import {
  countryOptions, DEFAULT_COUNTRY, dialCode, FAVORITE_COUNTRIES, flagOf, formatNational, splitPhone, toE164,
  type CountryCode,
} from '@/lib/phone'

// Champ « numéro de téléphone » : indicatif du pays (liste native, pratique au
// téléphone) + numéro national. La valeur remontée est toujours au format
// international E.164 (+242061234567), même en cours de saisie pour l'aperçu.
// Un numéro collé avec son indicatif (+33…) choisit le pays tout seul.

type Props = {
  id?: string
  value: string
  onChange: (e164: string) => void
  /** Pays par défaut quand la valeur est vide. */
  defaultCountry?: CountryCode
  required?: boolean
  autoComplete?: string
  'aria-describedby'?: string
}

export function PhoneField({ id, value, onChange, defaultCountry = DEFAULT_COUNTRY, required, autoComplete = 'tel', ...aria }: Props) {
  const auto = useId()
  const inputId = id ?? auto
  const [state, setState] = useState(() => ({ ...splitPhone(value, defaultCountry), emitted: value }))
  const [touched, setTouched] = useState(false)

  // La valeur a changé de l'extérieur (ex. « même numéro que le téléphone ») : on la relit.
  if (value !== state.emitted) setState({ ...splitPhone(value, state.country), emitted: value })

  const { country, national } = state
  const options = countryOptions()
  const favorites = FAVORITE_COUNTRIES.map((c) => options.find((o) => o.code === c)!).filter(Boolean)
  const current = options.find((o) => o.code === country)
  const invalid = touched && national.trim() !== '' && !isValidPhoneNumber(national, country)

  function emit(nextCountry: CountryCode, nextNational: string) {
    const e164 = toE164(nextNational, nextCountry)
    setState({ country: nextCountry, national: nextNational, emitted: e164 })
    onChange(e164)
  }

  function onInput(raw: string) {
    // Numéro collé avec indicatif : il décide du pays.
    if (/^\s*(\+|00)/.test(raw)) {
      const split = splitPhone(raw, country)
      emit(split.country, split.national)
      return
    }
    emit(country, raw)
  }

  const errorId = `${inputId}-err`
  const describedBy = [aria['aria-describedby'], invalid ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <div className={`input-affix ${invalid ? '!shadow-[inset_0_0_0_1.5px_var(--bad)]' : ''}`}>
        <div className="relative flex h-full shrink-0 cursor-pointer items-center gap-1.5 border-r border-line pl-4 pr-2.5 text-[15px] text-ink">
          <span aria-hidden="true" className="text-lg leading-none">{flagOf(country)}</span>
          <span className="font-medium tabular-nums">{dialCode(country)}</span>
          <ChevronDownIcon className="h-4 w-4 text-subtle" aria-hidden="true" />
          <select
            className="absolute inset-0 cursor-pointer opacity-0"
            value={country}
            aria-label={`Indicatif du pays : ${current?.name ?? country} ${dialCode(country)}`}
            onChange={(e) => emit(e.target.value as CountryCode, national)}
          >
            <optgroup label="Fréquents">
              {favorites.map((o) => <option key={`f-${o.code}`} value={o.code}>{o.flag} {o.name} ({o.dial})</option>)}
            </optgroup>
            <optgroup label="Tous les pays">
              {options.map((o) => <option key={o.code} value={o.code}>{o.flag} {o.name} ({o.dial})</option>)}
            </optgroup>
          </select>
        </div>
        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
          required={required}
          className="pl-3"
          value={national}
          placeholder={country === 'CG' ? '06 123 4567' : 'Numéro'}
          onChange={(e) => onInput(e.target.value)}
          onBlur={() => {
            setTouched(true)
            if (national.trim()) setState((s) => ({ ...s, national: formatNational(s.national, s.country) }))
          }}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
      </div>
      {invalid && (
        <p id={errorId} className="help font-medium text-bad">
          Ce numéro ne semble pas complet pour {current?.name ?? 'ce pays'}. Vérifiez-le, ou changez l&apos;indicatif.
        </p>
      )}
    </div>
  )
}
