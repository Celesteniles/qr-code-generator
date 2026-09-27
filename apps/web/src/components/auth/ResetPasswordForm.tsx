'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, CheckCircleIcon, ExclamationCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { authClient } from '@/lib/auth-client'
import { Spinner } from '@/components/kit/Spinner'

// Mêmes bornes que l'inscription (minPasswordLength / maxPasswordLength par
// défaut de Better Auth, cf. AuthPanel).
const MIN = 8
const MAX = 128
/** Après succès, délai avant l'envoi automatique vers /connexion. */
const REDIRECT_MS = 4000

type AuthError = { code?: string; message?: string; status?: number } | null | undefined
type State = 'form' | 'invalid' | 'done'

/** Erreurs Better Auth → langage courant ; `invalid` = lien à redemander. */
function explain(err: AuthError): { invalid: boolean; message: string } {
  const code = err?.code ?? ''
  if (code === 'INVALID_TOKEN') return { invalid: true, message: '' }
  if (err?.status === 429) return { invalid: false, message: 'Trop d\'essais d\'affilée. Patientez une minute, puis réessayez.' }
  if (code === 'PASSWORD_TOO_SHORT') return { invalid: false, message: `Mot de passe trop court : ${MIN} caractères minimum.` }
  if (code === 'PASSWORD_TOO_LONG') return { invalid: false, message: `Mot de passe trop long : ${MAX} caractères maximum.` }
  return { invalid: false, message: 'Le mot de passe n\'a pas pu être changé. Vérifiez votre réseau, puis réessayez.' }
}

export function ResetPasswordForm({ token }: {
  /** Jeton du lien ; null si absent ou déjà refusé par le serveur (expiré, utilisé). */
  token: string | null
}) {
  const id = useId()
  const router = useRouter()
  const [state, setState] = useState<State>(token ? 'form' : 'invalid')
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mismatch = confirm.length > 0 && confirm !== pw

  useEffect(() => {
    if (state !== 'done') return
    const t = setTimeout(() => router.push('/connexion'), REDIRECT_MS)
    return () => clearTimeout(t)
  }, [state, router])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending || !token) return
    setError(null)
    if (pw.length < MIN) return setError(`Mot de passe trop court : ${MIN} caractères minimum.`)
    if (pw !== confirm) return setError('La confirmation ne correspond pas au nouveau mot de passe. Retapez-la.')

    setPending(true)
    try {
      const res = await authClient.resetPassword({ newPassword: pw, token })
      if (res.error) {
        const { invalid, message } = explain(res.error)
        if (invalid) setState('invalid')
        else setError(message)
        return
      }
      setPw(''); setConfirm('')
      setState('done')
    } catch {
      setError('Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.')
    } finally {
      setPending(false)
    }
  }

  if (state === 'invalid') {
    return (
      <div className="w-full max-w-[400px]">
        <h1 className="h1">Ce lien ne fonctionne plus</h1>
        <p className="mt-6 flex gap-2.5 rounded-[14px] bg-bad-tint px-3.5 py-3 text-sm font-medium text-bad" role="alert">
          <ExclamationCircleIcon className="mt-px h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span>Il a expiré (au bout d&apos;une heure), a déjà servi, ou il est incomplet. Demandez-en un nouveau : cela ne prend qu&apos;une minute.</span>
        </p>
        <Link href="/mot-de-passe-oublie" className="btn btn-cta btn-lg mt-6 w-full">Recevoir un nouveau lien</Link>
        <p className="mt-8 text-center text-sm">
          <Link href="/connexion" className="link"><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />Retour à la connexion</Link>
        </p>
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div className="w-full max-w-[400px]">
        <h1 className="h1">Mot de passe changé</h1>
        <p className="anim-rise mt-6 flex gap-2.5 rounded-[14px] bg-ok-tint px-3.5 py-3 text-sm font-medium text-ok" role="status">
          <CheckCircleIcon className="mt-px h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span>C&apos;est fait&nbsp;! Par sécurité, tous vos appareils ont été déconnectés. Connectez-vous avec le nouveau mot de passe.</span>
        </p>
        <p className="mt-4 text-sm text-muted">Vous allez être redirigé vers la page de connexion.</p>
        <Link href="/connexion" className="btn btn-cta btn-lg mt-6 w-full">Se connecter</Link>
      </div>
    )
  }

  const type = show ? 'text' : 'password'
  const errId = `${id}-err`

  return (
    <div className="w-full max-w-[400px]">
      <h1 className="h1">Nouveau mot de passe</h1>
      <p className="lead mt-2">Choisissez-le, puis confirmez-le. Il remplacera l&apos;ancien sur tous vos appareils.</p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4" noValidate aria-describedby={error ? errId : undefined}>
        <div>
          <label className="label" htmlFor={`${id}-new`}>Nouveau mot de passe</label>
          <div className="relative">
            <input id={`${id}-new`} type={type} className="input pr-14" required minLength={MIN} maxLength={MAX}
              autoComplete="new-password" aria-describedby={`${id}-new-help`} autoFocus
              value={pw} onChange={(e) => { setPw(e.target.value); setError(null) }} />
            <button type="button" className="icon-btn absolute right-[7px] top-1/2 -translate-y-1/2"
              onClick={() => setShow((v) => !v)} aria-pressed={show}
              aria-label={show ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}>
              {show ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
          <p id={`${id}-new-help`} className="help">{MIN} caractères minimum. Une phrase courte que vous retenez facilement fait très bien l&apos;affaire.</p>
        </div>
        <div>
          <label className="label" htmlFor={`${id}-conf`}>Confirmez-le</label>
          <input id={`${id}-conf`} type={type} className="input" required maxLength={MAX} autoComplete="new-password"
            aria-invalid={mismatch || undefined} aria-describedby={mismatch ? `${id}-conf-err` : undefined}
            value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(null) }} />
          {mismatch && <p id={`${id}-conf-err`} className="help text-bad">Les deux saisies ne sont pas identiques.</p>}
        </div>

        <div role="alert">
          {error && (
            <p id={errId} className="flex gap-2.5 rounded-[14px] bg-bad-tint px-3.5 py-3 text-[13px] font-medium text-bad">
              <ExclamationCircleIcon className="mt-px h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}
        </div>

        <button type="submit" className="btn btn-cta btn-lg w-full" disabled={pending || !pw || !confirm} aria-busy={pending}>
          {pending ? <><Spinner />Enregistrement…</> : 'Enregistrer le mot de passe'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm">
        <Link href="/connexion" className="link"><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />Retour à la connexion</Link>
      </p>
    </div>
  )
}
