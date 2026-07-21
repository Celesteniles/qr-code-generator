'use client'

import type { GradientType } from './config'
import { GRAD_DIRS } from './config'
import type { Translations } from './translations'
import { Card, SectionLabel, ColorSwatch, HexInput, OptionBtn, IconSwap } from './atoms'

interface Props {
  t: Translations
  useGradient: boolean
  setUseGradient: (v: boolean) => void
  dotColor: string
  setDotColor: (v: string) => void
  bgColor: string
  setBgColor: (v: string) => void
  gradientColor2: string
  setGradientColor2: (v: string) => void
  gradientType: GradientType
  setGradientType: (v: GradientType) => void
  gradientAngle: number
  setGradientAngle: (v: number) => void
}

export function ColorsCard({
  t, useGradient, setUseGradient,
  dotColor, setDotColor, bgColor, setBgColor,
  gradientColor2, setGradientColor2,
  gradientType, setGradientType, gradientAngle, setGradientAngle,
}: Props) {
  return (
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
  )
}
