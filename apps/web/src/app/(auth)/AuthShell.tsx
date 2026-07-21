'use client'

import type { ReactNode } from 'react'

import { Blobs } from '@/components/ui'

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <Blobs />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 bg-grad rounded-2xl items-center justify-center mb-3 shadow-lg shadow-blue-500/30">
            <span className="text-white font-black text-lg">l.</span>
          </div>
          <h1 className="text-xl font-black text-[color:var(--foreground)]">{title}</h1>
          <p className="text-sm text-[color:var(--muted)]">{subtitle}</p>
        </div>
        <div className="card-soft p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export function Field({
  label, name, type, required, minLength, autoComplete,
}: {
  label: string; name: string; type: string; required?: boolean; minLength?: number; autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-semibold text-[color:var(--muted)] mb-1">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] py-2.5 px-3.5 text-sm focus-brand"
      />
    </div>
  )
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={pending} className="btn-grad w-full py-2.5 text-sm">
      {pending ? '…' : children}
    </button>
  )
}
