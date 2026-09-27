import { NotFoundContent } from '@/components/kit/NotFoundContent'

// Lien, carte ou reçu introuvable dans l'espace : même page, dans la coquille.
export default function EspaceNotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-12">
      <NotFoundContent />
    </div>
  )
}
