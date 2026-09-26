// Symbole link.cg (piste A « Signature ») : le disque bleu de NS Creative et un « l »
// bouclé au pinceau, comme un maillon, qui s'échappe du cercle avec un liseré bleu.
// Géométrie unique (viewBox 64×64), partagée par le composant LogoMark et par les
// fichiers statiques (favicon, icônes d'app) générés par scripts/icons.mjs.

export const LOGO_BLUE = '#0060ff'

export const LOGO_DISC = { cx: 31, cy: 34, r: 25 }

/** Le « l » bouclé : il part dans le disque et en sort en haut à droite. */
export const LOGO_STROKE = 'M15 48 C 24 40, 33 28, 38 17 C 41 10, 35 7, 32 13 C 28 21, 28 36, 34 42 C 39 47, 47 41, 58.5 26.5'

/** Épaisseur du trait : plus épais aux petites tailles (favicon) pour rester lisible. */
export function logoStrokeWidth(px: number): number {
  return px <= 24 ? 8 : px <= 48 ? 7.2 : 6.5
}

/** Le symbole en SVG autonome (fichiers statiques). */
export function logoMarkSvg(px = 64): string {
  const w = logoStrokeWidth(px)
  const { cx, cy, r } = LOGO_DISC
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${px}" height="${px}">` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${LOGO_BLUE}"/>` +
    `<path d="${LOGO_STROKE}" fill="none" stroke="${LOGO_BLUE}" stroke-width="${w + 3}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${LOGO_STROKE}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`
}
