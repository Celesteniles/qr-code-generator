import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRightIcon, ComputerDesktopIcon, KeyIcon, PaintBrushIcon, SparklesIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { getViewer } from '@/server/viewer'
import { SectionHead } from '@/components/compte/SectionHead'
import { ProfileForm } from '@/components/compte/ProfileForm'
import { PasswordForm } from '@/components/compte/PasswordForm'
import { DeviceList } from '@/components/compte/DeviceList'
import { ThemePreference } from '@/components/compte/ThemePreference'
import { getMyDevices } from './data'
import { CompteTabs } from './CompteTabs'

export const metadata: Metadata = { title: 'Mon compte — link.cg' }

const nf = new Intl.NumberFormat('fr')

export default async function ComptePage() {
  const { ctx, viewer } = await getViewer()
  if (!ctx) redirect('/connexion?next=/compte')
  const devices = (await getMyDevices()) ?? []
  const plan = viewer.plan

  return (
    <div className="px-4 pb-14 pt-6 sm:px-8 lg:px-10 lg:pt-9">
      <h1 className="h1">Mon compte</h1>
      <p className="lead mt-2 max-w-[60ch]">Vos informations, votre mot de passe et les appareils connectés à votre espace.</p>
      <CompteTabs current="/compte" />

      <div className="mt-8 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-4">
          <section className="card p-5 sm:p-[26px]" aria-labelledby="c-infos">
            <SectionHead icon={<UserCircleIcon />} tone="bg-brand-tint text-brand" id="c-infos" title="Vos informations">
              Le nom affiché dans votre espace et l&apos;adresse qui vous sert à vous connecter.
            </SectionHead>
            <ProfileForm name={ctx.name} email={ctx.email} />
          </section>

          <section className="card p-5 sm:p-[26px]" aria-labelledby="c-mdp">
            <SectionHead icon={<KeyIcon />} tone="bg-sun text-[#7a4b00]" id="c-mdp" title="Mot de passe">
              Pour le changer, il faut d&apos;abord saisir celui que vous utilisez aujourd&apos;hui.
            </SectionHead>
            <PasswordForm email={ctx.email} />
          </section>

          <section className="card p-5 sm:p-[26px]" aria-labelledby="c-appareils">
            <SectionHead icon={<ComputerDesktopIcon />} tone="bg-ok-tint text-ok" id="c-appareils" title="Appareils connectés">
              Un appareil que vous ne reconnaissez pas ? Déconnectez-le, puis changez votre mot de passe.
            </SectionHead>
            <DeviceList devices={devices} />
          </section>
        </div>

        <div className="grid min-w-0 gap-4 xl:sticky xl:top-6">
          {plan && (
            <section className="card p-5 sm:p-[26px]" aria-labelledby="c-offre">
              <SectionHead icon={<SparklesIcon />} tone="bg-lilac text-ink" id="c-offre" title="Votre offre" />
              <div className="flex items-baseline justify-between gap-3">
                <span className="pill pill-brand">{plan.label}</span>
                <span className="text-sm text-muted">
                  <strong className="font-display text-lg tabular-nums text-ink">{nf.format(plan.used)}</strong>
                  {plan.max === null ? ' liens courts' : ` / ${nf.format(plan.max)} liens courts`}
                </span>
              </div>
              {plan.max !== null && (
                <div className="meter mt-3" role="progressbar" aria-label="Liens courts utilisés"
                  aria-valuemin={0} aria-valuemax={plan.max} aria-valuenow={plan.used}>
                  <span style={{ width: `${Math.min(100, (plan.used / Math.max(1, plan.max)) * 100)}%` }} />
                </div>
              )}
              <p className="mt-3 text-sm text-muted">
                {plan.max === null
                  ? 'Liens courts illimités, avec leur QR.'
                  : plan.used >= plan.max
                    ? 'Vous avez utilisé tous vos liens courts. Passez à l’offre supérieure pour en créer d’autres.'
                    : `Encore ${nf.format(plan.max - plan.used)} liens courts disponibles. Les QR fixes restent illimités.`}
              </p>
              <Link href="/offres" className="btn btn-soft btn-sm mt-4">Voir les offres<ArrowRightIcon aria-hidden="true" /></Link>
            </section>
          )}

          <section className="card p-5 sm:p-[26px]" aria-labelledby="c-prefs">
            <SectionHead icon={<PaintBrushIcon />} tone="bg-sky text-ink" id="c-prefs" title="Préférences" />
            <span className="label">Thème</span>
            <ThemePreference />
          </section>
        </div>
      </div>
    </div>
  )
}
