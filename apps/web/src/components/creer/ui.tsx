'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { CheckIcon, DocumentDuplicateIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { checkSlugAction } from '@/server/actions'
import type { SlugCheck } from '@/server/config'
import type { Viewer } from '@/components/kit/shell/types'
import { SHORT_HOST, slugify } from './helpers'

// Briques d'interface de l'écran Créer (questions numérotées, tiroir, copie, adresse courte).

/** Question numérotée : pastille + titre + aide, contenu décalé sous le titre (desktop). */
export function Question({ n, title, hint, children }: { n: number; title: ReactNode; hint?: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="border-b border-line py-7 first:pt-2 last:border-b-0">
      <div className="mb-[18px] flex items-start gap-3.5">
        <span className="mt-0.5 grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-ink text-[13px] font-bold text-bg" aria-hidden="true">{n}</span>
        <div className="min-w-0">
          <h2 id={id} className="h2">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
      </div>
      <div className="md:pl-11">{children}</div>
    </section>
  )
}

/** Libellé visible seulement des lecteurs d'écran. */
export function Sr({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Bouton copier : confirme « Copié » pendant 1,5 s (texte + annonce). */
export function CopyButton({ text, label = 'Copier le lien', withText = false, className }: {
  text: string; label?: string; withText?: boolean; className?: string
}) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), 1500)
    return () => clearTimeout(t)
  }, [done])
  const Icon = done ? CheckIcon : DocumentDuplicateIcon
  return (
    <button
      type="button"
      className={className ?? (withText ? 'btn btn-soft grow' : 'icon-btn')}
      aria-label={withText ? undefined : done ? 'Copié' : label}
      onClick={async () => { if (await copyText(text)) setDone(true) }}
    >
      <Icon className={done ? 'anim-pop text-ok' : undefined} />
      {withText && (done ? 'Copié' : 'Copier')}
      <span className="sr-only" aria-live="polite">{done ? 'Lien copié' : ''}</span>
    </button>
  )
}

/** Tiroir modal : role=dialog, Échap ferme, focus piégé puis rendu à l'élément d'origine. */
export function Drawer({ open, onClose, label, children, footer }: {
  open: boolean; onClose: () => void; label: string; children: ReactNode; footer?: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const node = panel.current
    const focusables = () => Array.from(node?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((el) => el.offsetParent !== null)
    // Premier champ si le tiroir en a un, sinon le bouton Fermer.
    const first = node?.querySelector<HTMLElement>('input:not([type=hidden])') ?? focusables()[0]
    first?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current(); return }
      if (e.key !== 'Tab') return
      const list = focusables()
      if (!list.length) return
      const a = list[0], z = list[list.length - 1]
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="drawer">
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div ref={panel} className="panel" role="dialog" aria-modal="true" aria-label={label}>
        <div className="panel-head">
          <div className="grow" />
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer"><XMarkIcon /></button>
        </div>
        <div className="panel-body">{children}</div>
        {footer && <div className="panel-foot flex-col">{footer}</div>}
      </div>
    </div>
  )
}

// ── Adresse courte ──────────────────────────────────────────────────────────

export type SlugStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'done'; check: SlugCheck }
  | { state: 'error' }

// Verdicts récents, partagés entre les champs : revenir à une adresse déjà testée
// (effacer puis retaper, changer de mode) ne relance pas de vérification.
const SLUG_TTL_MS = 30_000
const slugVerdicts = new Map<string, { at: number; check: SlugCheck }>()
function recentVerdict(slug: string): SlugCheck | null {
  const hit = slugVerdicts.get(slug)
  return hit && Date.now() - hit.at < SLUG_TTL_MS ? hit.check : null
}

/** Vérifie l'adresse pendant la saisie (400 ms après la dernière frappe). */
export function useSlugCheck(slug: string): SlugStatus {
  const value = slug.trim()
  // Dernier verdict reçu, rattaché à l'adresse vérifiée : l'état affiché en découle.
  const [result, setResult] = useState<{ slug: string; check: SlugCheck | null } | null>(null)
  const known = value ? recentVerdict(value) : null
  useEffect(() => {
    if (!value || recentVerdict(value)) return
    let cancelled = false
    const t = setTimeout(async () => {
      let check: SlugCheck | null = null
      try { check = await checkSlugAction(value) } catch { check = null }
      if (check) slugVerdicts.set(value, { at: Date.now(), check })
      if (!cancelled) setResult({ slug: value, check })
    }, 400)
    return () => { cancelled = true; clearTimeout(t) }
  }, [value])
  if (!value) return { state: 'idle' }
  if (known) return { state: 'done', check: known }
  if (!result || result.slug !== value) return { state: 'checking' }
  return result.check ? { state: 'done', check: result.check } : { state: 'error' }
}

/** Champ `link.cg/…` + verdict + suggestions cliquables. */
export function SlugField({ value, onChange, status, suggestion, label, extraHelp, id }: {
  value: string
  onChange: (v: string, byHand: boolean) => void
  status: SlugStatus
  /** Adresse proposée à partir du contenu (affichée si différente). */
  suggestion?: string
  label?: string
  extraHelp?: ReactNode
  id?: string
}) {
  const autoId = useId()
  const inputId = id ?? autoId
  const helpId = `${inputId}-help`
  const check = status.state === 'done' ? status.check : null
  const chips = Array.from(new Set([
    ...(check && !check.available ? check.suggestions : []),
    ...(suggestion && suggestion !== value ? [suggestion] : []),
  ])).filter(Boolean).slice(0, 4)

  return (
    <div>
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <span className="input-affix">
        <span className="pre" aria-hidden="true">{SHORT_HOST}/</span>
        <input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\s+/g, '-').toLowerCase(), true)}
          onBlur={() => { const s = slugify(value); if (s !== value) onChange(s, true) }}
          aria-label={label ? undefined : 'Adresse courte'}
          aria-describedby={helpId}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="mon-adresse"
          maxLength={48}
        />
      </span>
      <p id={helpId} className="help" aria-live="polite">
        {status.state === 'checking' && <span className="inline-flex items-center gap-1.5 text-subtle"><span className="spinner !h-3.5 !w-3.5" aria-hidden="true" />Vérification…</span>}
        {status.state === 'error' && <><ExclamationTriangleIcon className="text-warn" />Impossible de vérifier pour l&apos;instant. Vous pourrez quand même essayer de la créer.</>}
        {check?.available && (
          <span className="anim-pop flex gap-1.5 font-semibold text-ok"><CheckIcon className="text-ok" />
            {check.normalized !== value ? <>Libre sous la forme <b className="font-mono">{check.normalized}</b>.</> : 'Libre, elle est à vous.'}
            {extraHelp}
          </span>
        )}
        {check && !check.available && (
          <span className="flex gap-1.5 text-bad"><ExclamationTriangleIcon className="text-bad" />{check.message ?? 'Cette adresse est déjà prise.'}</span>
        )}
        {status.state === 'idle' && <span className="text-subtle">Lettres, chiffres et tirets. C&apos;est ce que les gens verront et taperont.</span>}
      </p>
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-muted">{check && !check.available ? 'Libres :' : 'Suggestion :'}</span>
          {chips.map((s) => (
            <button key={s} type="button" className="chip h-9 font-mono text-[13px]" aria-pressed={s === value} onClick={() => onChange(s, true)}>{s}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Libellé visuel commun aux champs des formulaires de contenu. */
export function Field({ label, opt, children, hint }: { label: string; opt?: boolean; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}{opt && <span className="opt"> · facultatif</span>}</span>
      {children}
      {hint && <span className="help">{hint}</span>}
    </label>
  )
}

/** Ligne d'usage du palier (données réelles de la coquille). */
export function PlanUsage({ viewer, what }: { viewer: Viewer; what: string }) {
  if (!viewer.user || !viewer.plan || viewer.plan.max === null) return null
  return <p className="text-center text-xs text-subtle">{viewer.plan.used} / {viewer.plan.max} {what}</p>
}
