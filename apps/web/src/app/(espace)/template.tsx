import type { ReactNode } from 'react'

// Un template est remonté à chaque navigation (contrairement au layout) : il
// sert à faire entrer chaque écran en douceur.
export default function EspaceTemplate({ children }: { children: ReactNode }) {
  return <div className="anim-page">{children}</div>
}
