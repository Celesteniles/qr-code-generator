import Link from 'next/link'
import type { ReactNode } from 'react'
import { PhoneIcon, EnvelopeIcon, GlobeAltIcon, ChatBubbleOvalLeftEllipsisIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import {
  cardInitials, safeTheme, textOn, websiteHref, websiteLabel, whatsappHref, type CardFields,
} from './card-model'

// Carte de visite telle que la voient les contacts. Utilisée telle quelle par la
// page publique (/c/[slug]) et par l'aperçu en direct de l'éditeur.
// Palette fixe (papier clair) : la carte garde la même allure en thème sombre,
// seule la couleur du bandeau change.

type Action = { key: string; label: string; href: string; icon: typeof PhoneIcon; color: string; external?: boolean }

export function CardView({
  fields,
  interactive = true,
  saveButton,
}: {
  fields: CardFields
  /** false dans l'aperçu : rien n'est cliquable (on ne veut pas appeler depuis l'éditeur). */
  interactive?: boolean
  /** Bouton « Enregistrer le contact » (client) ; à défaut, une version inerte. */
  saveButton?: ReactNode
}) {
  const theme = safeTheme(fields.theme)
  const fg = textOn(theme)
  const name = fields.fullName.trim()
  const role = [fields.title.trim(), fields.org.trim()].filter(Boolean).join(' · ')
  const phone = fields.phone.trim()
  const email = fields.email.trim()
  const wa = fields.whatsapp.trim() ? whatsappHref(fields.whatsapp) : null
  const site = websiteHref(fields.website)

  const quick: Action[] = [
    phone && { key: 'tel', label: 'Appeler', href: `tel:${phone.replace(/\s+/g, '')}`, icon: PhoneIcon, color: '#0060ff' },
    wa && { key: 'wa', label: 'WhatsApp', href: wa, icon: ChatBubbleOvalLeftEllipsisIcon, color: '#17804f', external: true },
    email && { key: 'mail', label: 'Email', href: `mailto:${email}`, icon: EnvelopeIcon, color: '#c8472d' },
  ].filter(Boolean) as Action[]

  const details: (Action & { value: string })[] = [
    phone && { key: 'tel', label: 'Téléphone', value: phone, href: `tel:${phone.replace(/\s+/g, '')}`, icon: PhoneIcon, color: '' },
    email && { key: 'mail', label: 'Email', value: email, href: `mailto:${email}`, icon: EnvelopeIcon, color: '' },
    site && { key: 'web', label: 'Site web', value: websiteLabel(fields.website), href: site, icon: GlobeAltIcon, color: '', external: true },
  ].filter(Boolean) as (Action & { value: string })[]

  const Name = interactive ? 'h1' : 'p'

  return (
    <div className="min-h-full bg-[#f6f3ee] text-[#16161d]">
      <div className="relative overflow-hidden px-[22px] pb-[22px] pt-7" style={{ background: theme, color: fg }}>
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-[180px] w-[180px] rounded-full bg-white/15" />
        <div className="relative grid h-[76px] w-[76px] place-items-center rounded-[24px] bg-white font-display text-[26px] font-bold text-[#16161d]" aria-hidden="true">
          {cardInitials(name) || '•'}
        </div>
        <Name className="relative mt-4 break-words font-display text-[26px] font-bold leading-[1.05] tracking-[-.03em]">
          {name || 'Votre nom'}
        </Name>
        {role && <p className="relative mt-1 text-sm font-medium opacity-90">{role}</p>}
      </div>

      <div className="p-[18px]">
        {quick.length > 0 && (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${quick.length}, minmax(0, 1fr))` }}>
            {quick.map((a) => (
              <Tap key={a.key} action={a} interactive={interactive}
                className="grid place-items-center gap-1.5 rounded-[18px] bg-white px-1 py-3.5 text-xs font-semibold">
                <a.icon className="h-[22px] w-[22px]" style={{ color: a.color }} aria-hidden="true" />
                {a.label}
              </Tap>
            ))}
          </div>
        )}

        {details.length > 0 && (
          <div className="mt-2.5 divide-y divide-[#efebe4] overflow-hidden rounded-[18px] bg-white">
            {details.map((d) => (
              <Tap key={d.key} action={d} interactive={interactive}
                className="flex items-center gap-3 px-4 py-3.5 text-sm">
                <d.icon className="h-5 w-5 shrink-0 text-[#6b665b]" aria-hidden="true" />
                <span className="min-w-0">
                  <small className="block text-[11px] text-[#6b665b]">{d.label}</small>
                  <span className="block truncate">{d.value}</span>
                </span>
              </Tap>
            ))}
          </div>
        )}

        {saveButton ?? (
          <span className="mt-3.5 flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#16161d] text-[15px] font-bold text-white">
            <UserPlusIcon className="h-5 w-5" aria-hidden="true" />Enregistrer le contact
          </span>
        )}

        <p className="mt-4 text-center text-[11px] text-[#6b665b]">
          {interactive ? (
            <Link href="/" className="underline-offset-2 hover:underline">Créez votre carte gratuite sur link.cg</Link>
          ) : 'Créez votre carte gratuite sur link.cg'}
        </p>
      </div>
    </div>
  )
}

function Tap({ action, interactive, className, children }: {
  action: Action; interactive: boolean; className: string; children: ReactNode
}) {
  if (!interactive) return <span className={className}>{children}</span>
  return (
    <a href={action.href} className={`${className} transition hover:bg-[#fbf9f5]`}
      {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  )
}
