import 'server-only'
import { cache } from 'react'
import { getWorkspace, listLinks } from '@link/db'
import { PLANS, type Plan } from '@link/shared'
import type { Viewer } from '@/components/kit/shell/types'
import { getDb } from './data'
import { getSessionContext, type SessionContext } from './session'

/**
 * Visiteur courant pour la coquille et les pages de l'espace. `cache` : un seul
 * calcul par requête, même si la coquille et la page le demandent toutes deux.
 */
export const getViewer = cache(async (): Promise<{ viewer: Viewer; ctx: SessionContext | null }> => {
  const ctx = await getSessionContext()
  if (!ctx) return { viewer: { user: null, plan: null }, ctx: null }

  const db = getDb()
  const [ws, links] = await Promise.all([getWorkspace(db, ctx.workspaceId), listLinks(db, ctx.workspaceId)])
  const plan = PLANS[(ws?.plan ?? 'free') as Plan]
  return {
    ctx,
    viewer: {
      user: { name: ctx.name, email: ctx.email },
      plan: { label: plan.label, used: links.length, max: plan.maxLinks },
    },
  }
})
