'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRightIcon, CheckIcon, ExclamationTriangleIcon, GlobeAltIcon, LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline'
import type { Viewer } from '@/components/kit/shell/types'
import { QrCanvas } from '@/components/kit/QrCanvas'
import { DEFAULT_DESIGN } from '@/lib/qr-design'
import { SHORT_HOST, hostOf, isWebUrl, normalizeUrl, shortUrl, slugify, suggestSlug } from './helpers'
import type { CreateFn, LinkRule } from './publish'
import { CopyButton, PlanUsage, Question, SlugField, Sr, useSlugCheck } from './ui'
import { Spinner } from '@/components/kit/Spinner'
import { qrLinkUrl } from '@/lib/short-link'

// Onglet « Lien court » : lien long → adresse courte, et en option « selon le téléphone ».

export function LinkMode({ initialUrl, deviceRoute, viewer, onCreate }: {
  initialUrl: string
  deviceRoute: boolean
  viewer: Viewer
  onCreate: CreateFn
}) {
  const guest = !viewer.user
  const [url, setUrl] = useState(initialUrl)
  const [slugInput, setSlugInput] = useState('')
  const [slugByHand, setSlugByHand] = useState(false)
  const [route, setRoute] = useState<'same' | 'device'>(deviceRoute ? 'device' : 'same')
  const [ios, setIos] = useState('')
  const [android, setAndroid] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urlTouched, setUrlTouched] = useState(Boolean(initialUrl))

  const validUrl = isWebUrl(url)
  const suggestion = validUrl ? suggestSlug(url) : ''
  // Tant que la personne n'a pas tapé son adresse, on propose celle tirée du lien.
  const slug = slugByHand ? slugInput : suggestion
  const status = useSlugCheck(slug)
  const host = validUrl ? hostOf(url) : ''
  const cleanSlug = slugify(slug)
  const preview = cleanSlug ? shortUrl(cleanSlug) : ''

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validUrl) { setUrlTouched(true); setError('Collez d’abord le lien à raccourcir (il commence en général par https://).'); return }
    if (!cleanSlug) { setError('Choisissez une adresse courte.'); return }
    if (status.state === 'done' && !status.check.available && status.check.suggestions.length > 0) {
      setError('Cette adresse est déjà prise. Choisissez une des adresses libres proposées.'); return
    }
    let rule: LinkRule = { type: 'static', url: normalizeUrl(url) }
    if (route === 'device') {
      const i = ios.trim() ? normalizeUrl(ios) : ''
      const a = android.trim() ? normalizeUrl(android) : ''
      if (!i && !a) { setError('Ajoutez le lien iPhone ou Android, ou désactivez « Selon le téléphone ».'); return }
      if ((i && !isWebUrl(i)) || (a && !isWebUrl(a))) { setError('Les liens iPhone et Android doivent commencer par https://.'); return }
      rule = { type: 'app', fallback: normalizeUrl(url), ...(i ? { ios: i } : {}), ...(a ? { android: a } : {}) }
    }
    setBusy(true)
    const msg = await onCreate({ kind: 'link', slug: cleanSlug, rule }, `qr-${cleanSlug}`)
    setBusy(false)
    if (msg) setError(msg)
  }

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-10 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div>
        <Question n={1} title="Quel lien voulez-vous raccourcir ?" hint="Une page de votre boutique, un formulaire, une vidéo, un document…">
          <label className="block">
            <Sr>Lien long</Sr>
            <input
              className="input" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              placeholder="https://votre-boutique.cg/produits/pagne-wax" value={url}
              onChange={(e) => setUrl(e.target.value)} onBlur={() => setUrlTouched(true)}
              aria-invalid={urlTouched && url.trim() !== '' && !validUrl} aria-describedby="lien-help"
            />
          </label>
          <p id="lien-help" className="help">
            {validUrl
              ? <><CheckIcon className="text-ok" />Destination : <b className="font-semibold text-ink">{host}</b></>
              : urlTouched && url.trim()
                ? <><ExclamationTriangleIcon className="text-warn" />Ce n&apos;est pas encore un lien complet. Exemple : https://votre-site.cg/page</>
                : <><SparklesIcon />Astuce : dans votre navigateur, appuyez sur la barre d&apos;adresse puis « Copier ».</>}
          </p>
        </Question>

        <Question n={2} title="Quelle adresse courte ?" hint="C'est ce que les gens verront et taperont. Courte, lisible, à votre image.">
          <SlugField
            value={slug}
            status={status}
            suggestion={slugByHand ? suggestion : undefined}
            onChange={(v) => { setSlugByHand(true); setSlugInput(v) }}
          />
        </Question>

        {/* Option (cas des applications) : pas une étape, pour garder le parcours à deux questions. */}
        <section className="border-t border-line py-6 sm:py-7 md:pl-11" aria-labelledby="route-titre">
          <div className="flex items-start gap-4">
            <div className="grow">
              <h2 id="route-titre" className="h3">Selon le téléphone <span className="opt text-sm font-normal">· option</span></h2>
              <p id="route-aide" className="mt-0.5 text-sm text-muted">Pour une application : iPhone vers l&apos;App Store, Android vers le Play Store, les autres vers votre lien.</p>
            </div>
            <button type="button" className="switch mt-1" role="switch" aria-checked={route === 'device'}
              aria-labelledby="route-titre" aria-describedby="route-aide"
              onClick={() => setRoute(route === 'device' ? 'same' : 'device')} />
          </div>
          {route === 'device' && (
            <div className="anim-rise mt-4">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="block"><span className="label">Sur iPhone</span>
                  <input className="input" type="url" inputMode="url" autoCapitalize="none" placeholder="https://apps.apple.com/…" value={ios} onChange={(e) => setIos(e.target.value)} /></label>
                <label className="block"><span className="label">Sur Android</span>
                  <input className="input" type="url" inputMode="url" autoCapitalize="none" placeholder="https://play.google.com/…" value={android} onChange={(e) => setAndroid(e.target.value)} /></label>
              </div>
              <p className="help"><SparklesIcon />Les autres (ordinateur, tablette…) vont sur le lien de l&apos;étape 1.</p>
            </div>
          )}
        </section>
      </div>

      {/* ── Aperçu ── */}
      <aside className="grid gap-3.5 xl:sticky xl:top-6" aria-label="Aperçu du lien">
        <div className="flex min-w-0 items-center gap-2 font-display text-xl font-[650] tracking-[-.02em]">
          <GlobeAltIcon className="h-5 w-5 shrink-0 text-subtle" />
          <span className="truncate">{host || 'Votre lien court'}</span>
        </div>

        <div className="card p-[18px]">
          <div className="text-xs font-semibold text-subtle">Votre lien</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="linkchip min-w-0 overflow-hidden text-ellipsis text-lg">
              <span className="host">{SHORT_HOST}/</span>{cleanSlug || <span className="text-subtle">…</span>}
            </span>
            {preview && <span className="ml-auto"><CopyButton text={preview} /></span>}
          </div>
          <div className="mt-3 flex items-center gap-2.5 border-t border-line pt-3">
            <div className="qr-thumb !rounded-[10px] !p-1">
              {preview
                ? <QrCanvas data={qrLinkUrl(cleanSlug)} design={DEFAULT_DESIGN} size={144} className="!h-12 !w-12" />
                : <div className="h-12 w-12 rounded-md bg-soft" aria-hidden="true" />}
            </div>
            <div className="grow text-[13px]">
              <b>Son QR est prêt aussi</b>
              <div className="text-xs text-muted">Vous le téléchargerez quand vous voudrez l&apos;imprimer.</div>
            </div>
          </div>
        </div>

        <div className="mt-1 text-xs font-semibold text-subtle">Ce que verront vos contacts sur WhatsApp</div>
        <div className="share-preview">
          <div className="bubble">
            {host && (
              <div className="flex items-center gap-2 rounded-[10px] bg-black/5 px-2.5 py-2 text-[13px] text-[#54656f]">
                <GlobeAltIcon className="h-4 w-4 shrink-0" /><span className="truncate">{host}</span>
              </div>
            )}
            <div className="msg">
              {preview
                ? <span className="text-[#027eb5] underline">{SHORT_HOST}/{cleanSlug}</span>
                : <span className="text-[#667781]">Votre lien apparaîtra ici.</span>}
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="tip bad"><span className="tip-ico"><ExclamationTriangleIcon /></span><span>{error}</span></p>
        )}
        <button type="submit" className="btn btn-cta btn-lg w-full" disabled={busy} aria-busy={busy}>
          {busy ? <><Spinner />Création…</> : <>Créer mon lien <ArrowRightIcon /></>}
        </button>
        {guest ? (
          <div className="tip blue">
            <span className="tip-ico"><LockClosedIcon /></span>
            <div><strong>Un compte gratuit, et c&apos;est en ligne</strong>Vos liens restent à vous, modifiables quand vous voulez, avec leurs visites comptées.</div>
          </div>
        ) : <PlanUsage viewer={viewer} what="liens utilisés" />}
      </aside>
    </form>
  )
}
