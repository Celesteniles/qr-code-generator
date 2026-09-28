'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Recharge les données de la page à intervalle régulier (paiement en attente). */
export function AutoRefresh({ everyMs = 4000 }: { everyMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const t = setInterval(() => router.refresh(), everyMs)
    return () => clearInterval(t)
  }, [router, everyMs])
  return null
}

/** Recharge une fois les données de la page et du layout (offre changée pendant le rendu). */
export function RefreshOnce() {
  const router = useRouter()
  useEffect(() => {
    router.refresh()
  }, [router])
  return null
}
