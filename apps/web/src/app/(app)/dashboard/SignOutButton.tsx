'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth-client'

export function SignOutButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={async () => {
        await signOut()
        router.push('/login')
      }}
      className="text-xs font-semibold text-[color:var(--muted)] hover:text-red-500 transition-colors"
    >
      Déconnexion
    </button>
  )
}
