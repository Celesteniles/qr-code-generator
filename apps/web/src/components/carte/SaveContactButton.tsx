'use client'

import { UserPlusIcon } from '@heroicons/react/24/outline'
import { toVCard } from '@link/qr'
import { websiteHref, type CardFields } from './card-model'

// « Enregistrer le contact » : génère un .vcf côté client avec le sérialiseur
// vCard de @link/qr (pur, sans DOM). Le téléphone l'ouvre dans ses contacts.
export function SaveContactButton({ fields }: { fields: CardFields }) {
  function download() {
    const [first = '', ...rest] = fields.fullName.trim().split(/\s+/)
    const vcard = toVCard({
      first,
      last: rest.join(' '),
      title: fields.title.trim() || undefined,
      org: fields.org.trim() || undefined,
      phone: fields.phone.trim() || undefined,
      email: fields.email.trim() || undefined,
      web: websiteHref(fields.website) ?? undefined,
    })
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fields.fullName.trim().replace(/\s+/g, '-').toLowerCase() || 'contact'}.vcf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Laisser au navigateur le temps de lancer le téléchargement.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <button
      type="button"
      onClick={download}
      className="mt-3.5 flex h-[54px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#16161d] text-[15px] font-bold text-white transition hover:bg-black"
    >
      <UserPlusIcon className="h-5 w-5" aria-hidden="true" />Enregistrer le contact
    </button>
  )
}
