'use client'

import type { ReactNode } from 'react'

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex w-10 h-10 bg-blue-500 rounded-xl items-center justify-center mb-3">
            <span className="text-white font-bold">l.</span>
          </div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
          <p className="text-sm text-zinc-500">{subtitle}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
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
      <label htmlFor={name} className="block text-xs font-semibold text-zinc-500 mb-1">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
    >
      {pending ? '…' : children}
    </button>
  )
}
