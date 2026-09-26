import type { ReactNode } from 'react'
import { AppShell } from '@/components/kit/shell/AppShell'
import { getViewer } from '@/server/viewer'

// Espace unique : même coquille pour le visiteur et l'inscrit (proposition D).
export const dynamic = 'force-dynamic'

export default async function EspaceLayout({ children }: { children: ReactNode }) {
  const { viewer } = await getViewer()
  return <AppShell viewer={viewer}>{children}</AppShell>
}
