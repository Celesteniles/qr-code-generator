'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { authClient } from '@/lib/auth-client'
import { Spinner } from '@/components/kit/Spinner'
import { ResultTip } from './SectionHead'

const MIN = 8
const MAX = 128

type AuthError = { code?: string; message?: string; status?: number } | null | undefined

/** Erreurs Better Auth → langage courant. */
function explain(err: AuthError): string {
  const code = err?.code ?? ''
  if (err?.status === 429) return 'Trop d\'essais d\'affilée. Patientez une minute, puis réessayez.'
  if (code === 'INVALID_PASSWORD') return 'Le mot de passe actuel n\'est pas le bon. Vérifiez-le (majuscules comprises) et réessayez.'
  if (code === 'PASSWORD_TOO_SHORT') return `Nouveau mot de passe trop court : ${MIN} caractères minimum.`
  if (code === 'PASSWORD_TOO_LONG') return `Nouveau mot de passe trop long : ${MAX} caractères maximum.`
  if (err?.status === 401) return 'Votre session a expiré. Reconnectez-vous puis réessayez.'
  return 'Le mot de passe n\'a pas pu être changé. Réessayez dans un instant.'
}

type Result = { ok: true; revoked: boolean } | { ok: false; message: string } | null

/** « Mot de passe » : actuel, nouveau, confirmation. */
export function PasswordForm({ email }: { email: string }) {
  const id = useId()
  const router = useRouter()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [revokeOthers, setRevokeOthers] = useState(true)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<Result>(null)

  const mismatch = confirm.length > 0 && confirm !== next
  const edit = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => { setter(e.target.value); setResult(null) }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    if (next.length < MIN) return setResult({ ok: false, message: `Nouveau mot de passe trop court : ${MIN} caractères minimum.` })
    if (next !== confirm) return setResult({ ok: false, message: 'La confirmation ne correspond pas au nouveau mot de passe. Retapez-la.' })
    if (next === current) return setResult({ ok: false, message: 'Le nouveau mot de passe est identique à l\'actuel. Choisissez-en un autre.' })

    setPending(true)
    setResult(null)
    try {
      const res = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: revokeOthers })
      if (res.error) {
        setResult({ ok: false, message: explain(res.error) })
        return
      }
      setCurrent(''); setNext(''); setConfirm(''); setShow(false)
      setResult({ ok: true, revoked: revokeOthers })
      // La liste des appareils change si les autres ont été déconnectés.
      router.refresh()
    } catch {
      setResult({ ok: false, message: 'Connexion impossible. Vérifiez votre réseau et réessayez.' })
    } finally {
      setPending(false)
    }
  }

  const type = show ? 'text' : 'password'
  const eye = (
    <button type="button" className="icon-btn absolute right-[7px] top-1/2 -translate-y-1/2"
      onClick={() => setShow((v) => !v)} aria-pressed={show}
      aria-label={show ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}>
      {show ? <EyeSlashIcon /> : <EyeIcon />}
    </button>
  )

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {/* Aide les gestionnaires de mots de passe à associer le compte. */}
      <input type="text" name="username" autoComplete="username" className="hidden" aria-hidden="true" tabIndex={-1} readOnly value={email} />
      <div>
        <label className="label" htmlFor={`${id}-cur`}>Mot de passe actuel</label>
        <div className="relative">
          <input id={`${id}-cur`} type={type} className="input pr-14" required autoComplete="current-password"
            maxLength={MAX} value={current} onChange={edit(setCurrent)} />
          {eye}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${id}-new`}>Nouveau mot de passe</label>
          <input id={`${id}-new`} type={type} className="input" required minLength={MIN} maxLength={MAX}
            autoComplete="new-password" aria-describedby={`${id}-new-help`} value={next} onChange={edit(setNext)} />
          <p id={`${id}-new-help`} className="help">{MIN} caractères minimum. Une phrase courte que vous retenez facilement fait très bien l&apos;affaire.</p>
        </div>
        <div>
          <label className="label" htmlFor={`${id}-conf`}>Confirmez le nouveau</label>
          <input id={`${id}-conf`} type={type} className="input" required maxLength={MAX} autoComplete="new-password"
            aria-invalid={mismatch || undefined} aria-describedby={mismatch ? `${id}-conf-err` : undefined}
            value={confirm} onChange={edit(setConfirm)} />
          {mismatch && <p id={`${id}-conf-err`} className="help text-bad">Les deux saisies ne sont pas identiques.</p>}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--brand)]"
          checked={revokeOthers} onChange={(e) => setRevokeOthers(e.target.checked)} />
        <span>
          <span className="font-semibold">Déconnecter mes autres appareils</span>
          <span className="block text-muted">Conseillé si vous pensez que quelqu&apos;un d&apos;autre connaît votre ancien mot de passe.</span>
        </span>
      </label>

      <div>
        <button type="submit" className="btn btn-cta" disabled={pending || !current || !next || !confirm} aria-busy={pending}>
          {pending ? <><Spinner />Changement…</> : 'Changer le mot de passe'}
        </button>
      </div>

      <div aria-live="polite" className="-mt-4">
        {result?.ok && (
          <ResultTip ok title="Mot de passe changé">
            {result.revoked
              ? 'Vos autres appareils ont été déconnectés. Utilisez le nouveau mot de passe pour vous y reconnecter.'
              : 'Utilisez-le dès votre prochaine connexion.'}
          </ResultTip>
        )}
        {result && !result.ok && <ResultTip ok={false} title="Le mot de passe n'a pas changé">{result.message}</ResultTip>}
      </div>
    </form>
  )
}
