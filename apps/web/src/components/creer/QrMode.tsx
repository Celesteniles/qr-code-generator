'use client'

import Link from 'next/link'
import { useRef, useState, type FormEvent } from 'react'
import {
  ArrowDownTrayIcon, ArrowRightIcon, CheckIcon, EyeIcon, ExclamationTriangleIcon, InformationCircleIcon, LockClosedIcon, PencilIcon, SparklesIcon,
} from '@heroicons/react/24/outline'
import type { Viewer } from '@/components/kit/shell/types'
import { Illustration } from '@/components/kit/Illustration'
import { QrCanvas, type QrCanvasHandle } from '@/components/kit/QrCanvas'
import { saveLocalQr } from '@/lib/local-qr'
import type { QrDesign } from '@/lib/qr-design'
import { buildContent, canBeModifiable, ContentFields, initialValues, TYPE_META, TypePicker, type ContentType, type ContentValues } from './content'
import { SHORT_HOST, isWebUrl, normalizeUrl, readability, slugify, suggestSlug } from './helpers'
import type { CreateFn, LinkRule } from './publish'
import { STYLE_PRESETS, StyleEditor } from './style'
import { PlanUsage, Question, SlugField, useSlugCheck } from './ui'
import { Spinner } from '@/components/kit/Spinner'
import { qrLinkUrl } from '@/lib/short-link'

// Onglet « QR code » : contenu → champs → fixe ou modifiable → style. Aperçu réel (qr-code-styling).

const SIZES = [
  { label: 'Écran', value: 512 },
  { label: 'Affiche', value: 1024 },
  { label: 'Grand format', value: 2048 },
]

export function QrMode({ initialType, initialUrl, viewer, onCreate }: {
  initialType: ContentType
  initialUrl: string
  viewer: Viewer
  onCreate: CreateFn
}) {
  const guest = !viewer.user
  const [type, setType] = useState<ContentType>(initialType)
  const [values, setValues] = useState<ContentValues>(() => {
    const v = initialValues(initialType === 'site' ? initialUrl : '')
    if (initialType === 'menu') v.menu = initialUrl
    if (initialType === 'app') v.appUrl = initialUrl
    if (initialType === 'reseaux') v.socialUrl = initialUrl
    return v
  })
  const set = <K extends keyof ContentValues>(k: K, val: ContentValues[K]) => setValues((s) => ({ ...s, [k]: val }))
  const [wantKind, setWantKind] = useState<'fixed' | 'modifiable'>('modifiable')
  const [design, setDesign] = useState<QrDesign>(STYLE_PRESETS[1].design)
  const [slugInput, setSlugInput] = useState('')
  const [slugByHand, setSlugByHand] = useState(false)
  const [ios, setIos] = useState('')
  const [android, setAndroid] = useState('')
  const [name, setName] = useState('')
  const [format, setFormat] = useState<'png' | 'svg'>('png')
  const [size, setSize] = useState(1024)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const qr = useRef<QrCanvasHandle>(null)

  const meta = TYPE_META[type]
  const built = buildContent(type, values)
  const modifiableAllowed = canBeModifiable(type)
  const kind = modifiableAllowed ? wantKind : 'fixed'
  const suggestion = built.link ? suggestSlug(type === 'whatsapp' ? 'whatsapp' : built.link) : ''
  const slug = slugByHand ? slugInput : suggestion
  const cleanSlug = slugify(slug)
  // La vérification ne tourne que pour un QR modifiable.
  const status = useSlugCheck(kind === 'modifiable' ? slug : '')
  const qrData = kind === 'modifiable' ? (cleanSlug ? qrLinkUrl(cleanSlug) : '') : built.data
  const read = readability(design)
  const label = name.trim() || built.label

  function changeType(t: ContentType) {
    setType(t)
    setError(null)
    setSaved(false)
  }

  async function download() {
    if (!qrData) { setError(`Remplissez d’abord l’étape 2 : ${meta.title.toLowerCase()}`); return }
    setError(null)
    setBusy(true)
    try {
      await qr.current?.download(format, slugify(label) || 'qr-code', size)
      const entry = saveLocalQr({ label, kind: type, data: qrData, design })
      setSaved(entry !== null)
    } catch {
      setError('Le téléchargement n’a pas abouti. Réessayez.')
    } finally {
      setBusy(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    // QR fixe : pas d'envoi (Entrée dans un champ ne lance pas de téléchargement).
    if (kind === 'fixed') return
    setError(null)
    if (!built.link) { setError(`Remplissez d’abord l’étape 2 : ${meta.title.toLowerCase()}`); return }
    if (!cleanSlug) { setError('Choisissez l’adresse courte de votre QR.'); return }
    if (status.state === 'done' && !status.check.available && status.check.suggestions.length > 0) {
      setError('Cette adresse est déjà prise. Choisissez une des adresses libres proposées.'); return
    }
    let rule: LinkRule = { type: 'static', url: built.link }
    if (type === 'app') {
      const i = ios.trim() ? normalizeUrl(ios) : ''
      const a = android.trim() ? normalizeUrl(android) : ''
      if ((i && !isWebUrl(i)) || (a && !isWebUrl(a))) { setError('Les liens iPhone et Android doivent commencer par https://.'); return }
      if (i || a) rule = { type: 'app', fallback: built.link, ...(i ? { ios: i } : {}), ...(a ? { android: a } : {}) }
    }
    setBusy(true)
    const msg = await onCreate({ kind: 'qr', slug: cleanSlug, rule, design }, slugify(label) || `qr-${cleanSlug}`)
    setBusy(false)
    if (msg) setError(msg)
  }

  const appDevice = type === 'app' && kind === 'modifiable' ? (
    <div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <label className="block"><span className="label">Sur iPhone <span className="opt">· facultatif</span></span>
          <input className="input" type="url" inputMode="url" autoCapitalize="none" placeholder="https://apps.apple.com/…" value={ios} onChange={(e) => setIos(e.target.value)} /></label>
        <label className="block"><span className="label">Sur Android <span className="opt">· facultatif</span></span>
          <input className="input" type="url" inputMode="url" autoCapitalize="none" placeholder="https://play.google.com/…" value={android} onChange={(e) => setAndroid(e.target.value)} /></label>
      </div>
      <p className="help"><SparklesIcon />Chaque téléphone ira vers son magasin d&apos;applications ; les autres vont sur le lien ci-dessus.</p>
    </div>
  ) : null

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-10 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div>
        <Question n={1} title="Que doit ouvrir votre QR ?" hint="Ce que la personne verra en scannant.">
          <TypePicker value={type} onChange={changeType} />
          <Link className="link mt-3 text-[13px]" href="/bienvenue"><EyeIcon className="h-4 w-4" />Pas sûr ? Voir des exemples</Link>
        </Question>

        <Question n={2} title={meta.title} hint={meta.hint}>
          <ContentFields type={type} v={values} set={set} appDevice={appDevice} />
        </Question>

        <Question n={3} title="Pourrez-vous avoir besoin de le changer ?" hint={modifiableAllowed ? 'Par exemple quand votre menu évolue, sans réimprimer les tables.' : undefined}>
          {modifiableAllowed ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="QR fixe ou modifiable">
                <button type="button" className="choice" aria-pressed={kind === 'fixed'} onClick={() => setWantKind('fixed')}>
                  <Illustration name="fixed" height={96} className="overflow-hidden rounded-xl bg-soft" />
                  <strong>Non, c&apos;est définitif</strong><span className="text-[13px] text-muted">QR fixe · gratuit, sans compte</span>
                </button>
                <button type="button" className="choice" aria-pressed={kind === 'modifiable'} onClick={() => setWantKind('modifiable')}>
                  <Illustration name="modifiable" height={96} className="overflow-hidden rounded-xl bg-sky" />
                  <strong className="flex flex-wrap items-center gap-1">Oui, peut-être <span className="pill pill-brand !h-[22px]">Conseillé</span></strong>
                  <span className="text-[13px] text-muted">QR modifiable · crée aussi un lien court</span>
                </button>
              </div>
              {kind === 'modifiable' && (
                <div className="mt-4">
                  <SlugField
                    label="Votre adresse courte"
                    value={slug}
                    status={status}
                    suggestion={slugByHand ? suggestion : undefined}
                    onChange={(v) => { setSlugByHand(true); setSlugInput(v) }}
                    extraHelp={<span className="font-normal text-muted"> C&apos;est l&apos;adresse que contient le QR.</span>}
                  />
                  <details className="mt-3">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-semibold text-brand [&::-webkit-details-marker]:hidden">
                      <EyeIcon className="h-4 w-4" />Comment ça marche ?
                    </summary>
                    <p className="mt-2 rounded-xl bg-soft px-3.5 py-3 text-[13px] text-muted">
                      Le QR imprimé contient toujours <b className="text-ink">{SHORT_HOST}/{cleanSlug || '…'}</b>. Quand quelqu&apos;un scanne, on l&apos;envoie
                      vers la destination que vous avez choisie. Changez-la dans votre espace : les QR déjà imprimés suivent.
                    </p>
                  </details>
                </div>
              )}
            </>
          ) : (
            <div className="tip blue">
              <span className="tip-ico"><InformationCircleIcon /></span>
              <div>
                <strong>Ce QR sera fixe</strong>{meta.fixedWhy}
                {type === 'vcard' && <div className="mt-2"><Link className="link" href="/carte">Découvrir la Carte de visite <ArrowRightIcon className="h-4 w-4" /></Link></div>}
              </div>
            </div>
          )}
        </Question>

        <Question n={4} title="À quoi doit-il ressembler ?" hint="Choisissez un style, affinez si vous voulez.">
          <StyleEditor design={design} onChange={setDesign} />
        </Question>
      </div>

      {/* ── Aperçu (en premier sur mobile) ── */}
      <aside className="order-first grid gap-3.5 xl:sticky xl:top-6 xl:order-none" aria-label="Aperçu du QR">
        {kind === 'fixed' && (
          <label className="flex items-center gap-2">
            <span className="sr-only">Nom du QR (pour vous)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={built.label}
              className="min-w-0 flex-1 border-0 bg-transparent py-1 font-display text-xl font-[650] text-ink outline-none placeholder:text-ink focus:shadow-[0_2px_0_var(--brand)]" />
            <PencilIcon className="h-4 w-4 text-subtle" aria-hidden="true" />
          </label>
        )}
        <div className="board">
          <div className="qrbox">
            {qrData
              ? <QrCanvas ref={qr} data={qrData} design={design} size={248} />
              : (
                <div className="grid h-[248px] w-[248px] max-w-full place-items-center rounded-[10px] border-2 border-dashed border-[#d7d2c8] p-6 text-center text-sm leading-snug text-[#6b665b]">
                  {kind === 'modifiable' && built.link ? 'Choisissez l’adresse courte pour voir votre QR.' : 'Votre QR apparaîtra ici dès l’étape 2 remplie.'}
                </div>
              )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {qrData && (read.ok
            ? <span className="pill pill-ok"><CheckIcon />Se scanne bien</span>
            : <span className="pill pill-bad"><ExclamationTriangleIcon />À vérifier</span>)}
          <span className="ml-auto text-xs text-muted">
            {kind === 'modifiable' ? <span className="font-mono">{SHORT_HOST}/{cleanSlug || '…'}</span> : 'QR fixe'}
          </span>
        </div>
        {!read.ok && (
          <p className="tip" role="status">
            <span className="tip-ico"><ExclamationTriangleIcon /></span>
            <span>
              {read.reason === 'inverted'
                ? 'Motif clair sur fond foncé : certains téléphones ne le lisent pas. Préférez un motif foncé sur fond clair.'
                : 'Pas assez de contraste entre le motif et le fond : foncez le motif ou éclaircissez le fond.'}
            </span>
          </p>
        )}

        {error && <p role="alert" className="tip bad"><span className="tip-ico"><ExclamationTriangleIcon /></span><span>{error}</span></p>}

        {kind === 'fixed' ? (
          <div className="grid gap-2.5">
            <button type="button" onClick={download} className="btn btn-cta btn-lg w-full" disabled={busy} aria-busy={busy}>{busy ? <><Spinner />Préparation…</> : <><ArrowDownTrayIcon />Télécharger</>}</button>
            <div className="flex flex-wrap justify-center gap-2">
              <div className="seg" role="group" aria-label="Format du fichier">
                {(['png', 'svg'] as const).map((f) => (
                  <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(f)}>{f.toUpperCase()}</button>
                ))}
              </div>
              <div className="seg" role="group" aria-label="Taille de l'image">
                {SIZES.map((s) => (
                  <button key={s.value} type="button" aria-pressed={size === s.value} onClick={() => setSize(s.value)} title={`${s.value} × ${s.value} px`}>{s.label}</button>
                ))}
              </div>
            </div>
            <p className="text-center text-xs text-subtle" aria-live="polite">
              {saved ? <><CheckIcon className="mr-1 inline h-3.5 w-3.5 text-ok" />Téléchargé. Gardé aussi dans Mes liens &amp; QR sur cet appareil.</> : 'Gardé aussi dans Mes liens & QR sur cet appareil.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5">
            <button type="submit" className="btn btn-cta btn-lg w-full" disabled={busy} aria-busy={busy}>
              {busy ? <><Spinner />Création…</> : <>{guest ? 'Enregistrer mon QR' : 'Créer mon QR modifiable'} <ArrowRightIcon /></>}
            </button>
            {guest ? (
              <div className="tip blue">
                <span className="tip-ico"><LockClosedIcon /></span>
                <div><strong>Dernière étape : un compte gratuit</strong>30 secondes, sans carte bancaire. Votre QR et son style sont gardés.</div>
              </div>
            ) : <PlanUsage viewer={viewer} what="liens et QR modifiables utilisés" />}
          </div>
        )}
      </aside>
    </form>
  )
}
