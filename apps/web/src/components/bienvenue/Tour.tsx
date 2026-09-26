'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { PLANS } from '@link/shared'
import { Logo } from '@/components/kit/Logo'
import { Illustration } from '@/components/kit/Illustration'
import { CHOICES, type Kind } from './choices'

// Visite guidée : 4 étapes (bienvenue, intention, fixe ou modifiable, prêt).
// Mène à l'écran Créer préparé selon les réponses (contrat /creer?mode=…&type=…).

const STEPS = 4

export function Tour() {
  const [step, setStep] = useState(0)
  const [choiceId, setChoiceId] = useState<string | null>(null)
  const [kind, setKind] = useState<Kind | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const first = useRef(true)

  const choice = CHOICES.find((c) => c.id === choiceId) ?? null
  const effectiveKind: Kind | null = choice
    ? (kind && choice.allowed.includes(kind) ? kind : choice.recommended)
    : null

  // Déplace le focus sur le titre de l'étape (lecteurs d'écran, clavier).
  useEffect(() => {
    if (first.current) { first.current = false; return }
    heading.current?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const go = (n: number) => setStep(Math.max(0, Math.min(STEPS - 1, n)))
  const pick = (id: string) => { setChoiceId(id); setKind(null) }

  const cta = choice && effectiveKind ? choice.cta[effectiveKind] : null

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex items-center gap-3 px-4 py-4 min-[860px]:px-7 min-[860px]:py-5">
        <Logo />
        <div className="mx-auto flex gap-1.5" role="progressbar" aria-label="Progression de la visite"
          aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1} aria-valuetext={`Étape ${step + 1} sur ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k <= step ? 'w-11 bg-ink' : 'w-7 bg-line'}`} />
          ))}
        </div>
        <Link className="btn btn-ghost btn-sm" href="/">Passer<XMarkIcon className="max-sm:hidden" aria-hidden="true" /></Link>
      </header>

      <main className="grid flex-1 place-items-center px-4 pb-10 pt-3 min-[860px]:px-6">
        <div key={step} className="w-full max-w-[1040px] animate-[fade_.3s_ease]">

          {step === 0 && (
            <section className="grid items-center gap-6 min-[860px]:grid-cols-2 min-[860px]:gap-12">
              <div>
                <span className="pill pill-sun">Bienvenue</span>
                <h1 ref={heading} tabIndex={-1} className="display mt-4 outline-none">
                  Un lien ou un QR. <span className="hl">Vos clients arrivent au bon endroit.</span>
                </h1>
                <p className="lead mt-4">
                  link.cg raccourcit vos liens pour WhatsApp, Facebook et vos SMS, et crée des QR codes à votre image pour
                  vos affiches et vos tables. Avec un compte gratuit, ils restent modifiables, même après impression.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <button type="button" className="btn btn-cta btn-lg" onClick={() => go(1)}>Commencer <ArrowRightIcon aria-hidden="true" /></button>
                  <span className="text-sm text-muted">1 minute · sans inscription</span>
                </div>
              </div>
              <Illustration name="welcome" className="order-first rounded-[36px] bg-surface p-[18px] shadow-[var(--shadow)] min-[860px]:order-none" />
            </section>
          )}

          {step === 1 && (
            <section>
              <span className="eyebrow">Étape 1 sur 3</span>
              <h1 ref={heading} tabIndex={-1} id="q-intent" className="h1 mt-2 outline-none">Que voulez-vous partager ?</h1>
              <p className="lead mt-2">Choisissez l&apos;exemple le plus proche, on prépare le reste pour vous.</p>
              <div className="stagger mt-8 grid grid-cols-1 gap-3.5 min-[480px]:grid-cols-2 min-[860px]:grid-cols-3" role="group" aria-labelledby="q-intent">
                {CHOICES.map((c) => (
                  <button key={c.id} type="button" className="choice" aria-pressed={choiceId === c.id} onClick={() => pick(c.id)}>
                    <Illustration name={c.ill} height={120} className={`w-full overflow-hidden rounded-[14px] ${c.bg}`} />
                    <strong>{c.title}</strong>
                    <span className="text-sm text-muted">{c.desc}</span>
                  </button>
                ))}
              </div>
              <Actions onBack={() => go(0)} onNext={() => go(2)} nextDisabled={!choice}
                hint={!choice ? 'Choisissez un exemple pour continuer.' : undefined} />
            </section>
          )}

          {step === 2 && choice && (
            <section>
              <span className="eyebrow">Étape 2 sur 3</span>
              <h1 ref={heading} tabIndex={-1} id="q-kind" className="h1 mt-2 outline-none">{choice.question}</h1>
              <p className="lead mt-2">{choice.lead}</p>
              <div className="mt-8 grid gap-4 min-[860px]:grid-cols-2" role="group" aria-labelledby="q-kind">
                <KindCard
                  kind="fixe" selected={effectiveKind === 'fixe'} allowed={choice.allowed.includes('fixe')}
                  recommended={choice.recommended === 'fixe' && choice.allowed.length > 1} onPick={setKind}
                  title={choice.labels.fixe} ill="fixed" illBg="bg-soft"
                  pill="Sans compte"
                  text="Le contenu est gravé dans le QR, pour toujours."
                  pros={['Gratuit, immédiat']}
                  cons={['Pour changer, il faut réimprimer', 'On ne sait pas combien de personnes scannent']}
                />
                <KindCard
                  kind="modifiable" selected={effectiveKind === 'modifiable'} allowed={choice.allowed.includes('modifiable')}
                  recommended={choice.recommended === 'modifiable' && choice.allowed.length > 1} onPick={setKind}
                  title={choice.labels.modifiable} ill="modifiable" illBg="bg-sky"
                  pill="Compte gratuit"
                  text={<>Il passe par votre adresse courte <span className="font-mono">link.cg/…</span>. Vous changez la destination quand vous voulez.</>}
                  pros={[
                    'Nouvelle destination ? Même QR, rien à réimprimer',
                    'Un lien court avec, à partager sur WhatsApp',
                    'Nombre de visites chaque jour',
                    `${PLANS.free.maxLinks} liens courts offerts`,
                  ]}
                  cons={[]}
                />
              </div>
              {choice.note && (
                <div className="tip blue mt-4">
                  <span className="tip-ico"><SparklesIcon aria-hidden="true" /></span>
                  <div>{choice.note}</div>
                </div>
              )}
              <p className="mt-4 rounded-[14px] bg-soft px-3.5 py-3 text-[13px] text-muted"><b className="text-ink">Exemple :</b> {choice.example}</p>
              <Actions onBack={() => go(1)} onNext={() => go(3)} />
            </section>
          )}

          {step === 3 && choice && cta && effectiveKind && (
            <section className="grid items-center gap-6 min-[860px]:grid-cols-2 min-[860px]:gap-12">
              <div>
                <span className="eyebrow">Étape 3 sur 3</span>
                <h1 ref={heading} tabIndex={-1} className="h1 mt-2 outline-none">{cta.ready}</h1>
                <p className="lead mt-3">
                  {cta.lead}{' '}
                  {effectiveKind === 'modifiable'
                    ? 'Le compte gratuit vous sera proposé au moment d’enregistrer, pas avant.'
                    : 'Sans compte : il se télécharge tout de suite.'}
                </p>
                <div className="tip mint mt-6">
                  <span className="tip-ico"><SparklesIcon aria-hidden="true" /></span>
                  <div><strong>{choice.tip.title}</strong>{choice.tip.text}</div>
                </div>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link className="btn btn-cta btn-lg" href={cta.href}>{cta.label} <ArrowRightIcon aria-hidden="true" /></Link>
                  <button type="button" className="btn btn-ghost" onClick={() => go(1)}>Changer mes réponses</button>
                </div>
              </div>
              <Illustration name={choice.ill} className={`order-first rounded-[36px] p-[18px] shadow-[var(--shadow)] min-[860px]:order-none ${choice.bg}`} />
            </section>
          )}

          {step >= 2 && !choice && (
            <section>
              <h1 ref={heading} tabIndex={-1} className="h1 outline-none">Choisissez d&apos;abord ce que vous voulez partager.</h1>
              <button type="button" className="btn btn-cta mt-6" onClick={() => go(1)}>Revenir au choix</button>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

function Actions({ onBack, onNext, nextDisabled, hint }: {
  onBack: () => void; onNext: () => void; nextDisabled?: boolean; hint?: string
}) {
  return (
    <div className="mt-9 flex flex-wrap items-center gap-3">
      <button type="button" className="btn btn-ghost" onClick={onBack}><ArrowLeftIcon aria-hidden="true" />Retour</button>
      {hint && <span className="ml-auto text-sm text-muted" id="next-hint">{hint}</span>}
      <button type="button" className={`btn btn-cta btn-lg ${hint ? '' : 'ml-auto'}`} onClick={onNext} disabled={nextDisabled}
        aria-describedby={hint ? 'next-hint' : undefined}>
        Continuer <ArrowRightIcon aria-hidden="true" />
      </button>
    </div>
  )
}

function KindCard({ kind, selected, allowed, recommended, onPick, title, ill, illBg, pill, text, pros, cons }: {
  kind: Kind; selected: boolean; allowed: boolean; recommended: boolean; onPick: (k: Kind) => void
  title: string; ill: 'fixed' | 'modifiable'; illBg: string; pill: string; text: ReactNode; pros: string[]; cons: string[]
}) {
  return (
    <button type="button" className={`choice card !gap-0 overflow-hidden !p-0 ${allowed ? '' : 'cursor-not-allowed opacity-55 hover:!translate-y-0'}`}
      aria-pressed={selected} disabled={!allowed} onClick={() => onPick(kind)}>
      <Illustration name={ill} height={150} className={`w-full ${illBg}`} />
      <span className="block px-6 pb-[26px] pt-[22px]">
        <span className="flex flex-wrap gap-1.5">
          <span className={`pill ${kind === 'fixe' ? 'pill-soft' : 'pill-brand'}`}>{pill}</span>
          {recommended && <span className="pill pill-ok">Recommandé ici</span>}
          {!allowed && <span className="pill pill-soft">Pas possible ici</span>}
        </span>
        <span className="h2 mt-3 block">{title}</span>
        <span className="mt-2 block text-muted">{text}</span>
        <span className="mt-3.5 grid gap-2 text-sm">
          {pros.map((p) => (
            <span key={p} className="flex items-start gap-2"><CheckIcon className="mt-[3px] h-4 w-4 shrink-0 text-ok" strokeWidth={2.5} aria-hidden="true" />{p}</span>
          ))}
          {cons.map((c) => (
            <span key={c} className="flex items-start gap-2"><XMarkIcon className="mt-[3px] h-4 w-4 shrink-0 text-subtle" strokeWidth={2.5} aria-hidden="true" /><span className="sr-only">Limite : </span>{c}</span>
          ))}
        </span>
      </span>
    </button>
  )
}
