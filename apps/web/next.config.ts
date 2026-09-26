import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      { source: '/dashboard', destination: '/liens', permanent: true },
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
