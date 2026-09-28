import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getWorkspace, listUserWorkspaces } from '@link/db'
import { PLANS, type Plan } from '@link/shared'
import type { Viewer } from '@/components/kit/shell/types'
import { getDb } from './data'
import { getSessionState, type SessionContext } from './session'
import { getWorkspaceLinks } from './links'

/**
 * Visiteur courant pour la coquille et les pages de l'espace. `cache` : un seul
 * calcul par requête, même si la coquille et la page le demandent toutes deux.
 *
 * Compte connecté mais adresse non vérifiée : direction /verifier-email. Appelé
 * par le layout de l'espace ET par chaque page, la redirection vaut aussi pour
 * une navigation côté client (où le layout n'est pas recalculé).
 */
export const getViewer = cache(async (): Promise<{ viewer: Viewer; ctx: SessionContext | null }> => {
  const state = await getSessionState()
  if (state.kind === 'unverified') redirect('/verifier-email')
  if (state.kind === 'guest') return { viewer: { user: null, plan: null }, ctx: null }
  const { ctx } = state

  const db = getDb()
  const [ws, links, spaces] = await Promise.all([
    getWorkspace(db, ctx.workspaceId),
    getWorkspaceLinks(ctx.workspaceId),
    listUserWorkspaces(db, ctx.userId),
  ])
  const plan = PLANS[(ws?.plan ?? 'free') as Plan]
  return {
    ctx,
    viewer: {
      user: { name: ctx.name, email: ctx.email },
      plan: { label: plan.label, used: links.length, max: plan.maxLinks },
      workspace: spaces.length > 1 ? { name: ws?.name || 'Espace sans nom' } : null,
    },
  }
})
