import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Générateur de QR Code gratuit — qr.nscreative.cg'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* ── Colonne gauche : contenu ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          flex: 1,
          background: '#fafafa',
        }}>
          {/* Badge URL */}
          <div style={{ display: 'flex' }}>
            <div style={{
              background: '#eff6ff',
              border: '1.5px solid #bfdbfe',
              color: '#1d4ed8',
              fontSize: 20,
              fontWeight: 700,
              padding: '6px 20px',
              borderRadius: 100,
              letterSpacing: '0.2px',
            }}>
              qr.nscreative.cg
            </div>
          </div>

          {/* Titre + sous-titre */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
              fontSize: 76,
              fontWeight: 800,
              color: '#18181b',
              letterSpacing: '-3px',
              lineHeight: 1.0,
            }}>
              Générateur de QR Code
            </div>
            <div style={{
              fontSize: 30,
              color: '#71717a',
              letterSpacing: '0.2px',
            }}>
              Gratuit · Instantané · Sans inscription
            </div>
          </div>

          {/* Pills fonctionnalités + branding */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {['Couleurs & Dégradés', 'Logo intégré', 'Wi-Fi · vCard · Email', 'PNG / SVG'].map((label) => (
                <div key={label} style={{
                  padding: '7px 18px',
                  background: 'white',
                  border: '1.5px solid #e4e4e7',
                  borderRadius: 100,
                  fontSize: 17,
                  color: '#52525b',
                  fontWeight: 600,
                }}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 17, color: '#a1a1aa' }}>
              Un outil par nscreative.cg
            </div>
          </div>
        </div>

        {/* ── Colonne droite : icône ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: 340,
          background: '#3b82f6',
          gap: 20,
        }}>
          {/* Icône QR code */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 160,
            height: 160,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 36,
          }}>
            <svg width="96" height="96" viewBox="0 0 20 20" fill="white">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
              <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" />
            </svg>
          </div>
          <div style={{ fontSize: 17, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
            Free QR Generator
          </div>
        </div>

      </div>
    ),
    { ...size }
  )
}
