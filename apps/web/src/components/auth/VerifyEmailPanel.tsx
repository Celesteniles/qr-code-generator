'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon, EnvelopeIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { authClient, signOut } from '@/lib/auth-client'
import { Spinner } from '@/components/kit/Spinner'
import { verifyEmailPath } from './verify-path'

// Écran « Vérifiez votre adresse e-mail » : renvoyer le lien, constater la
// confirmation faite dans un autre onglet, ou changer de compte.

/** Délai entre deux renvois depuis cet écran (le serveur limite aussi à 3/min). */
const COOLDOWN_S = 30

type Notice = { tone: 'ok' | 'bad'; text: string } | null

export function VerifyEmailPanel({ email, next, problem }: {
  email: string
  /** Destination une fois l'adresse confirmée. */
  next: string
  /** Lien ouvert mais refusé (expiré, invalide) : message à montrer d'emblée. */
  problem?: string | null
}) {
  const router = useRouter()
  const [notice, setNotice] = useState<Notice>(problem ? { tone: 'bad', text: problem } : null)
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [checking, startCheck] = useTransition()
  const checkAsked = useRef(false)
  const [leaving, setLeaving] = useState(false)

  // Compte à rebours du bouton « Renvoyer ».
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Lien ouvert dans un autre onglet : au retour sur celui-ci, le serveur
  // constate la vérification et redirige.
  useEffect(() => {
    function onVisible() { if (document.visibilityState === 'visible') router.refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [router])

  async function resend() {
    setSending(true)
    setNotice(null)
    try {
      const res = await authClient.sendVerificationEmail({ email, callbackURL: verifyEmailPath(next) })
      if (res.error) {
        const err = res.error
        if (err.status === 429) setNotice({ tone: 'bad', text: 'Trop de demandes d\'affilée. Patientez une minute, puis réessayez.' })
        else if (err.code === 'EMAIL_ALREADY_VERIFIED') { router.refresh(); return }
        else setNotice({ tone: 'bad', text: 'L\'e-mail n\'a pas pu partir. Réessayez dans un instant.' })
        return
      }
      setNotice({ tone: 'ok', text: `C'est reparti : un nouveau lien vient d'être envoyé à ${email}.` })
      setCooldown(COOLDOWN_S)
    } catch {
      setNotice({ tone: 'bad', text: 'Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.' })
    } finally {
      setSending(false)
    }
  }

  function checkAgain() {
    checkAsked.current = true
    setNotice(null)
    // Vérifiée : le serveur redirige. Sinon la page reste, et on le dit (ci-dessous).
    startCheck(() => router.refresh())
  }

  useEffect(() => {
    if (checking || !checkAsked.current) return
    checkAsked.current = false
    setNotice({ tone: 'bad', text: 'Votre adresse n\'est pas encore confirmée. Ouvrez le lien reçu par e-mail, puis revenez ici.' })
  }, [checking])

  async function switchAccount() {
    setLeaving(true)
    try {
      await signOut()
      router.push('/connexion')
      router.refresh()
    } catch {
      setLeaving(false)
      setNotice({ tone: 'bad', text: 'La déconnexion n\'a pas abouti. Vérifiez votre réseau, puis réessayez.' })
    }
  }

  return (
    <section>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky text-ink" aria-hidden="true">
        <EnvelopeIcon className="h-6 w-6" />
      </span>
      <h1 className="h1 mt-5">Vérifiez votre adresse e-mail</h1>
      <p className="lead mt-3">
        Nous avons envoyé un lien de confirmation à <strong className="break-all text-ink">{email}</strong>.
        Ouvrez-le pour accéder à votre espace.
      </p>
      <p className="help">
        Rien reçu après quelques minutes ? Regardez dans les courriers indésirables (spam), puis renvoyez l&apos;e-mail.
        Le lien reste valable 24 heures.
      </p>

      <div role="status" aria-live="polite" className="mt-5">
        {notice && (
          <p className={`flex gap-2.5 rounded-[14px] px-3.5 py-3 text-[13px] font-medium ${notice.tone === 'ok' ? 'bg-soft text-ink' : 'bg-bad-tint text-bad'}`}>
            {notice.tone === 'ok'
              ? <CheckIcon className="mt-px h-[18px] w-[18px] shrink-0 text-ok" aria-hidden="true" />
              : <ExclamationCircleIcon className="mt-px h-[18px] w-[18px] shrink-0" aria-hidden="true" />}
            <span>{notice.text}</span>
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-3">
        <button type="button" className="btn btn-cta btn-lg w-full" onClick={resend}
          disabled={sending || cooldown > 0} aria-busy={sending}>
          {sending ? <><Spinner />Envoi…</> : cooldown > 0 ? `Renvoyer l'e-mail (${cooldown} s)` : 'Renvoyer l\'e-mail'}
        </button>
        <button type="button" className="btn btn-ghost btn-lg w-full" onClick={checkAgain} disabled={checking} aria-busy={checking}>
          {checking ? <><Spinner />Vérification…</> : 'J\'ai confirmé mon adresse'}
        </button>
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        Ce n&apos;est pas la bonne adresse ?{' '}
        <button type="button" className="link" onClick={switchAccount} disabled={leaving}>
          {leaving ? 'Déconnexion…' : 'Changer de compte'}
        </button>
      </p>
    </section>
  )
}
