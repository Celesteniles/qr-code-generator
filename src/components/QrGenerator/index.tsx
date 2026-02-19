'use client'

import { useEffect, useRef, useState } from 'react'
import {
  PREVIEW_SIZE, PRESET_CONFIGS,
  type Lang, type DotType, type CornerSquareType, type CornerDotType, type GradientType, type QrConfig,
} from './config'
import { T } from './translations'
import { Card, SectionLabel, OptionBtn, IconDownload, IconQr } from './atoms'
import { ColorsCard } from './ColorsCard'
import { ImageCard } from './ImageCard'
import { ContentCard } from './ContentCard'

export default function QrGenerator() {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [lang, setLang] = useState<Lang>('fr')

  // QR content
  const [text, setText] = useState('')
  const [exportSize, setExportSize] = useState(512)

  // Solid colors
  const [dotColor, setDotColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')

  // Gradient
  const [useGradient, setUseGradient] = useState(false)
  const [gradientColor2, setGradientColor2] = useState('#3b82f6')
  const [gradientType, setGradientType] = useState<GradientType>('linear')
  const [gradientAngle, setGradientAngle] = useState(0)

  // Logo / image
  const [logoUrl, setLogoUrl] = useState('')
  const [logoSize, setLogoSize] = useState(0.3)
  const [hideBackDots, setHideBackDots] = useState(true)

  // Shape
  const [dotType, setDotType] = useState<DotType>('rounded')
  const [cornerSquareType, setCornerSquareType] = useState<CornerSquareType>('extra-rounded')
  const [cornerDotType, setCornerDotType] = useState<CornerDotType>('dot')

  const t = T[lang]

  // Sync html[lang] + document title
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t.title
  }, [lang, t.title])

  // Derived labels
  const dotTypes = [
    { value: 'square' as DotType,         label: t.dotSquare },
    { value: 'rounded' as DotType,        label: t.dotRounded },
    { value: 'dots' as DotType,           label: t.dotDots },
    { value: 'classy' as DotType,         label: t.dotClassy },
    { value: 'classy-rounded' as DotType, label: t.dotClassyPlus },
    { value: 'extra-rounded' as DotType,  label: t.dotExtraRounded },
  ]
  const cornerSquareTypes = [
    { value: 'square' as CornerSquareType,        label: t.cornerSquare },
    { value: 'extra-rounded' as CornerSquareType, label: t.cornerRounded },
    { value: 'dot' as CornerSquareType,           label: t.cornerDot },
  ]
  const cornerDotTypes = [
    { value: 'square' as CornerDotType, label: t.cornerSquare },
    { value: 'dot' as CornerDotType,    label: t.cornerDot },
  ]
  const presets = [
    { label: t.presetClassic, config: PRESET_CONFIGS[0] },
    { label: t.presetRounded, config: PRESET_CONFIGS[1] },
    { label: t.presetBlue,    config: PRESET_CONFIGS[2] },
    { label: t.presetDark,    config: PRESET_CONFIGS[3] },
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

  // Initialize QR on mount
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

  // Update QR on option change
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

            <ContentCard t={t} lang={lang} onChange={setText} />

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

            <ImageCard
              t={t}
              logoUrl={logoUrl} setLogoUrl={setLogoUrl}
              logoSize={logoSize} setLogoSize={setLogoSize}
              hideBackDots={hideBackDots} setHideBackDots={setHideBackDots}
            />

            <ColorsCard
              t={t}
              useGradient={useGradient} setUseGradient={setUseGradient}
              dotColor={dotColor} setDotColor={setDotColor}
              bgColor={bgColor} setBgColor={setBgColor}
              gradientColor2={gradientColor2} setGradientColor2={setGradientColor2}
              gradientType={gradientType} setGradientType={setGradientType}
              gradientAngle={gradientAngle} setGradientAngle={setGradientAngle}
            />

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
