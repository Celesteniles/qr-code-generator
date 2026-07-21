'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/auth-client'
import { AuthShell, Field, SubmitButton } from '../AuthShell'

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const data = new FormData(e.currentTarget)
    const res = await signUp.email({
      name: String(data.get('name')),
      email: String(data.get('email')),
      password: String(data.get('password')),
    })
    setPending(false)
    if (res.error) setError(res.error.message ?? 'Impossible de créer le compte.')
    else router.push('/dashboard')
  }

  return (
    <AuthShell title="Créer un compte" subtitle="Pour gérer vos liens.">
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Nom" name="name" type="text" autoComplete="name" required />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Mot de passe" name="password" type="password" autoComplete="new-password" required minLength={8} />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <SubmitButton pending={pending}>Créer le compte</SubmitButton>
      </form>
      <p className="text-xs text-zinc-500 text-center mt-4">
        Déjà un compte ? <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Se connecter</Link>
      </p>
    </AuthShell>
  )
}
