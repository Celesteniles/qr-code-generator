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
    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
      {children}
    </p>
  )
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 ${className}`}>
      {children}
    </div>
  )
}

export function OptionBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
        active
          ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
          : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-blue-400 dark:hover:border-blue-600 hover:text-zinc-900 dark:hover:text-zinc-200'
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
