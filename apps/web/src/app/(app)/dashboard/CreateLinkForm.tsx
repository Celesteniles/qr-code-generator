'use client'

import { useActionState } from 'react'
import { createLinkAction } from '@/server/actions'
import type { CreateState } from '@/server/config'

export function CreateLinkForm() {
  const [state, action, pending] = useActionState<CreateState, FormData>(createLinkAction, null)

  return (
    <form
      action={action}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 items-end">
        <div>
          <label htmlFor="slug" className="block text-xs font-semibold text-zinc-500 mb-1">
            Raccourci
          </label>
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus-within:ring-1 focus-within:ring-blue-500">
            <span className="pl-3 pr-1 text-sm text-zinc-400 select-none">link.cg/</span>
            <input
              id="slug"
              name="slug"
              required
              pattern="[a-zA-Z0-9_-]+"
              placeholder="promo"
              className="flex-1 bg-transparent py-2 pr-3 text-sm focus:outline-none min-w-0"
            />
          </div>
        </div>
        <div>
          <label htmlFor="url" className="block text-xs font-semibold text-zinc-500 mb-1">
            Destination
          </label>
          <input
            id="url"
            name="url"
            type="url"
            required
            placeholder="https://exemple.com"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold py-2 px-5 rounded-xl transition-colors"
        >
          {pending ? 'Création…' : 'Créer le lien'}
        </button>
        {state?.ok && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Créé : link.cg/{state.slug}
          </span>
        )}
        {state && !state.ok && (
          <span className="text-sm text-red-600 dark:text-red-400">{state.message}</span>
        )}
      </div>
    </form>
  )
}
