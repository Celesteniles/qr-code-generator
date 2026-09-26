'use client'

import { useId, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, CheckIcon, ExclamationCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { signIn, signUp } from '@/lib/auth-client'
import { Spinner } from '@/components/kit/Spinner'

export type AuthMode = 'connexion' | 'inscription'

type AuthError = { code?: string; message?: string; status?: number } | null | undefined

/** Erreur Better Auth → phrase utile, avec une issue. */
function explain(mode: AuthMode, err: AuthError): string {
  const code = err?.code ?? ''
  if (err?.status === 429) return 'Trop de tentatives d\'affilée. Patientez une minute, puis réessayez.'
  if (mode === 'connexion') {
    if (code === 'INVALID_EMAIL_OR_PASSWORD' || code === 'INVALID_PASSWORD' || err?.status === 401) {
      return 'Cet email et ce mot de passe ne correspondent pas. Vérifiez l\'adresse et les majuscules, ou créez un compte si vous n\'en avez pas encore.'
    }
    if (code === 'INVALID_EMAIL') return 'Cette adresse email ne semble pas complète. Exemple : vous@exemple.cg.'
    return 'La connexion n\'a pas abouti. Vérifiez votre réseau, puis réessayez.'
  }
  if (code === 'USER_ALREADY_EXISTS' || code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
    return 'Un compte existe déjà avec cet email. Connectez-vous avec l\'onglet « Se connecter ».'
  }
  if (code === 'PASSWORD_TOO_SHORT') return 'Mot de passe trop court : 8 caractères minimum.'
  if (code === 'PASSWORD_TOO_LONG') return 'Mot de passe trop long : 128 caractères maximum.'
  if (code === 'INVALID_EMAIL') return 'Cette adresse email ne semble pas complète. Exemple : vous@exemple.cg.'
  if (code.includes('SIGN_UP') && code.includes('DISABLED')) return 'Les inscriptions sont fermées pour le moment. Revenez un peu plus tard.'
  return 'La création du compte n\'a pas abouti. Vérifiez votre réseau, puis réessayez.'
}

export function AuthPanel({ initialMode, next, freeLinks }: { initialMode: AuthMode; next: string; freeLinks: number | null }) {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const id = useId()
  const tabIn = useRef<HTMLButtonElement>(null)
  const tabUp = useRef<HTMLButtonElement>(null)

  function switchTo(m: AuthMode, focus = false) {
    setMode(m)
    setError(null)
    if (focus) (m === 'connexion' ? tabIn : tabUp).current?.focus()
    // Garde l'onglet dans l'adresse (partage, retour arrière) sans recharger.
    const url = new URL(window.location.href)
    if (m === 'inscription') url.searchParams.set('mode', 'inscription')
    else url.searchParams.delete('mode')
    window.history.replaceState(null, '', url)
  }

  function onTabKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      const target: AuthMode = e.key === 'Home' ? 'connexion' : e.key === 'End' ? 'inscription' : mode === 'connexion' ? 'inscription' : 'connexion'
      switchTo(target, true)
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const data = new FormData(e.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    try {
      const res = mode === 'connexion'
        ? await signIn.email({ email, password })
        : await signUp.email({ name: String(data.get('name') ?? '').trim(), email, password })
      if (res.error) {
        setError(explain(mode, res.error))
        setPending(false)
        return
      }
      router.push(next)
      router.refresh()
    } catch {
      setError('Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.')
      setPending(false)
    }
  }

  const isIn = mode === 'connexion'
  const errId = `${id}-err`

  return (
    <div className="w-full max-w-[400px]">
      <div className="seg" role="tablist" aria-label="Connexion ou inscription" onKeyDown={onTabKey}>
        <button ref={tabIn} type="button" role="tab" id={`${id}-tab-in`} aria-controls={`${id}-panel`}
          aria-selected={isIn} tabIndex={isIn ? 0 : -1} onClick={() => switchTo('connexion')}>Se connecter</button>
        <button ref={tabUp} type="button" role="tab" id={`${id}-tab-up`} aria-controls={`${id}-panel`}
          aria-selected={!isIn} tabIndex={isIn ? -1 : 0} onClick={() => switchTo('inscription')}>Créer un compte</button>
      </div>

      <section id={`${id}-panel`} role="tabpanel" aria-labelledby={isIn ? `${id}-tab-in` : `${id}-tab-up`} className="mt-8">
        <h1 className="h1">{isIn ? 'Bon retour parmi nous' : 'Créez votre espace'}</h1>
        <p className="lead mt-2">{isIn ? 'Vos liens et QR vous attendent.' : 'Gratuit, sans carte bancaire.'}</p>

        {!isIn && (
          <ul className="mt-5 grid gap-2.5 text-sm">
            {[
              freeLinks !== null ? `${freeLinks} liens courts, avec leur QR modifiable` : 'Des liens courts, avec leur QR modifiable',
              'Le nombre de visites, jour par jour',
              'Votre carte de visite en ligne',
              'Vos créations sur tous vos appareils',
            ].map((p) => (
              <li key={p} className="flex items-center gap-2.5">
                <CheckIcon className="h-[18px] w-[18px] shrink-0 text-ok" aria-hidden="true" />{p}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={onSubmit} className="mt-6 grid gap-4" aria-describedby={error ? errId : undefined}>
          {!isIn && (
            <div>
              <label className="label" htmlFor={`${id}-name`}>Votre nom ou celui de votre activité</label>
              <input id={`${id}-name`} name="name" className="input" required autoComplete="name" placeholder="Ex. : Restaurant Mami Wata" />
            </div>
          )}
          <div>
            <label className="label" htmlFor={`${id}-email`}>Email</label>
            <input id={`${id}-email`} name="email" type="email" className="input" required autoComplete="email"
              inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="vous@exemple.cg" />
          </div>
          <div>
            <label className="label" htmlFor={`${id}-pw`}>Mot de passe</label>
            <div className="relative">
              <input id={`${id}-pw`} name="password" type={showPw ? 'text' : 'password'} className="input pr-14" required
                minLength={isIn ? undefined : 8} maxLength={128}
                autoComplete={isIn ? 'current-password' : 'new-password'}
                aria-describedby={isIn ? undefined : `${id}-pw-help`} />
              <button type="button" className="icon-btn absolute right-[7px] top-1/2 -translate-y-1/2"
                onClick={() => setShowPw((v) => !v)} aria-pressed={showPw}
                aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                {showPw ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
            {!isIn && <p id={`${id}-pw-help`} className="help">8 caractères minimum. Une phrase courte que vous retenez facilement fait très bien l&apos;affaire.</p>}
          </div>

          <div role="alert">
            {error && (
              <p id={errId} className="flex gap-2.5 rounded-[14px] bg-bad-tint px-3.5 py-3 text-[13px] font-medium text-bad">
                <ExclamationCircleIcon className="mt-px h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-cta btn-lg w-full" disabled={pending} aria-busy={pending}>
            {pending ? <><Spinner />{isIn ? 'Connexion…' : 'Création du compte…'}</> : isIn ? 'Se connecter' : 'Créer mon compte'}
          </button>
          {isIn && (
            <p className="text-center text-sm text-muted">
              Pas encore de compte ?{' '}
              <button type="button" className="link" onClick={() => switchTo('inscription', true)}>Créez-en un gratuitement</button>
            </p>
          )}
        </form>
      </section>

      <p className="mt-8 text-center text-sm">
        <Link href="/" className="link"><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />Continuer sans compte</Link>
      </p>
    </div>
  )
}
