'use client'

import { useId, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, EnvelopeIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { authClient } from '@/lib/auth-client'
import { Spinner } from '@/components/kit/Spinner'
import { Turnstile, type TurnstileHandle } from './Turnstile'

/** Page de saisie du nouveau mot de passe (cible du lien de l'e-mail). */
const RESET_PAGE = '/reinitialiser'

type AuthError = { code?: string; message?: string; status?: number } | null | undefined

/**
 * Aucune de ces erreurs ne dit si l'adresse a un compte : le serveur répond
 * pareil dans les deux cas, et l'e-mail part en tâche de fond (un échec d'envoi
 * n'est jamais remonté ici).
 */
function explain(err: AuthError): string {
  const code = err?.code ?? ''
  if (err?.status === 429) return 'Trop de demandes d\'affilée. Patientez une minute, puis réessayez.'
  if (code === 'VERIFICATION_FAILED' || code === 'MISSING_RESPONSE') {
    return 'La vérification anti-robot n\'a pas abouti. Attendez qu\'elle se termine, puis réessayez.'
  }
  if (code === 'INVALID_EMAIL' || code === 'VALIDATION_ERROR') return 'Cette adresse email ne semble pas complète. Exemple : vous@exemple.cg.'
  return 'La demande n\'a pas abouti. Vérifiez votre réseau, puis réessayez.'
}

export function ForgotPasswordForm({ turnstileSiteKey }: {
  /** Clé publique Turnstile ; absente → pas de widget (le serveur n'exige alors rien). */
  turnstileSiteKey?: string | null
}) {
  const id = useId()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<TurnstileHandle>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    setError(null)
    if (turnstileSiteKey && !captchaToken) {
      setError('Vérification anti-robot en cours. Patientez un instant, puis réessayez.')
      return
    }
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim()
    setPending(true)
    // Jeton Turnstile dans l'en-tête lu par le plugin captcha de Better Auth.
    const fetchOptions = captchaToken ? { headers: { 'x-captcha-response': captchaToken } } : undefined
    try {
      const res = await authClient.requestPasswordReset({ email, redirectTo: RESET_PAGE, fetchOptions })
      // Un jeton ne sert qu'une fois : nouveau défi pour un prochain envoi.
      captchaRef.current?.reset()
      if (res.error) {
        setError(explain(res.error))
        return
      }
      // Même message neutre, qu'un compte existe ou non.
      setSentTo(email)
    } catch {
      setError('Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.')
      captchaRef.current?.reset()
    } finally {
      setPending(false)
    }
  }

  const errId = `${id}-err`

  return (
    <div className="w-full max-w-[400px]">
      <h1 className="h1">Mot de passe oublié&nbsp;?</h1>

      {sentTo ? (
        <div className="anim-rise" role="status">
          <p className="mt-6 flex gap-2.5 rounded-[14px] bg-ok-tint px-3.5 py-3 text-sm font-medium text-ok">
            <EnvelopeIcon className="mt-px h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span>Si un compte existe pour cette adresse, un e-mail vient d&apos;être envoyé.</span>
          </p>
          <p className="lead mt-4 text-sm">
            Ouvrez-le et appuyez sur « Choisir un nouveau mot de passe ». Le lien est valable 1 heure.
            Rien reçu après quelques minutes&nbsp;? Regardez dans les courriers indésirables, ou vérifiez l&apos;adresse.
          </p>
          <button type="button" className="btn btn-soft mt-6 w-full" onClick={() => setSentTo(null)}>
            Essayer une autre adresse
          </button>
        </div>
      ) : (
        <>
          <p className="lead mt-2">Indiquez l&apos;email de votre compte : nous vous envoyons un lien pour en choisir un nouveau.</p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4" aria-describedby={error ? errId : undefined}>
            <div>
              <label className="label" htmlFor={`${id}-email`}>Email</label>
              <input id={`${id}-email`} name="email" type="email" className="input" required autoComplete="email"
                inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="vous@exemple.cg" />
            </div>

            {turnstileSiteKey && (
              <Turnstile ref={captchaRef} siteKey={turnstileSiteKey} onToken={setCaptchaToken}
                onUnavailable={() => setError('La vérification anti-robot ne se charge pas. Vérifiez votre réseau ou désactivez le bloqueur de publicités, puis rechargez la page.')} />
            )}

            <div role="alert">
              {error && (
                <p id={errId} className="flex gap-2.5 rounded-[14px] bg-bad-tint px-3.5 py-3 text-[13px] font-medium text-bad">
                  <ExclamationCircleIcon className="mt-px h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-cta btn-lg w-full" disabled={pending} aria-busy={pending}>
              {pending ? <><Spinner />Envoi…</> : 'Recevoir le lien'}
            </button>
          </form>
        </>
      )}

      <p className="mt-8 text-center text-sm">
        <Link href="/connexion" className="link"><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />Retour à la connexion</Link>
      </p>
    </div>
  )
}
