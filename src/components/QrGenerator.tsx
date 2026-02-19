'use client'

import { useEffect, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Lang = 'fr' | 'en'
type DotType = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded'
type CornerSquareType = 'square' | 'extra-rounded' | 'dot'
type CornerDotType = 'square' | 'dot'
type GradientType = 'linear' | 'radial'

interface QrConfig {
  dotColor: string
  bgColor: string
  dotType: DotType
  cornerSquareType: CornerSquareType
  cornerDotType: CornerDotType
}

// ── Translations ──────────────────────────────────────────────────────────────

const T = {
  fr: {
    title: 'Générateur de QR Code',
    subtitle: 'Gratuit · Instantané · Sans inscription',
    urlOrText: 'URL ou texte',
    placeholder: 'https://exemple.com',
    copyTitle: 'Copier le texte',
    copiedTitle: 'Copié !',
    presets: 'Styles prédéfinis',
    colors: 'Couleurs',
    solid: 'Unie',
    gradient: 'Dégradé',
    foreground: 'Premier plan',
    background: 'Arrière-plan',
    color1: 'Couleur 1',
    color2: 'Couleur 2',
    gradientDir: 'Direction',
    swapTitle: 'Inverser les couleurs',
    fgColorAria: 'Couleur du premier plan',
    bgColorAria: "Couleur de l'arrière-plan",
    fgHexAria: 'Valeur hexadécimale du premier plan',
    bgHexAria: "Valeur hexadécimale de l'arrière-plan",
    color1Aria: 'Première couleur du dégradé',
    color2Aria: 'Deuxième couleur du dégradé',
    color1HexAria: 'Valeur hexadécimale de la couleur 1',
    color2HexAria: 'Valeur hexadécimale de la couleur 2',
    dotStyle: 'Style des points',
    cornerFrame: 'Cadre des coins',
    cornerCenter: 'Centre des coins',
    exportSize: "Taille d'export",
    exportSizeAria: "Taille d'export en pixels",
    previewInfo: (p: number, e: number) => `Aperçu à ${p} px · Export à ${e} px`,
    footer: 'Aucune donnée stockée · Sans inscription · 100% gratuit',
    dotSquare: 'Carré', dotRounded: 'Arrondi', dotDots: 'Points',
    dotClassy: 'Élégant', dotClassyPlus: 'Élégant +', dotExtraRounded: 'Très arrondi',
    cornerSquare: 'Carré', cornerRounded: 'Arrondi', cornerDot: 'Point',
    presetClassic: 'Classique', presetRounded: 'Arrondi', presetBlue: 'Bleu', presetDark: 'Sombre',
    imageLogo: 'Image / Logo',
    addImage: 'Ajouter une image',
    removeImage: 'Supprimer',
    imageSize: "Taille de l'image",
    imageSizeAria: "Taille de l'image dans le QR",
    hideBackDots: 'Masquer les points sous l\'image',
  },
  en: {
    title: 'QR Code Generator',
    subtitle: 'Free · Instant · No sign-up',
    urlOrText: 'URL or text',
    placeholder: 'https://example.com',
    copyTitle: 'Copy text',
    copiedTitle: 'Copied!',
    presets: 'Presets',
    colors: 'Colors',
    solid: 'Solid',
    gradient: 'Gradient',
    foreground: 'Foreground',
    background: 'Background',
    color1: 'Color 1',
    color2: 'Color 2',
    gradientDir: 'Direction',
    swapTitle: 'Swap colors',
    fgColorAria: 'Foreground color',
    bgColorAria: 'Background color',
    fgHexAria: 'Foreground hex value',
    bgHexAria: 'Background hex value',
    color1Aria: 'First gradient color',
    color2Aria: 'Second gradient color',
    color1HexAria: 'Color 1 hex value',
    color2HexAria: 'Color 2 hex value',
    dotStyle: 'Dot style',
    cornerFrame: 'Corner frame',
    cornerCenter: 'Corner center',
    exportSize: 'Export size',
    exportSizeAria: 'Export size in pixels',
    previewInfo: (p: number, e: number) => `Preview at ${p} px · Export at ${e} px`,
    footer: 'No data stored · No sign-up · 100% free',
    dotSquare: 'Square', dotRounded: 'Rounded', dotDots: 'Dots',
    dotClassy: 'Classy', dotClassyPlus: 'Classy +', dotExtraRounded: 'Extra round',
    cornerSquare: 'Square', cornerRounded: 'Rounded', cornerDot: 'Dot',
    presetClassic: 'Classic', presetRounded: 'Rounded', presetBlue: 'Blue', presetDark: 'Dark',
    imageLogo: 'Image / Logo',
    addImage: 'Add an image',
    removeImage: 'Remove',
    imageSize: 'Image size',
    imageSizeAria: 'Image size in QR',
    hideBackDots: 'Hide dots behind image',
  },
} as const

// ── Static config ─────────────────────────────────────────────────────────────

const PRESET_CONFIGS: QrConfig[] = [
  { dotColor: '#000000', bgColor: '#ffffff', dotType: 'square', cornerSquareType: 'square', cornerDotType: 'square' },
  { dotColor: '#18181b', bgColor: '#fafafa', dotType: 'rounded', cornerSquareType: 'extra-rounded', cornerDotType: 'dot' },
  { dotColor: '#1d4ed8', bgColor: '#eff6ff', dotType: 'extra-rounded', cornerSquareType: 'extra-rounded', cornerDotType: 'dot' },
  { dotColor: '#e2e8f0', bgColor: '#0f172a', dotType: 'dots', cornerSquareType: 'dot', cornerDotType: 'dot' },
]

const GRAD_DIRS: { label: string; angle: number; type: GradientType }[] = [
  { label: '→', angle: 0,   type: 'linear' },
  { label: '↓', angle: 90,  type: 'linear' },
  { label: '↘', angle: 45,  type: 'linear' },
  { label: '↙', angle: 135, type: 'linear' },
  { label: '◯', angle: 0,   type: 'radial' },
]

const PREVIEW_SIZE = 280

// ── Atoms ─────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
      {children}
    </p>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 ${className}`}>
      {children}
    </div>
  )
}

function OptionBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
        active
          ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
          : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-blue-400 dark:hover:border-blue-600 hover:text-zinc-900 dark:hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  )
}

function HexInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [local, setLocal] = useState(value)
  useEffect(() => { setLocal(value) }, [value])
  return (
    <input
      type="text"
      aria-label={label}
      value={local}
      onChange={(e) => {
        const v = e.target.value
        setLocal(v)
        if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v)
      }}
      onBlur={() => { if (!/^#[0-9a-fA-F]{6}$/.test(local)) setLocal(value) }}
      maxLength={7}
      spellCheck={false}
      className="w-[5.5rem] text-xs font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
    />
  )
}

function ColorSwatch({
  color, onChange, ariaLabel,
}: { color: string; onChange: (v: string) => void; ariaLabel: string }) {
  return (
    <div className="relative w-9 h-9 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden shrink-0">
      <div className="absolute inset-0" style={{ backgroundColor: color }} />
      <input
        type="color"
        aria-label={ariaLabel}
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
      />
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconDownload() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

function IconSwap() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
    </svg>
  )
}

function IconCopy({ done }: { done: boolean }) {
  if (done) {
    return (
      <svg className="w-4 h-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
      <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
    </svg>
  )
}

function IconQr() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
      <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" />
    </svg>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function QrGenerator() {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrRef = useRef<any>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const [lang, setLang] = useState<Lang>('fr')

  // QR content
  const [text, setText] = useState('https://example.com')
  const [exportSize, setExportSize] = useState(512)

  // Solid colors
  const [dotColor, setDotColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')

  // Gradient
  const [useGradient, setUseGradient] = useState(false)
  const [gradientColor2, setGradientColor2] = useState('#3b82f6')
  const [gradientType, setGradientType] = useState<GradientType>('linear')
  const [gradientAngle, setGradientAngle] = useState(0) // degrees

  // Logo / image
  const [logoUrl, setLogoUrl] = useState('')
  const [logoSize, setLogoSize] = useState(0.3)
  const [hideBackDots, setHideBackDots] = useState(true)

  // Shape
  const [dotType, setDotType] = useState<DotType>('rounded')
  const [cornerSquareType, setCornerSquareType] = useState<CornerSquareType>('extra-rounded')
  const [cornerDotType, setCornerDotType] = useState<CornerDotType>('dot')

  const t = T[lang]

  // Sync html[lang]
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t.title
  }, [lang, t.title])

  // Derived labels
  const dotTypes = [
    { value: 'square' as DotType, label: t.dotSquare },
    { value: 'rounded' as DotType, label: t.dotRounded },
    { value: 'dots' as DotType, label: t.dotDots },
    { value: 'classy' as DotType, label: t.dotClassy },
    { value: 'classy-rounded' as DotType, label: t.dotClassyPlus },
    { value: 'extra-rounded' as DotType, label: t.dotExtraRounded },
  ]
  const cornerSquareTypes = [
    { value: 'square' as CornerSquareType, label: t.cornerSquare },
    { value: 'extra-rounded' as CornerSquareType, label: t.cornerRounded },
    { value: 'dot' as CornerSquareType, label: t.cornerDot },
  ]
  const cornerDotTypes = [
    { value: 'square' as CornerDotType, label: t.cornerSquare },
    { value: 'dot' as CornerDotType, label: t.cornerDot },
  ]
  const presets = [
    { label: t.presetClassic, config: PRESET_CONFIGS[0] },
    { label: t.presetRounded, config: PRESET_CONFIGS[1] },
    { label: t.presetBlue, config: PRESET_CONFIGS[2] },
    { label: t.presetDark, config: PRESET_CONFIGS[3] },
  ]

  // Build gradient spread (applies to dots + corners)
  const buildGrad = () => ({
    gradient: useGradient ? {
      type: gradientType,
      rotation: (gradientAngle * Math.PI) / 180,
      colorStops: [
        { offset: 0, color: dotColor },
        { offset: 1, color: gradientColor2 },
      ],
    } : undefined,
  })

  const applyPreset = (cfg: QrConfig) => {
    setDotColor(cfg.dotColor)
    setBgColor(cfg.bgColor)
    setDotType(cfg.dotType)
    setCornerSquareType(cfg.cornerSquareType)
    setCornerDotType(cfg.cornerDotType)
    setUseGradient(false)
  }

  const copyText = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result
      if (typeof result === 'string') setLogoUrl(result)
    }
    reader.readAsDataURL(file)
  }

  const removeLogo = () => {
    setLogoUrl('')
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  // Initialize on mount
  useEffect(() => {
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      qrRef.current = new QRCodeStyling({
        width: PREVIEW_SIZE, height: PREVIEW_SIZE,
        data: 'https://example.com', margin: 12,
        qrOptions: { errorCorrectionLevel: 'H' },
        dotsOptions: { color: '#000000', type: 'rounded' },
        backgroundOptions: { color: '#ffffff' },
        cornersSquareOptions: { type: 'extra-rounded', color: '#000000' },
        cornersDotOptions: { type: 'dot', color: '#000000' },
      })
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
        qrRef.current.append(containerRef.current)
      }
      setReady(true)
    })
  }, [])

  // Update on option change
  useEffect(() => {
    if (!ready) return
    const grad = buildGrad()
    qrRef.current?.update({
      width: PREVIEW_SIZE, height: PREVIEW_SIZE,
      data: text.trim() || 'https://example.com', margin: 12,
      qrOptions: { errorCorrectionLevel: 'H' },
      image: logoUrl || undefined,
      imageOptions: { crossOrigin: 'anonymous', margin: 4, imageSize: logoSize, hideBackgroundDots: hideBackDots },
      dotsOptions: { color: dotColor, type: dotType, ...grad },
      backgroundOptions: { color: bgColor },
      cornersSquareOptions: { type: cornerSquareType, color: dotColor, ...grad },
      cornersDotOptions: { type: cornerDotType, color: dotColor, ...grad },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, text, dotColor, bgColor, dotType, cornerSquareType, cornerDotType,
      useGradient, gradientColor2, gradientType, gradientAngle,
      logoUrl, logoSize, hideBackDots])

  const download = async (ext: 'png' | 'svg') => {
    const { default: QRCodeStyling } = await import('qr-code-styling')
    const grad = buildGrad()
    const qr = new QRCodeStyling({
      width: exportSize, height: exportSize,
      data: text.trim() || 'https://example.com', margin: 16,
      qrOptions: { errorCorrectionLevel: 'H' },
      image: logoUrl || undefined,
      imageOptions: { crossOrigin: 'anonymous', margin: 4, imageSize: logoSize, hideBackgroundDots: hideBackDots },
      dotsOptions: { color: dotColor, type: dotType, ...grad },
      backgroundOptions: { color: bgColor },
      cornersSquareOptions: { type: cornerSquareType, color: dotColor, ...grad },
      cornersDotOptions: { type: cornerDotType, color: dotColor, ...grad },
    })
    qr.download({ extension: ext, name: 'qrcode' })
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
            <IconQr />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{t.title}</span>
            <span className="hidden sm:inline text-xs text-zinc-400 dark:text-zinc-500 ml-2">· {t.subtitle}</span>
          </div>
          <div className="ml-auto flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 shrink-0">
            {(['fr', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                  lang === l
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`}
              >
                {l === 'fr' ? 'FR' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-start">

          {/* ── Controls ── */}
          <div className="space-y-3 order-2 lg:order-1">

            {/* URL / Text */}
            <Card>
              <SectionLabel>{t.urlOrText}</SectionLabel>
              <div className="relative">
                <textarea
                  id="qr-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder={t.placeholder}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2.5 pr-11 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
                />
                <button
                  type="button"
                  onClick={copyText}
                  title={copied ? t.copiedTitle : t.copyTitle}
                  className="absolute top-2.5 right-2.5 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <IconCopy done={copied} />
                </button>
              </div>
            </Card>

            {/* Presets */}
            <Card>
              <SectionLabel>{t.presets}</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    type="button"
                    key={p.label}
                    onClick={() => applyPreset(p.config)}
                    style={{ backgroundColor: p.config.bgColor, color: p.config.dotColor }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-700 hover:scale-105 active:scale-95 transition-transform shadow-sm"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </Card>

            {/* Image / Logo */}
            <Card>
              <SectionLabel>{t.imageLogo}</SectionLabel>
              {!logoUrl ? (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-500 transition-colors"
                >
                  <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium">{t.addImage}</span>
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Thumbnail + remove */}
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="" className="w-12 h-12 rounded-lg object-contain border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{t.imageLogo}</p>
                    </div>
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      {t.removeImage}
                    </button>
                  </div>
                  {/* Size slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">{t.imageSize}</span>
                      <span className="text-xs text-zinc-500 font-mono tabular-nums">{Math.round(logoSize * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      aria-label={t.imageSizeAria}
                      min={0.1}
                      max={0.5}
                      step={0.05}
                      value={logoSize}
                      onChange={(e) => setLogoSize(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  {/* Hide dots toggle */}
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideBackDots}
                      onChange={(e) => setHideBackDots(e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-500"
                    />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">{t.hideBackDots}</span>
                  </label>
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                aria-label={t.imageLogo}
                onChange={handleLogoUpload}
                className="hidden"
              />
            </Card>

            {/* Colors */}
            <Card>
              {/* Mode toggle */}
              <div className="flex items-center justify-between mb-4">
                <SectionLabel>{t.colors}</SectionLabel>
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 -mt-3">
                  <button
                    type="button"
                    onClick={() => setUseGradient(false)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      !useGradient
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                    }`}
                  >
                    {t.solid}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseGradient(true)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      useGradient
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                    }`}
                  >
                    {t.gradient}
                  </button>
                </div>
              </div>

              {!useGradient ? (
                /* ── Solid mode ── */
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ColorSwatch color={dotColor} onChange={setDotColor} ariaLabel={t.fgColorAria} />
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">{t.foreground}</span>
                      <HexInput value={dotColor} onChange={setDotColor} label={t.fgHexAria} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDotColor(bgColor); setBgColor(dotColor) }}
                    title={t.swapTitle}
                    className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition-colors"
                  >
                    <IconSwap />
                  </button>
                  <div className="flex items-center gap-2">
                    <ColorSwatch color={bgColor} onChange={setBgColor} ariaLabel={t.bgColorAria} />
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">{t.background}</span>
                      <HexInput value={bgColor} onChange={setBgColor} label={t.bgHexAria} />
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Gradient mode ── */
                <div className="space-y-4">
                  {/* Color stops */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <ColorSwatch color={dotColor} onChange={setDotColor} ariaLabel={t.color1Aria} />
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">{t.color1}</span>
                        <HexInput value={dotColor} onChange={setDotColor} label={t.color1HexAria} />
                      </div>
                    </div>
                    {/* Gradient preview strip */}
                    <div
                      className="flex-1 h-6 rounded-lg min-w-16"
                      style={{
                        background: gradientType === 'radial'
                          ? `radial-gradient(circle, ${dotColor}, ${gradientColor2})`
                          : `linear-gradient(${gradientAngle}deg, ${dotColor}, ${gradientColor2})`,
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <ColorSwatch color={gradientColor2} onChange={setGradientColor2} ariaLabel={t.color2Aria} />
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">{t.color2}</span>
                        <HexInput value={gradientColor2} onChange={setGradientColor2} label={t.color2HexAria} />
                      </div>
                    </div>
                  </div>

                  {/* Direction */}
                  <div>
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-2">{t.gradientDir}</span>
                    <div className="flex gap-2 flex-wrap">
                      {GRAD_DIRS.map((dir) => {
                        const isActive = dir.type === gradientType && (dir.type === 'radial' || gradientAngle === dir.angle)
                        return (
                          <OptionBtn
                            key={`${dir.type}-${dir.angle}`}
                            active={isActive}
                            onClick={() => {
                              setGradientType(dir.type)
                              if (dir.type === 'linear') setGradientAngle(dir.angle)
                            }}
                          >
                            {dir.label}
                          </OptionBtn>
                        )
                      })}
                    </div>
                  </div>

                  {/* Background (always solid) */}
                  <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <ColorSwatch color={bgColor} onChange={setBgColor} ariaLabel={t.bgColorAria} />
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">{t.background}</span>
                      <HexInput value={bgColor} onChange={setBgColor} label={t.bgHexAria} />
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Dot style */}
            <Card>
              <SectionLabel>{t.dotStyle}</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {dotTypes.map((dt) => (
                  <OptionBtn key={dt.value} active={dotType === dt.value} onClick={() => setDotType(dt.value)}>
                    {dt.label}
                  </OptionBtn>
                ))}
              </div>
            </Card>

            {/* Corners */}
            <Card>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <SectionLabel>{t.cornerFrame}</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {cornerSquareTypes.map((ct) => (
                      <OptionBtn key={ct.value} active={cornerSquareType === ct.value} onClick={() => setCornerSquareType(ct.value)}>
                        {ct.label}
                      </OptionBtn>
                    ))}
                  </div>
                </div>
                <div>
                  <SectionLabel>{t.cornerCenter}</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {cornerDotTypes.map((ct) => (
                      <OptionBtn key={ct.value} active={cornerDotType === ct.value} onClick={() => setCornerDotType(ct.value)}>
                        {ct.label}
                      </OptionBtn>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Export size */}
            <Card>
              <div className="flex justify-between items-center mb-3">
                <SectionLabel>{t.exportSize}</SectionLabel>
                <span className="text-xs text-zinc-500 font-mono tabular-nums -mt-3">
                  {exportSize} × {exportSize} px
                </span>
              </div>
              <input
                type="range"
                aria-label={t.exportSizeAria}
                min={256}
                max={1024}
                step={64}
                value={exportSize}
                onChange={(e) => setExportSize(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-zinc-400 mt-1.5">
                <span>256 px</span>
                <span>1024 px</span>
              </div>
            </Card>
          </div>

          {/* ── Preview + Download ── */}
          <div className="flex flex-col items-center gap-3 order-1 lg:order-2 lg:sticky lg:top-20 w-full lg:w-auto">
            <Card className="w-full flex justify-center">
              {!ready && <div className="w-70 h-70 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />}
              <div ref={containerRef} className="leading-none" />
            </Card>

            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => download('png')}
                disabled={!ready}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors shadow-sm"
              >
                <IconDownload />PNG
              </button>
              <button
                type="button"
                onClick={() => download('svg')}
                disabled={!ready}
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors shadow-sm"
              >
                <IconDownload />SVG
              </button>
            </div>

            <p className="text-xs text-zinc-400 text-center">
              {t.previewInfo(PREVIEW_SIZE, exportSize)}
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-zinc-400 dark:text-zinc-600">
        {t.footer}
      </footer>
    </div>
  )
}
