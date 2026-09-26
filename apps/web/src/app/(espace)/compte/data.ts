import 'server-only'
import { headers } from 'next/headers'
import { and, desc, eq, gt } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { authSchema } from '@link/db'
import { getAuth } from '@/server/auth'
import { describeUserAgent, maskIp, relativeTime, shortDate, type DeviceItem } from '@/components/compte/devices'

/**
 * Sessions actives de l'utilisateur connecté, prêtes à afficher. Lecture directe
 * en base (l'API `listSessions` de Better Auth exige une session de moins d'un
 * jour). Les jetons ne sortent jamais d'ici : seul l'identifiant est transmis.
 */
export async function getMyDevices(): Promise<DeviceItem[] | null> {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) return null

  const db = drizzle(getCloudflareContext().env.DB, { schema: authSchema })
  const t = authSchema.session
  const rows = await db
    .select({ id: t.id, userAgent: t.userAgent, ipAddress: t.ipAddress, createdAt: t.createdAt, updatedAt: t.updatedAt })
    .from(t)
    .where(and(eq(t.userId, session.user.id), gt(t.expiresAt, new Date())))
    .orderBy(desc(t.updatedAt))

  const now = Date.now()
  const items = rows.map((r): DeviceItem => {
    const current = r.id === session.session.id
    const { label, kind } = describeUserAgent(r.userAgent)
    return {
      id: r.id,
      label,
      kind,
      current,
      lastActive: current ? 'maintenant' : relativeTime(r.updatedAt, now),
      createdAt: shortDate(r.createdAt),
      ip: maskIp(r.ipAddress),
    }
  })
  // L'appareil en cours d'abord.
  return items.sort((a, b) => Number(b.current) - Number(a.current))
}
