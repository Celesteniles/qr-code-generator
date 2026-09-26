'use client'

import { useId, useRef, useState } from 'react'

// Onglets accessibles (tablist / tab / tabpanel, flèches du clavier). Les panneaux
// sont rendus côté serveur et passés en props ; seuls les masqués sont `hidden`.

export interface StatsTab { id: string; label: string; content: React.ReactNode }

export function StatsTabs({ tabs, label }: { tabs: StatsTab[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id)
  const base = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKey(e: React.KeyboardEvent, i: number) {
    let next = -1
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    if (next < 0) return
    e.preventDefault()
    setActive(tabs[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="seg" role="tablist" aria-label={label}>
          {tabs.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => { refs.current[i] = el }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-controls={`${base}-panel-${t.id}`}
              aria-selected={active === t.id}
              tabIndex={active === t.id ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-panel-${t.id}`}
          aria-labelledby={`${base}-tab-${t.id}`}
          hidden={active !== t.id}
          tabIndex={0}
          className="mt-5 rounded-lg outline-none focus-visible:shadow-[var(--ring)]"
        >
          {t.content}
        </div>
      ))}
    </div>
  )
}
