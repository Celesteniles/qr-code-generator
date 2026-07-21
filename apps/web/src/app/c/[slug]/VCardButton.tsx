'use client'

import { toVCard } from '@link/qr'
import type { CardProfile } from '@link/db'

// Réutilise le sérialiseur vCard de @link/qr (pur, sans DOM) pour proposer un
// « Ajouter aux contacts » : génère un .vcf téléchargeable côté client.
export function VCardButton({ profile }: { profile: CardProfile }) {
  function download() {
    const [first, ...rest] = profile.fullName.trim().split(/\s+/)
    const vcard = toVCard({
      first,
      last: rest.join(' '),
      title: profile.title,
      org: profile.org,
      phone: profile.phone,
      email: profile.email,
      web: profile.socials?.[0]?.url,
    })
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${profile.fullName.replace(/\s+/g, '-').toLowerCase()}.vcf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={download}
      className="btn-grad w-full mt-4 py-3 text-sm"
    >
      Ajouter aux contacts
    </button>
  )
}
