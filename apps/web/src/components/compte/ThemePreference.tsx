'use client'

import { useSyncExternalStore } from 'react'
import { ComputerDesktopIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline'

type Choice = 'light' | 'dark' | 'auto'

// Même convention que le script de thème (app/layout) et ThemeToggle :
// `data-theme` sur <html> et clé localStorage `theme` ('light' | 'dark'),
// absence = suivre le réglage de l'appareil.
function read(): Choice {
  const t = document.documentElement.dataset.theme
  return t === 'light' || t === 'dark' ? t : 'auto'
}

function subscribe(onChange: () => void) {
  // Suit aussi la bascule de la coquille (ThemeToggle).
  const obs = new MutationObserver(onChange)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => obs.disconnect()
}

function apply(choice: Choice) {
  const root = document.documentElement
  if (choice === 'auto') delete root.dataset.theme
  else root.dataset.theme = choice
  try {
    if (choice === 'auto') localStorage.removeItem('theme')
    else localStorage.setItem('theme', choice)
  } catch { /* stockage indisponible : le choix vaut pour cette visite */ }
}

const OPTIONS: { value: Choice; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Clair', Icon: SunIcon },
  { value: 'dark', label: 'Sombre', Icon: MoonIcon },
  { value: 'auto', label: 'Automatique', Icon: ComputerDesktopIcon },
]

/** Choix du thème : clair, sombre ou comme l'appareil. */
export function ThemePreference() {
  const choice = useSyncExternalStore<Choice | null>(subscribe, read, () => null)

  return (
    <div>
      <div className="seg flex w-full [&>button]:inline-flex [&>button]:flex-1 [&>button]:items-center [&>button]:justify-center [&>button]:gap-1.5 [&_svg]:h-4 [&_svg]:w-4"
        role="group" aria-label="Thème de l'affichage">
        {OPTIONS.map(({ value, label, Icon }) => (
          <button key={value} type="button" aria-pressed={choice === value} onClick={() => apply(value)}>
            <Icon aria-hidden="true" />{label}
          </button>
        ))}
      </div>
      <p className="help">
        {choice === 'auto'
          ? 'Automatique : l’affichage suit le réglage clair ou sombre de votre appareil.'
          : 'Mémorisé sur cet appareil uniquement.'}
      </p>
    </div>
  )
}
