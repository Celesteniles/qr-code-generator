'use client'

import { MoonIcon } from '@heroicons/react/24/outline'

/** Bascule clair/sombre, mémorisée (voir le script de thème dans app/layout). */
export function ThemeToggle({ className = 'icon-btn' }: { className?: string }) {
  function toggle() {
    const root = document.documentElement
    const dark = root.dataset.theme === 'dark' ||
      (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)
    const next = dark ? 'light' : 'dark'
    root.dataset.theme = next
    try { localStorage.setItem('theme', next) } catch { /* stockage indisponible */ }
  }
  return (
    <button type="button" onClick={toggle} className={className} aria-label="Changer de thème">
      <MoonIcon />
    </button>
  )
}
