import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRightIcon, ArrowsRightLeftIcon, CheckIcon, SparklesIcon, UserPlusIcon, UsersIcon } from '@heroicons/react/24/outline'
import {
  canManageBilling, canManageTeam, getWorkspace, listTeam, listUserWorkspaces, INVITATION_TTL_MS,
} from '@link/db'
import { canAddMember, PLANS, type Plan } from '@link/shared'
import { getViewer } from '@/server/viewer'
import { getDb } from '@/server/data'
import { switchWorkspaceAction } from '@/server/team'
import { SectionHead } from '@/components/compte/SectionHead'
import { TeamList } from '@/components/equipe/TeamList'
import { InviteForm } from '@/components/equipe/InviteForm'
import { ROLE_LABEL, type InvitationItem, type MemberItem } from '@/components/equipe/model'
import { formatDate } from '@/components/facturation/format'
import { CompteTabs } from '../CompteTabs'

export const metadata: Metadata = { title: 'Équipe — link.cg' }

const VALIDITY_DAYS = Math.round(INVITATION_TTL_MS / (24 * 60 * 60 * 1000))

export default async function EquipePage() {
  const { ctx } = await getViewer()
  if (!ctx) redirect('/connexion?next=/compte/equipe')

  const db = getDb()
  const [ws, team, spaces] = await Promise.all([
    getWorkspace(db, ctx.workspaceId),
    listTeam(db, ctx.workspaceId),
    listUserWorkspaces(db, ctx.userId),
  ])
  const planId = (ws?.plan ?? 'free') as Plan
  const plan = PLANS[planId]
  const manage = canManageTeam(ctx.role)
  const soloPlan = plan.maxMembers !== null && plan.maxMembers <= 1
  const canInvite = canAddMember(planId, team.seatsUsed)
  const wsName = ws?.name || 'votre espace'

  const members: MemberItem[] = team.members.map((m) => ({ ...m, self: m.userId === ctx.userId }))
  const invitations: InvitationItem[] = team.invitations.map((i) => ({
    id: i.id, email: i.email, role: i.role, expired: i.expired,
    sentOn: formatDate(i.createdAt), expiresOn: formatDate(i.expiresAt),
  }))

  return (
    <div className="px-4 pb-14 pt-6 sm:px-8 lg:px-10 lg:pt-9">
      <h1 className="h1">Mon compte</h1>
      <p className="lead mt-2 max-w-[60ch]">Les personnes qui travaillent avec vous dans l’espace, et les espaces auxquels vous avez accès.</p>
      <CompteTabs current="/compte/equipe" billing={canManageBilling(ctx.role)} />

      <div className="mt-8 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 grid-cols-1 gap-4">
          <section className="card p-5 sm:p-[26px]" aria-labelledby="e-membres">
            <SectionHead icon={<UsersIcon />} tone="bg-brand-tint text-brand" id="e-membres" title={`L’équipe de « ${wsName} »`}>
              {plan.maxMembers === null
                ? `${team.seatsUsed} utilisateur${team.seatsUsed > 1 ? 's' : ''}, invitations en attente comprises.`
                : `${team.seatsUsed} / ${plan.maxMembers} utilisateur${plan.maxMembers > 1 ? 's' : ''} avec l’offre ${plan.label}, invitations en attente comprises.`}
            </SectionHead>
            <TeamList members={members} invitations={invitations} canManage={manage} />
          </section>

          <section className="card p-5 sm:p-[26px]" aria-labelledby="e-inviter">
            <SectionHead icon={<UserPlusIcon />} tone="bg-ok-tint text-ok" id="e-inviter" title="Inviter une personne">
              {manage ? 'Elle aura accès aux liens, aux QR codes et aux statistiques de l’espace.' : undefined}
            </SectionHead>
            {!manage ? (
              <p className="text-sm text-muted">
                Vous êtes {ROLE_LABEL[ctx.role].toLowerCase()} de cet espace : vous pouvez créer et modifier ses liens.
                Seuls le propriétaire et les administrateurs invitent de nouvelles personnes.
              </p>
            ) : soloPlan ? (
              <div className="tip blue">
                <span className="tip-ico"><SparklesIcon aria-hidden="true" /></span>
                <div>
                  <strong>Travaillez à plusieurs avec l’offre Business</strong>
                  L’offre {plan.label} comprend un seul utilisateur. Avec l’offre Business, invitez jusqu’à {PLANS.business.maxMembers} personnes dans votre espace.
                  <Link href="/offres" className="btn btn-soft btn-sm mt-3">Voir les offres<ArrowRightIcon aria-hidden="true" /></Link>
                </div>
              </div>
            ) : !canInvite ? (
              <div className="tip blue">
                <span className="tip-ico"><SparklesIcon aria-hidden="true" /></span>
                <div>
                  <strong>Votre équipe est au complet</strong>
                  L’offre {plan.label} permet {plan.maxMembers} utilisateurs, invitations en attente comprises. Annulez une invitation, retirez un membre ou passez à l’offre supérieure.
                  <Link href="/offres" className="btn btn-soft btn-sm mt-3">Voir les offres<ArrowRightIcon aria-hidden="true" /></Link>
                </div>
              </div>
            ) : (
              <InviteForm validityDays={VALIDITY_DAYS} />
            )}
          </section>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:sticky xl:top-6">
          <section className="card p-5 sm:p-[26px]" aria-labelledby="e-espaces">
            <SectionHead icon={<ArrowsRightLeftIcon />} tone="bg-lilac text-ink" id="e-espaces" title="Vos espaces">
              {spaces.length > 1
                ? 'Vous avez accès à plusieurs espaces. Les liens, les cartes et les statistiques affichés sont ceux de l’espace ouvert.'
                : 'Quand quelqu’un vous invite dans son espace, il apparaît ici.'}
            </SectionHead>
            <ul className="grid gap-2" aria-label="Vos espaces">
              {spaces.map((w) => {
                const current = w.workspaceId === ctx.workspaceId
                return (
                  <li key={w.workspaceId} className={`flex items-center gap-3 rounded-[16px] px-3.5 py-3 ${current ? 'bg-brand-tint/60 shadow-[inset_0_0_0_1.5px_var(--brand-tint)]' : 'zone'}`}>
                    <div className="min-w-0 grow">
                      <span className="block truncate text-sm font-semibold">{w.name || 'Espace sans nom'}</span>
                      <span className="block text-xs text-muted">
                        {w.role === 'owner' ? 'Votre espace' : ROLE_LABEL[w.role]} · Offre {PLANS[w.plan].label}
                      </span>
                    </div>
                    {current ? (
                      <span className="pill pill-ok"><CheckIcon aria-hidden="true" />Ouvert</span>
                    ) : (
                      <form action={switchWorkspaceAction}>
                        <input type="hidden" name="workspaceId" value={w.workspaceId} />
                        <button type="submit" className="btn btn-soft btn-sm">Ouvrir</button>
                      </form>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
