'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/auth-client'
import { AuthShell, Field, SubmitButton } from '../AuthShell'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const data = new FormData(e.currentTarget)
    const res = await signIn.email({
      email: String(data.get('email')),
      password: String(data.get('password')),
    })
    setPending(false)
    if (res.error) setError('Identifiants invalides.')
    else router.push('/dashboard')
  }

  return (
    <AuthShell title="Connexion" subtitle="Accédez à votre tableau de bord.">
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" required />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <SubmitButton pending={pending}>Se connecter</SubmitButton>
      </form>
      <p className="text-xs text-zinc-500 text-center mt-4">
        Pas de compte ? <Link href="/signup" className="text-blue-600 dark:text-blue-400 hover:underline">Créer un compte</Link>
      </p>
    </AuthShell>
  )
}
