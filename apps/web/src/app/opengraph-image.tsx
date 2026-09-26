import { ImageResponse } from 'next/og'
import { LOGO_BLUE, LOGO_DISC, LOGO_STROKE } from '@/components/kit/logo-mark'

// Aperçu de partage (WhatsApp, Facebook…) : symbole link.cg, message de l'accueil.

export const runtime = 'edge'
export const alt = 'link.cg — Liens courts et QR codes, à votre image'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#16161d'
const PAPER = '#efe9df'

function Mark({ px, width }: { px: number; width: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 64 64">
      <circle cx={LOGO_DISC.cx} cy={LOGO_DISC.cy} r={LOGO_DISC.r} fill={LOGO_BLUE} />
      <path d={LOGO_STROKE} fill="none" stroke={LOGO_BLUE} strokeWidth={width + 3} strokeLinecap="round" strokeLinejoin="round" />
      <path d={LOGO_STROKE} fill="none" stroke="#fff" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Bricolage Grotesque (titres de l'app) depuis Google Fonts, en TTF (le moteur de
 * rendu ne lit pas le woff2). En cas d'échec, police par défaut : l'image reste valide.
 */
async function bricolage(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@${weight}`)).text()
    const url = /src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/.exec(css)?.[1]
    return url ? await (await fetch(url)).arrayBuffer() : null
  } catch {
    return null
  }
}

export default async function Image() {
  const [bold, medium] = await Promise.all([bricolage(800), bricolage(500)])
  const fonts = [
    ...(bold ? [{ name: 'Bricolage', data: bold, weight: 800 as const, style: 'normal' as const }] : []),
    ...(medium ? [{ name: 'Bricolage', data: medium, weight: 500 as const, style: 'normal' as const }] : []),
  ]
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: PAPER, color: INK, fontFamily: fonts.length ? 'Bricolage' : 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 0 64px 76px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Mark px={64} width={6.5} />
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, letterSpacing: '-1.5px' }}>
              link<span style={{ color: LOGO_BLUE }}>.cg</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 74, fontWeight: 800, letterSpacing: '-3px', lineHeight: 1.02 }}>
              <span>Partagez tout,</span>
              <span>en un lien ou un QR.</span>
            </div>
            <div style={{ fontSize: 30, fontWeight: 500, color: '#4f4c44', lineHeight: 1.35, maxWidth: 640 }}>
              Liens courts et QR codes à votre image. Gratuit, sans inscription.
            </div>
          </div>

          <div style={{ display: 'flex', fontSize: 22, fontWeight: 500, color: '#6b665b' }}>Par NS Creative · Brazzaville</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 400 }}>
          <Mark px={330} width={6.5} />
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
