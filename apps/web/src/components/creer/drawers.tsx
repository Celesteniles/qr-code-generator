'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'
import { ArrowDownTrayIcon, ArrowRightIcon, ExclamationTriangleIcon, QrCodeIcon, ShareIcon } from '@heroicons/react/24/outline'
import { signUp } from '@/lib/auth-client'
import { DEFAULT_DESIGN } from '@/lib/qr-design'
import { Illustration } from '@/components/kit/Illustration'
import { QrCanvas, type QrCanvasHandle } from '@/components/kit/QrCanvas'
import { SHORT_HOST, shortUrl } from './helpers'
import { publishLink, type LinkPayload } from './publish'
import { CopyButton, Drawer } from './ui'
import { Spinner } from '@/components/kit/Spinner'
import { qrLinkUrl } from '@/lib/short-link'

// Tiroirs de l'écran Créer : inscription au moment utile, puis succès.

/** Messages de Better Auth → langage courant. */
function signUpMessage(err: { code?: string; message?: string; status?: number }): string {
  const code = err.code ?? ''
  if (code.includes('ALREADY_EXISTS') || err.status === 422) return 'Un compte existe déjà avec cet email. Connectez-vous plutôt.'
  if (code.includes('PASSWORD_TOO_SHORT')) return 'Mot de passe trop court : 8 caractères minimum.'
  if (code.includes('PASSWORD_TOO_LONG')) return 'Mot de passe trop long.'
  if (code.includes('INVALID_EMAIL')) return 'Cette adresse email ne semble pas valide.'
  if (code.includes('SIGNUP') || code.includes('DISABLED')) return 'Les inscriptions sont fermées pour le moment.'
  if (err.status === 429) return 'Trop d’essais d’affilée. Patientez une minute, puis réessayez.'
  return 'Impossible de créer le compte pour le moment. Réessayez dans un instant.'
}

export function SignupDrawer({ open, onClose, payload, nextPath }: {
  open: boolean
  onClose: () => void
  payload: LinkPayload | null
  /** Retour après connexion (lien « Déjà un compte ? »). */
  nextPath: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Compte déjà créé lors d'un essai précédent : ne pas réinscrire.
  const [accountReady, setAccountReady] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!payload || busy) return
    const form = new FormData(e.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    setError(null)
    setBusy(true)

    if (!accountReady) {
      if (password.length < 8) { setBusy(false); setError('Mot de passe trop court : 8 caractères minimum.'); return }
      try {
        const res = await signUp.email({ name: name || email.split('@')[0], email, password })
        if (res.error) { setBusy(false); setError(signUpMessage(res.error)); return }
      } catch {
        setBusy(false); setError('Connexion interrompue. Vérifiez votre réseau et réessayez.'); return
      }
      setAccountReady(true)
    }

    const created = await publishLink(payload)
    if (!created.ok) {
      setBusy(false)
      setError(`Votre compte est créé. Mais ${payload.kind === 'qr' ? 'le QR' : 'le lien'} n'a pas pu être enregistré : ${created.message}`)
      router.refresh()
      return
    }
    router.push(`/liens/${created.id}`)
    router.refresh()
  }

  const what = payload?.kind === 'qr' ? 'votre QR' : 'votre lien'
  return (
    <Drawer
      open={open}
      onClose={onClose}
      label="Créer votre compte"
      footer={
        <>
        <button type="submit" form="creer-signup" className="btn btn-cta btn-lg w-full" disabled={busy || !payload} aria-busy={busy}>
          {busy ? <><Spinner />Un instant…</> : accountReady ? 'Enregistrer' : 'Créer mon compte et enregistrer'}
        </button>
        {!accountReady && (
          <p className="text-center text-[13px] text-muted">
            Déjà un compte ? <Link className="link" href={`/connexion?next=${encodeURIComponent(nextPath)}`}>Se connecter</Link>
          </p>
        )}
        <p className="text-center text-xs text-subtle">Gratuit, sans carte bancaire.</p>
        </>
      }
    >
      <form id="creer-signup" onSubmit={submit} noValidate={false}>
        <Illustration name="account" height={150} className="overflow-hidden rounded-[20px] bg-lilac" />
        <h2 className="h2 mt-6">{payload?.kind === 'qr' ? 'Gardons votre QR au chaud' : 'Gardons votre lien au chaud'}</h2>
        <p className="mt-2 text-muted">
          Créez votre compte gratuit : {payload ? <b className="font-mono text-ink">{SHORT_HOST}/{payload.slug}</b> : what} sera enregistré
          et vous arriverez directement sur sa fiche.
        </p>
        {accountReady ? (
          <p className="tip mint mt-6"><span>Votre compte est prêt. Il ne reste qu&apos;à enregistrer {what}.</span></p>
        ) : (
          <div className="mt-6 grid gap-[18px]">
            <label className="block"><span className="label">Votre nom ou celui de votre activité</span>
              <input className="input" name="name" autoComplete="organization" placeholder="Restaurant Mami Wata" required /></label>
            <label className="block"><span className="label">Email</span>
              <input className="input" name="email" type="email" autoComplete="email" inputMode="email" placeholder="vous@exemple.cg" required /></label>
            <label className="block"><span className="label">Mot de passe</span>
              <input className="input" name="password" type="password" autoComplete="new-password" minLength={8} placeholder="8 caractères minimum" required /></label>
          </div>
        )}
        {error && (
          <p role="alert" className="tip bad mt-5">
            <span className="tip-ico"><ExclamationTriangleIcon /></span><span>{error}</span>
          </p>
        )}
      </form>
    </Drawer>
  )
}

export interface SuccessInfo {
  id: string
  slug: string
  kind: 'link' | 'qr'
  designSaved: boolean
  design?: LinkPayload['design']
  /** Nom de fichier pour le téléchargement du QR. */
  fileName: string
}

export function SuccessDrawer({ info, onClose }: { info: SuccessInfo | null; onClose: () => void }) {
  const qr = useRef<QrCanvasHandle>(null)
  const [downloading, setDownloading] = useState(false)
  if (!info) return null
  const url = shortUrl(info.slug)
  const qrData = qrLinkUrl(info.slug)
  const design = info.design ?? DEFAULT_DESIGN
  const shareHref = `https://wa.me/?text=${encodeURIComponent(url)}`

  async function download() {
    setDownloading(true)
    try { await qr.current?.download('png', info!.fileName, 2048) } finally { setDownloading(false) }
  }

  const isQr = info.kind === 'qr'
  return (
    <Drawer
      open
      onClose={onClose}
      label={isQr ? 'QR créé' : 'Lien créé'}
      footer={
        <>
          {isQr ? (
            <button type="button" className="btn btn-cta btn-lg w-full" onClick={download} disabled={downloading} aria-busy={downloading}>
              {downloading ? <><Spinner />Préparation…</> : <><ArrowDownTrayIcon />Télécharger pour l’impression</>}
            </button>
          ) : (
            <>
              <a className="btn btn-whatsapp btn-lg w-full" href={shareHref} target="_blank" rel="noopener noreferrer"><ShareIcon />Partager sur WhatsApp</a>
              <div className="flex gap-2">
                <CopyButton text={url} withText />
                <button type="button" className="btn btn-soft grow" onClick={download} disabled={downloading} aria-busy={downloading}>{downloading ? <><Spinner />Préparation…</> : <><QrCodeIcon />Télécharger le QR</>}</button>
              </div>
            </>
          )}
          <Link className="btn btn-ghost w-full" href={`/liens/${info.id}`}>
            {isQr ? 'Voir la fiche du QR' : 'Voir la fiche du lien'}<ArrowRightIcon />
          </Link>
        </>
      }
    >
      <div className="text-center">
        {isQr ? (
          <div className="board !p-7"><div className="qrbox"><QrCanvas ref={qr} data={qrData} design={design} size={180} /></div></div>
        ) : (
          <>
            <Illustration name="shortlink" height={160} className="overflow-hidden rounded-[20px] bg-sky" />
            {/* QR du lien, pour le téléchargement (non affiché) */}
            <div className="hidden"><QrCanvas ref={qr} data={qrData} design={design} size={48} /></div>
          </>
        )}
        <h2 className="h1 mt-6">{isQr ? 'C’est prêt !' : 'Votre lien est en ligne !'}</h2>
        <p className="lead mt-2">
          {isQr
            ? 'Imprimez-le : si la destination change, vous la mettrez à jour ici, sans réimprimer.'
            : 'Partagez-le dans vos statuts et vos groupes. Sur sa fiche, vous verrez combien de visites il reçoit.'}
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="linkchip text-lg"><span className="host">{SHORT_HOST}/</span>{info.slug}</span>
          <CopyButton text={url} />
        </div>
        {!info.designSaved && (
          <p className="tip mt-5 text-left"><span>Le style du QR n&apos;a pas pu être enregistré. Vous pourrez le refaire depuis la fiche.</span></p>
        )}
      </div>
    </Drawer>
  )
}
