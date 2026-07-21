'use client'

import { useRef } from 'react'
import type { Translations } from './translations'
import { Card, SectionLabel } from './atoms'

interface Props {
  t: Translations
  logoUrl: string
  setLogoUrl: (v: string) => void
  logoSize: number
  setLogoSize: (v: number) => void
  hideBackDots: boolean
  setHideBackDots: (v: boolean) => void
}

export function ImageCard({ t, logoUrl, setLogoUrl, logoSize, setLogoSize, hideBackDots, setHideBackDots }: Props) {
  const logoInputRef = useRef<HTMLInputElement>(null)

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

  return (
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
  )
}
