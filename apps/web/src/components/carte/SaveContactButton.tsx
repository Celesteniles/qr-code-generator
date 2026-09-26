import { UserPlusIcon } from '@heroicons/react/24/outline'

// « Enregistrer le contact » : un simple lien vers /c/[slug]/contact.vcf, servi
// comme fiche contact. Le téléphone ouvre sa propre fiche « Créer un contact »
// (iPhone) ou l'app Contacts (Android), au lieu d'un fichier téléchargé à retrouver.
export function SaveContactButton({ slug }: { slug: string }) {
  return (
    <a
      href={`/c/${encodeURIComponent(slug)}/contact.vcf`}
      className="mt-3.5 flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#16161d] text-[15px] font-bold text-white transition hover:bg-black"
    >
      <UserPlusIcon className="h-5 w-5" aria-hidden="true" />Enregistrer le contact
    </a>
  )
}
