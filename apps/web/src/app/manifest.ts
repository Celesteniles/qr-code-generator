import type { MetadataRoute } from 'next'

// Manifeste : nom et icônes quand on ajoute link.cg à l'écran d'accueil du téléphone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'link.cg — Liens courts et QR codes',
    short_name: 'link.cg',
    description: 'Raccourcissez vos liens et créez des QR codes à votre image.',
    start_url: '/',
    display: 'standalone',
    background_color: '#efe9df',
    theme_color: '#efe9df',
    lang: 'fr',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
