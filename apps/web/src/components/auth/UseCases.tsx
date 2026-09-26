'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import {
  BuildingOffice2Icon, BuildingStorefrontIcon, CalendarDaysIcon, HomeModernIcon, ShoppingBagIcon, SparklesIcon,
} from '@heroicons/react/24/outline'
import { Illustration, type IllustrationName } from '@/components/kit/Illustration'

// Vitrine « Pour qui ? » de l'écran de connexion : un métier par onglet, avec un
// scénario concret et les outils link.cg qu'il utilise. Uniquement des usages que
// le produit permet aujourd'hui (pas d'import en masse, pas de multi-utilisateurs).

type UseCase = {
  id: string
  label: string
  icon: typeof BuildingOffice2Icon
  ill: IllustrationName
  tint: string
  title: string
  story: string
  tools: string[]
}

const CASES: UseCase[] = [
  {
    id: 'resto', label: 'Restaurants', icon: BuildingStorefrontIcon, ill: 'menu', tint: 'bg-sun',
    title: 'Le menu sur chaque table, toujours à jour',
    story: 'Le QR est imprimé une fois sur les tables. Les plats et les prix changent : vous mettez le lien à jour, les QR restent les mêmes.',
    tools: ['QR modifiable', 'Visites par jour'],
  },
  {
    id: 'entreprise', label: 'Entreprises', icon: BuildingOffice2Icon, ill: 'team', tint: 'bg-coral-tint',
    title: 'Une carte de visite digitale par employé',
    story: 'Nom, poste, téléphone, WhatsApp : chaque collaborateur a sa carte et son QR pour le badge ou la signature. Un changement de poste ? On modifie, rien à réimprimer.',
    tools: ['Cartes de visite', 'QR pour badges', 'Enregistrer le contact'],
  },
  {
    id: 'boutique', label: 'Boutiques', icon: ShoppingBagIcon, ill: 'share', tint: 'bg-mint',
    title: 'Des liens courts pour vendre sur WhatsApp',
    story: 'Un lien propre dans vos statuts et vos groupes, le même en QR sur la vitrine et les sacs. Vous voyez chaque jour combien de clients l’ouvrent.',
    tools: ['Lien court', 'QR en vitrine', 'Visites'],
  },
  {
    id: 'evenement', label: 'Événements', icon: CalendarDaysIcon, ill: 'welcome', tint: 'bg-sky',
    title: 'Une affiche, un QR, zéro réimpression',
    story: 'Inscriptions avant l’événement, programme le jour J, photos après : le QR de l’affiche mène à la bonne page à chaque étape.',
    tools: ['QR modifiable', 'Lien court'],
  },
  {
    id: 'lieu', label: 'Hôtels & lieux', icon: HomeModernIcon, ill: 'wifi', tint: 'bg-lilac',
    title: 'Le Wi‑Fi et vos services en un geste',
    story: 'Un QR Wi‑Fi dans chaque chambre : on se connecte sans taper le mot de passe. Et un lien vers votre application, qui ouvre le bon store selon le téléphone.',
    tools: ['QR Wi‑Fi gratuit', 'Selon le téléphone'],
  },
]

const ROTATE_MS = 6000

export function UseCases() {
  const [index, setIndex] = useState(0)
  // Défilement automatique jusqu'à la première interaction ; en pause au survol/focus.
  const [auto, setAuto] = useState(true)
  const [paused, setPaused] = useState(false)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const baseId = useId()

  useEffect(() => {
    if (!auto || paused) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => setIndex((i) => (i + 1) % CASES.length), ROTATE_MS)
    return () => clearTimeout(t)
  }, [auto, paused, index])

  function select(i: number, focus = false) {
    setAuto(false)
    setIndex(i)
    if (focus) tabs.current[i]?.focus()
  }

  // Onglets au clavier : flèches, Début, Fin
  function onKeyDown(e: KeyboardEvent) {
    const last = CASES.length - 1
    const next = e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0 : e.key === 'End' ? last : null
    if (next === null) return
    e.preventDefault()
    select(next, true)
  }

  const c = CASES[index]

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <h2 className="mt-8 max-w-[18ch] font-display text-[clamp(28px,2.6vw,40px)] font-bold leading-[1.05] tracking-[-.03em]">
        Pour tous ceux qui ont quelque chose à partager.
      </h2>

      <div role="tablist" aria-label="Exemples par métier" className="mt-6 flex flex-wrap gap-2" onKeyDown={onKeyDown}>
        {CASES.map((u, i) => {
          const Icon = u.icon
          const on = i === index
          return (
            <button
              key={u.id}
              ref={(el) => { tabs.current[i] = el }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${u.id}`}
              aria-selected={on}
              aria-controls={`${baseId}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => select(i)}
              className={`relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full px-4 text-sm font-semibold transition ${
                on ? 'bg-ink text-bg' : 'bg-surface/70 text-ink hover:bg-surface'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {u.label}
              {/* Progression du défilement automatique */}
              {on && auto && !paused && (
                <span
                  key={index}
                  className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-brand"
                  style={{ animation: `grow ${ROTATE_MS}ms linear both` }}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${c.id}`}
        aria-live={auto ? 'off' : 'polite'}
        className="mt-5 flex min-h-0 flex-1 flex-col rounded-[26px] bg-surface/80 p-5 shadow-[0_0_0_1px_var(--line)] backdrop-blur"
      >
        <div key={c.id} className="anim-rise flex min-h-0 flex-1 flex-col">
          {/* L'illustration s'ajuste à la place disponible (hauteur ET largeur), sans être rognée */}
          <div className={`relative min-h-[150px] flex-1 overflow-hidden rounded-[20px] ${c.tint}`}>
            <Illustration name={c.ill} className="absolute inset-3 [&_svg]:h-full [&_svg]:w-full" />
          </div>
          <h3 className="h3 mt-5 text-[21px]">{c.title}</h3>
          <p className="mt-2 max-w-[52ch] text-[15px] text-muted">{c.story}</p>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Ce qu'ils utilisent">
            {c.tools.map((t) => (
              <li key={t} className="pill pill-soft"><SparklesIcon aria-hidden="true" />{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
