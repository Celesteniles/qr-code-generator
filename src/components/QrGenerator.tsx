'use client'

import { useEffect, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Lang = 'fr' | 'en'
type DotType = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded'
type CornerSquareType = 'square' | 'extra-rounded' | 'dot'
type CornerDotType = 'square' | 'dot'

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
    foreground: 'Premier plan',
    background: 'Arrière-plan',
    swapTitle: 'Inverser les couleurs',
    fgColorAria: 'Couleur du premier plan',
    bgColorAria: "Couleur de l'arrière-plan",
    fgHexAria: 'Valeur hexadécimale du premier plan',
    bgHexAria: "Valeur hexadécimale de l'arrière-plan",
    dotStyle: 'Style des points',
    cornerFrame: 'Cadre des coins',
    cornerCenter: 'Centre des coins',
    exportSize: "Taille d'export",
    exportSizeAria: "Taille d'export en pixels",
    previewInfo: (p: number, e: number) => `Aperçu à ${p} px · Export à ${e} px`,
    footer: 'Aucune donnée stockée · Sans inscription · 100% gratuit',
    // dot types
    dotSquare: 'Carré',
    dotRounded: 'Arrondi',
    dotDots: 'Points',
    dotClassy: 'Élégant',
    dotClassyPlus: 'Élégant +',
    dotExtraRounded: 'Très arrondi',
    // corner types
    cornerSquare: 'Carré',
    cornerRounded: 'Arrondi',
    cornerDot: 'Point',
    // preset names
    presetClassic: 'Classique',
    presetRounded: 'Arrondi',
    presetBlue: 'Bleu',
    presetDark: 'Sombre',
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
    foreground: 'Foreground',
    background: 'Background',
    swapTitle: 'Swap colors',
    fgColorAria: 'Foreground color',
    bgColorAria: 'Background color',
    fgHexAria: 'Foreground hex value',
    bgHexAria: 'Background hex value',
    dotStyle: 'Dot style',
    cornerFrame: 'Corner frame',
    cornerCenter: 'Corner center',
    exportSize: 'Export size',
    exportSizeAria: 'Export size in pixels',
    previewInfo: (p: number, e: number) => `Preview at ${p} px · Export at ${e} px`,
    footer: 'No data stored · No sign-up · 100% free',
    // dot types
    dotSquare: 'Square',
    dotRounded: 'Rounded',
    dotDots: 'Dots',
    dotClassy: 'Classy',
    dotClassyPlus: 'Classy +',
    dotExtraRounded: 'Extra round',
    // corner types
    cornerSquare: 'Square',
    cornerRounded: 'Rounded',
    cornerDot: 'Dot',
    // preset names
    presetClassic: 'Classic',
    presetRounded: 'Rounded',
    presetBlue: 'Blue',
    presetDark: 'Dark',
  },
} as const

// ── Static config (labels derived from translations inside component) ─────────

const PRESET_CONFIGS: QrConfig[] = [
  { dotColor: '#000000', bgColor: '#ffffff', dotType: 'square', cornerSquareType: 'square', cornerDotType: 'square' },
  { dotColor: '#18181b', bgColor: '#fafafa', dotType: 'rounded', cornerSquareType: 'extra-rounded', cornerDotType: 'dot' },
  { dotColor: '#1d4ed8', bgColor: '#eff6ff', dotType: 'extra-rounded', cornerSquareType: 'extra-rounded', cornerDotType: 'dot' },
  { dotColor: '#e2e8f0', bgColor: '#0f172a', dotType: 'dots', cornerSquareType: 'dot', cornerDotType: 'dot' },
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
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const [lang, setLang] = useState<Lang>('fr')

  const [text, setText] = useState('https://example.com')
  const [exportSize, setExportSize] = useState(512)
  const [dotColor, setDotColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [dotType, setDotType] = useState<DotType>('rounded')
  const [cornerSquareType, setCornerSquareType] = useState<CornerSquareType>('extra-rounded')
  const [cornerDotType, setCornerDotType] = useState<CornerDotType>('dot')

  const t = T[lang]

  // Sync html[lang] with current language
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t.title
  }, [lang, t.title])

  // Labels derived from translations
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

  const applyPreset = (cfg: QrConfig) => {
    setDotColor(cfg.dotColor)
    setBgColor(cfg.bgColor)
    setDotType(cfg.dotType)
    setCornerSquareType(cfg.cornerSquareType)
    setCornerDotType(cfg.cornerDotType)
  }

  const copyText = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Initialize on mount
  useEffect(() => {
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      qrRef.current = new QRCodeStyling({
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        data: 'https://example.com',
        margin: 12,
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
    qrRef.current?.update({
      width: PREVIEW_SIZE,
      height: PREVIEW_SIZE,
      data: text.trim() || 'https://example.com',
      margin: 12,
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: { color: dotColor, type: dotType },
      backgroundOptions: { color: bgColor },
      cornersSquareOptions: { type: cornerSquareType, color: dotColor },
      cornersDotOptions: { type: cornerDotType, color: dotColor },
    })
  }, [ready, text, dotColor, bgColor, dotType, cornerSquareType, cornerDotType])

  const download = async (ext: 'png' | 'svg') => {
    const { default: QRCodeStyling } = await import('qr-code-styling')
    const qr = new QRCodeStyling({
      width: exportSize,
      height: exportSize,
      data: text.trim() || 'https://example.com',
      margin: 16,
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: { color: dotColor, type: dotType },
      backgroundOptions: { color: bgColor },
      cornersSquareOptions: { type: cornerSquareType, color: dotColor },
      cornersDotOptions: { type: cornerDotType, color: dotColor },
    })
    qr.download({ extension: ext, name: 'qrcode' })
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo */}
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
            <IconQr />
          </div>
          {/* Title */}
          <div className="min-w-0">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{t.title}</span>
            <span className="hidden sm:inline text-xs text-zinc-400 dark:text-zinc-500 ml-2">· {t.subtitle}</span>
          </div>
          {/* Language toggle */}
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

            {/* Colors */}
            <Card>
              <SectionLabel>{t.colors}</SectionLabel>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Foreground */}
                <div className="flex items-center gap-2">
                  <div className="relative w-9 h-9 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden shrink-0">
                    <div className="absolute inset-0" style={{ backgroundColor: dotColor }} />
                    <input
                      type="color"
                      aria-label={t.fgColorAria}
                      value={dotColor}
                      onChange={(e) => setDotColor(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">{t.foreground}</span>
                    <HexInput value={dotColor} onChange={setDotColor} label={t.fgHexAria} />
                  </div>
                </div>

                {/* Swap */}
                <button
                  type="button"
                  onClick={() => { setDotColor(bgColor); setBgColor(dotColor) }}
                  title={t.swapTitle}
                  className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition-colors"
                >
                  <IconSwap />
                </button>

                {/* Background */}
                <div className="flex items-center gap-2">
                  <div className="relative w-9 h-9 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden shrink-0">
                    <div className="absolute inset-0" style={{ backgroundColor: bgColor }} />
                    <input
                      type="color"
                      aria-label={t.bgColorAria}
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">{t.background}</span>
                    <HexInput value={bgColor} onChange={setBgColor} label={t.bgHexAria} />
                  </div>
                </div>
              </div>
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
              {!ready && (
                <div className="w-70 h-70 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              )}
              <div ref={containerRef} className="leading-none" />
            </Card>

            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => download('png')}
                disabled={!ready}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors shadow-sm"
              >
                <IconDownload />
                PNG
              </button>
              <button
                type="button"
                onClick={() => download('svg')}
                disabled={!ready}
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors shadow-sm"
              >
                <IconDownload />
                SVG
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
