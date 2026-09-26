'use client'

import { useRouter } from 'next/navigation'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import { signOut } from '@/lib/auth-client'

export function SignOutButton({ withLabel = false }: { withLabel?: boolean }) {
  const router = useRouter()
  async function onClick() {
    await signOut()
    router.push('/')
    router.refresh()
  }
  return withLabel ? (
    <button type="button" onClick={onClick} className="btn btn-ghost btn-sm w-full justify-start">
      <ArrowRightStartOnRectangleIcon />Se déconnecter
    </button>
  ) : (
    <button type="button" onClick={onClick} className="icon-btn" aria-label="Se déconnecter">
      <ArrowRightStartOnRectangleIcon />
    </button>
  )
}
