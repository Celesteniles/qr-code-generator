import type { Metadata } from 'next'
import { Tour } from '@/components/bienvenue/Tour'

// Visite guidée (proposition D) : plein écran, hors de la coquille de l'espace.
// Référence : docs/maquettes/d-bienvenue.html.

export const metadata: Metadata = {
  title: 'Visite guidée — link.cg',
  description: 'En trois questions, trouvez s’il vous faut un lien court, un QR fixe ou un QR modifiable, et créez-le.',
}

export default function BienvenuePage() {
  return <Tour />
}
