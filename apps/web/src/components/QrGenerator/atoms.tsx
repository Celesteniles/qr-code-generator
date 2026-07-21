'use client'

import { useEffect, useState } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowsRightLeftIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline'

// ── Layout atoms ──────────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)] mb-3">
      {children}
    </p>
  )
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`card-soft p-5 ${className}`}>
      {children}
    </div>
  )
}

export function OptionBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
        active
          ? 'bg-grad text-white border-transparent shadow-md shadow-blue-500/30 scale-[1.02]'
          : 'bg-[color:var(--surface)] border-[color:var(--border)] text-[color:var(--muted)] hover:border-brand hover:text-brand'
      }`}
    >
      {children}
    </button>
  )
}

export function HexInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [local, setLocal] = useState(value)
  useEffect(() => { setLocal(value) }, [value])
  return (
    <input
      type="text"
      aria-label={label}
      value={local}
      onChange={(e) => {
        const v = e.target.value
        setLocal(v)
        if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v)
      }}
      onBlur={() => { if (!/^#[0-9a-fA-F]{6}$/.test(local)) setLocal(value) }}
      maxLength={7}
      spellCheck={false}
      className="w-[5.5rem] text-xs font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
    />
  )
}

export function ColorSwatch({
  color, onChange, ariaLabel,
}: { color: string; onChange: (v: string) => void; ariaLabel: string }) {
  return (
    <div className="relative w-9 h-9 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden shrink-0">
      <div className="absolute inset-0" style={{ backgroundColor: color }} />
      <input
        type="color"
        aria-label={ariaLabel}
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
      />
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

export function IconDownload() {
  return <ArrowDownTrayIcon className="w-4 h-4" />
}

export function IconSwap() {
  return <ArrowsRightLeftIcon className="w-4 h-4" />
}

export function IconCopy({ done }: { done: boolean }) {
  if (done) return <CheckIcon className="w-4 h-4 text-green-500" />
  return <ClipboardDocumentIcon className="w-4 h-4" />
}

export function IconQr() {
  return <QrCodeIcon className="w-5 h-5 text-white" />
}
