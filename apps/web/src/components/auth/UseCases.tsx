'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import {
  BuildingOffice2Icon, BuildingStorefrontIcon, CalendarDaysIcon, HomeModernIcon, PauseIcon, PlayIcon, ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import { Illustration, type IllustrationName } from '@/components/kit/Illustration'
import { Logo } from '@/components/kit/Logo'

// Vitrine « Pour qui ? » de l'écran de connexion, façon « stories » : une barre de
// progression par métier en haut, une scène épurée au centre (illustration, titre,
// scénario). Uniquement des usages que le produit permet aujourd'hui.
//
// Mécanique : c'est la FIN de l'animation de la barre active qui fait avancer
// (pas de minuteur séparé). Mettre en pause = figer l'animation : la barre et le
// défilement restent synchronisés, à la milliseconde près.

type UseCase = {
  id: string
  label: string
  icon: typeof BuildingOffice2Icon
  ill: IllustrationName
  tint: string
  title: string
  story: string
}

const CASES: UseCase[] = [
  {
    id: 'resto', label: 'Restaurants', icon: BuildingStorefrontIcon, ill: 'menu', tint: 'bg-sun',
    title: 'Le menu sur chaque table, toujours à jour',
    story: 'Le QR est imprimé une fois sur les tables. Les plats et les prix changent : vous mettez le lien à jour, les QR restent les mêmes.',
  },
  {
    id: 'entreprise', label: 'Entreprises', icon: BuildingOffice2Icon, ill: 'team', tint: 'bg-coral-tint',
    title: 'Une carte de visite digitale par employé',
    story: 'Nom, poste, téléphone, WhatsApp : chaque collaborateur a sa carte et son QR pour le badge ou la signature. Un changement de poste ? On modifie, rien à réimprimer.',
  },
  {
    id: 'boutique', label: 'Boutiques', icon: ShoppingBagIcon, ill: 'share', tint: 'bg-mint',
    title: 'Des liens courts pour vendre sur WhatsApp',
    story: 'Un lien propre dans vos statuts et vos groupes, le même en QR sur la vitrine et les sacs. Vous voyez chaque jour combien de clients l’ouvrent.',
  },
  {
    id: 'evenement', label: 'Événements', icon: CalendarDaysIcon, ill: 'welcome', tint: 'bg-sky',
    title: 'Une affiche, un QR, zéro réimpression',
    story: 'Inscriptions avant l’événement, programme le jour J, photos après : le QR de l’affiche mène à la bonne page à chaque étape.',
  },
  {
    id: 'lieu', label: 'Hôtels & lieux', icon: HomeModernIcon, ill: 'wifi', tint: 'bg-lilac',
    title: 'Le Wi‑Fi et vos services en un geste',
    story: 'Un QR Wi‑Fi dans chaque chambre : on se connecte sans taper le mot de passe. Et un lien vers votre application, qui ouvre le bon store selon le téléphone.',
  },
]

const SLIDE_MS = 6000
const N = CASES.length

/** Position d'une scène par rapport à l'active, au plus court (boucle) : -2…2. */
function offsetOf(i: number, index: number) {
  return ((i - index + N + Math.floor(N / 2)) % N) - Math.floor(N / 2)
}

export function UseCases() {
  const [index, setIndex] = useState(0)
  // Lecture choisie par la personne (bouton pause/lecture)
  const [playing, setPlaying] = useState(true)
  // Pauses automatiques : survol/focus, panneau hors écran, onglet en arrière-plan
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)
  // « Réduire les animations » : pas de défilement automatique du tout
  const [reduced, setReduced] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  // Geste en cours : hors état React (aucun rendu pendant le glissement)
  const gesture = useRef<{ id: number; x: number; y: number; t: number; dx: number; horizontal: boolean | null } | null>(null)
  const baseId = useId()

  useEffect(() => {
    const el = root.current
    if (!el) return
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    let inView = false
    const update = () => {
      setVisible(inView && document.visibilityState === 'visible')
      setReduced(mq.matches)
    }
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; update() })
    io.observe(el)
    document.addEventListener('visibilitychange', update)
    mq.addEventListener('change', update)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', update); mq.removeEventListener('change', update) }
  }, [])

  const running = playing && !reduced && !hovered && visible

  const go = (i: number) => setIndex(((i % N) + N) % N)

  function onKeyDown(e: KeyboardEvent) {
    const next = e.key === 'ArrowRight' ? index + 1 : e.key === 'ArrowLeft' ? index - 1
      : e.key === 'Home' ? 0 : e.key === 'End' ? N - 1 : null
    if (next === null) return
    e.preventDefault()
    go(next)
  }

  // ── Glissement (doigt ou souris) sur la scène ──
  function setDrag(px: number, dragging: boolean) {
    const v = stage.current
    if (!v) return
    v.style.setProperty('--drag', `${px}px`)
    v.dataset.dragging = dragging ? 'true' : 'false'
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, horizontal: null }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g || g.id !== e.pointerId) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    // Décidé une fois : geste horizontal (scènes) ou vertical (défilement de la page)
    if (g.horizontal === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      g.horizontal = Math.abs(dx) > Math.abs(dy)
      if (!g.horizontal) { gesture.current = null; return }
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    g.dx = dx
    setDrag(dx, true)
  }
  function onPointerEnd(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g || g.id !== e.pointerId) return
    gesture.current = null
    const width = e.currentTarget.clientWidth || 1
    const speed = g.dx / Math.max(1, performance.now() - g.t) // px/ms
    const flick = Math.abs(speed) > 0.45 && Math.abs(g.dx) > 24 // geste court mais rapide
    setDrag(0, false)
    if (g.horizontal && (g.dx < -width * 0.18 || (flick && g.dx < 0))) go(index + 1)
    else if (g.horizontal && (g.dx > width * 0.18 || (flick && g.dx > 0))) go(index - 1)
  }

  return (
    <div
      ref={root}
      className="flex min-h-0 flex-1 flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHovered(false) }}
      onKeyDown={onKeyDown}
    >
      {/* Progression façon « stories » : passée pleine, active qui se remplit, à venir vide */}
      <div className="flex items-center gap-3" aria-label="Exemples par métier">
        <div className="flex grow gap-1.5">
          {CASES.map((c, i) => {
            const state = i < index ? 'done' : i === index ? 'active' : 'todo'
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`${c.label} (${i + 1} sur ${N})`}
                aria-current={i === index ? 'true' : undefined}
                aria-controls={`${baseId}-stage`}
                className="group/bar grow py-2"
              >
                <span className="relative block h-1 overflow-hidden rounded-full bg-ink/15 transition-[height] duration-200 group-hover/bar:h-1.5">
                  {state === 'done' && <span className="absolute inset-0 rounded-full bg-ink" />}
                  {state === 'active' && (
                    <span
                      key={index}
                      className="absolute inset-0 origin-left rounded-full bg-ink"
                      style={reduced
                        ? undefined
                        : { animation: `grow ${SLIDE_MS}ms linear both`, animationPlayState: running ? 'running' : 'paused' }}
                      onAnimationEnd={() => go(index + 1)}
                    />
                  )}
                </span>
              </button>
            )
          })}
        </div>
        {!reduced && (
          <button
            type="button"
            className="icon-btn -mr-2 h-8 w-8"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Mettre le défilement en pause' : 'Reprendre le défilement'}
            aria-pressed={!playing}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
        )}
      </div>

      <div className="mt-6"><Logo /></div>

      <h2 className="mt-8 max-w-[18ch] font-display text-[clamp(28px,2.6vw,40px)] font-bold leading-[1.05] tracking-[-.03em]">
        Pour tous ceux qui ont quelque chose à partager.
      </h2>

      {/* Raccourcis par métier */}
      <div className="mt-6 flex flex-wrap gap-2" aria-label="Aller à un métier">
        {CASES.map((u, i) => {
          const Icon = u.icon
          const on = i === index
          return (
            <button
              key={u.id}
              type="button"
              aria-pressed={on}
              aria-controls={`${baseId}-stage`}
              onClick={() => go(i)}
              className={`inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-300 ${
                on ? 'bg-ink text-bg' : 'bg-surface/60 text-ink hover:bg-surface'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {u.label}
            </button>
          )
        })}
      </div>

      {/* Scène : chaque métier est placé selon son écart à l'actif (-1, 0, +1),
          la boucle est continue ; l'illustration puis le texte entrent en décalé. */}
      <div
        ref={stage}
        id={`${baseId}-stage`}
        aria-roledescription="carrousel"
        aria-live={running ? 'off' : 'polite'}
        data-dragging="false"
        className="group/stage relative mt-6 min-h-0 flex-1 cursor-grab touch-pan-y select-none overflow-hidden data-[dragging=true]:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {CASES.map((c, i) => {
          const off = offsetOf(i, index)
          const active = off === 0
          const near = Math.abs(off) <= 1
          return (
            <div
              key={c.id}
              role="group"
              aria-roledescription="diapositive"
              aria-label={`${i + 1} sur ${N} : ${c.label}`}
              aria-hidden={!active}
              inert={!active}
              data-active={active}
              className={`group/slide absolute inset-0 flex flex-col ${
                near
                  ? 'transition-transform duration-[650ms] ease-[cubic-bezier(.22,.8,.2,1)] group-data-[dragging=true]/stage:transition-none'
                  : 'invisible'
              }`}
              style={{ transform: `translateX(calc(${off * 100}% + ${off * 24}px + var(--drag, 0px)))` }}
            >
              <div
                className={`relative min-h-[140px] flex-1 overflow-hidden rounded-[26px] ${c.tint} transition-[opacity,transform] duration-[650ms] ease-[cubic-bezier(.22,.8,.2,1)] ${
                  active ? 'scale-100 opacity-100' : 'scale-[.94] opacity-40'
                }`}
              >
                <Illustration name={c.ill} className="pointer-events-none absolute inset-4 [&_svg]:h-full [&_svg]:w-full" />
              </div>
              <h3
                className={`h3 mt-6 text-[22px] transition-[opacity,transform] duration-500 ${
                  active ? 'translate-y-0 opacity-100 delay-150' : 'translate-y-2 opacity-0'
                }`}
              >
                {c.title}
              </h3>
              <p
                className={`mt-2 max-w-[50ch] text-[15px] text-muted transition-[opacity,transform] duration-500 ${
                  active ? 'translate-y-0 opacity-100 delay-[250ms]' : 'translate-y-2 opacity-0'
                }`}
              >
                {c.story}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
