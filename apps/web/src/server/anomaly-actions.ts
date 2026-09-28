'use server'

import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import { PAYMENT_METHODS, resolvePaymentAnomaly, type AnomalyResolution, type PaymentMethod } from '@link/db'
import { getDb } from './data'
import { getBillingAdmin } from './billing-admin'

// Résolution d'une anomalie de paiement depuis /interne/paiements. L'accès est
// revérifié ici (une action serveur s'appelle sans passer par la page).

const RESOLUTIONS: AnomalyResolution[] = ['granted', 'refunded', 'dismissed']

export async function resolveAnomalyAction(formData: FormData): Promise<void> {
  const admin = await getBillingAdmin()
  if (!admin) notFound()
  const id = String(formData.get('id') ?? '')
  const resolution = String(formData.get('resolution') ?? '') as AnomalyResolution
  const rawMethod = String(formData.get('method') ?? '')
  const method = (PAYMENT_METHODS as readonly string[]).includes(rawMethod) ? (rawMethod as PaymentMethod) : undefined
  const note = String(formData.get('note') ?? '')
  if (!id || !RESOLUTIONS.includes(resolution) || formData.get('confirm') !== 'on') {
    redirect(`/interne/paiements?erreur=formulaire#${encodeURIComponent(id)}`)
  }

  const res = await resolvePaymentAnomaly({ db: getDb() }, { id, resolution, by: admin, note, method })
  revalidatePath('/interne/paiements')
  if (!res.ok) {
    console.error('[paiement] résolution d’anomalie refusée', id, res.error, res.detail ?? '')
    redirect(`/interne/paiements?erreur=${res.error}#${encodeURIComponent(id)}`)
  }
  console.info('[paiement] anomalie résolue', id, resolution, admin)
  redirect(`/interne/paiements?ok=${resolution}`)
}
