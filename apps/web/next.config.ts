import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Politique de sécurité du contenu. Pas de nonces (difficiles à propager avec
// OpenNext) : les exceptions ci-dessous sont le minimum pour que l'app fonctionne.
const csp = [
  "default-src 'self'",
  // 'unsafe-inline' : script du thème (layout.tsx) et scripts inline injectés par
  // Next.js (hydratation, RSC). Turnstile charge son script depuis Cloudflare.
  // 'unsafe-eval' uniquement en développement (requis par React en mode dev).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  // Attributs style de React, SVG inline des illustrations et du QR.
  "style-src 'self' 'unsafe-inline'",
  // QR et logos en data:/blob: (qr-code-styling, canvas). Les logos sont réduits
  // côté client en data: URL ; aucune image distante n'est affichée.
  "img-src 'self' data: blob:",
  // next/font auto-héberge les polices Google au build : pas d'appel à Google.
  "font-src 'self' data:",
  // qr-code-styling relit le logo (data: URL) par XMLHttpRequest avant de
  // l'intégrer au QR ; sans data: ici, le rendu du QR reste bloqué.
  "connect-src 'self' data: blob:",
  // Iframe du défi Turnstile.
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Deux ans, sous-domaines inclus. Pas de preload : engagement difficile à retirer.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Doublon de frame-ancestors pour les navigateurs qui ignorent la CSP.
  { key: "X-Frame-Options", value: "DENY" },
  // Aucune de ces fonctionnalités n'est utilisée. Presse-papiers (écriture) et
  // partage natif (navigator.share) restent autorisés : ils servent au partage des liens.
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // Ne pas annoncer le framework dans les réponses.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Pages déjà visitées : réaffichées depuis le cache du navigateur pendant 60 s
  // (retour arrière, aller-retour entre écrans) au lieu d'être rechargées. Toute
  // action serveur (revalidatePath) et la connexion/déconnexion vident ce cache,
  // donc on ne montre jamais un état périmé après une modification.
  experimental: {
    staleTimes: { dynamic: 60, static: 300 },
  },
  // Anciennes adresses (avant la refonte D) : liens partagés et favoris continuent
  // de fonctionner. Permanentes, car les nouvelles routes sont définitives.
  async redirects() {
    return [
      // www.qrcode.cg → qrcode.cg : dans custom-worker.ts.
      { source: '/dashboard',destination: '/liens', permanent: true },
      { source: '/dashboard/card/:slug', destination: '/carte/:slug', permanent: true },
      { source: '/pricing', destination: '/offres', permanent: true },
      { source: '/login', destination: '/connexion', permanent: true },
      { source: '/signup', destination: '/connexion?mode=inscription', permanent: true },
    ];
  },
};

export default nextConfig;

// Rend les bindings Cloudflare (D1, KV) disponibles pendant `next dev`.
// Sans effet sur le build de production.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
