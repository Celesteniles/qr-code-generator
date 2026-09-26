// Bibliothèque d'illustrations du design system D (source : docs/maquettes/d.js).
// Formes rondes, 2-3 teintes, toujours un QR ou un geste. Les couleurs sont des
// variables CSS : les illustrations suivent le thème clair/sombre.
//
//   <Illustration name="menu" className="h-32 bg-sun rounded-2xl" />

const F = (v: string) => `style="fill:var(--${v})"`
const S = (v: string, w = 3) => `style="fill:none;stroke:var(--${v});stroke-width:${w};stroke-linecap:round;stroke-linejoin:round"`

// Mini QR stylisé : 3 repères + motif fixe
function qr(x: number, y: number, s: number, c = 'ink'): string {
  const u = s / 9
  const fp = (fx: number, fy: number) => `<rect x="${x + fx * u}" y="${y + fy * u}" width="${u * 3}" height="${u * 3}" rx="${u * .8}" ${S(c, u * .7)}/>` +
    `<rect x="${x + fx * u + u * .95}" y="${y + fy * u + u * .95}" width="${u * 1.1}" height="${u * 1.1}" rx="${u * .3}" ${F(c)}/>`
  const dots = [[4, 0.5], [5, 1.5], [4, 2.5], [0.5, 4], [2, 4.5], [4, 4], [5.5, 4.5], [7, 4], [4.5, 5.5], [6, 6], [7.5, 5.8], [5, 7], [6.5, 7.5], [4, 8], [7.8, 7.8], [8, 6.9]]
  return `<rect x="${x - u * .6}" y="${y - u * .6}" width="${s + u * 1.2}" height="${s + u * 1.2}" rx="${u * 1.4}" ${F('surface')}/>` +
    fp(0, 0) + fp(6, 0) + fp(0, 6) +
    dots.map(([dx, dy]: number[]) => `<rect x="${x + dx * u}" y="${y + dy * u}" width="${u * .9}" height="${u * .9}" rx="${u * .3}" ${F(c)}/>`).join('')
}
const spark = (x: number, y: number, r = 6, c = 'sun') => `<path d="M${x} ${y - r}C${x + r * .15} ${y - r * .15} ${x + r * .15} ${y - r * .15} ${x + r} ${y}C${x + r * .15} ${y + r * .15} ${x + r * .15} ${y + r * .15} ${x} ${y + r}C${x - r * .15} ${y + r * .15} ${x - r * .15} ${y + r * .15} ${x - r} ${y}C${x - r * .15} ${y - r * .15} ${x - r * .15} ${y - r * .15} ${x} ${y - r}Z" ${F(c)}/>`
const blob = (c: string) => `<path d="M34 118C14 96 18 52 52 34s86-20 116-8 52 34 44 70-40 52-84 54-78-10-94-32Z" ${F(c)}/>`
const phone = (x: number, y: number, w = 58, h = 104, rot = 0) => `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})">` +
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" ${F('ink')}/>` +
  `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="9" ${F('surface')}/>` +
  `<rect x="${x + w / 2 - 8}" y="${y + 7}" width="16" height="4" rx="2" ${F('ink')}/></g>`
const lines = (x: number, y: number, w: number, n = 3, c = 'line', gap = 9) => Array.from({ length: n }, (_, i) =>
  `<rect x="${x}" y="${y + i * gap}" width="${i === n - 1 ? w * .6 : w}" height="5" rx="2.5" ${F(c)}/>`).join('')

const ILL: Record<string, () => string> = {
  welcome: () => blob('sky') +
    `<rect x="30" y="30" width="92" height="112" rx="10" ${F('surface')}/>` + lines(42, 42, 66, 2, 'line') + qr(46, 66, 58) +
    phone(140, 36, 60, 108, 10) +
    `<g transform="rotate(10 170 90)">${qr(151, 66, 38, 'brand')}<rect x="146" y="118" width="48" height="10" rx="5" ${F('ok')}/></g>` +
    `<path d="M126 70 L146 64 M126 96 L146 96 M126 122 L146 128" ${S('coral', 3)} stroke-dasharray="2 6"/>` +
    spark(214, 30, 9) + spark(24, 30, 6, 'coral') + spark(206, 138, 5, 'brand'),

  link: () => blob('sky') +
    `<rect x="40" y="30" width="160" height="104" rx="12" ${F('surface')}/>` +
    `<rect x="40" y="30" width="160" height="22" rx="12" ${F('ink')}/><rect x="40" y="44" width="160" height="8" ${F('ink')}/>` +
    `<circle cx="54" cy="41" r="3" ${F('coral')}/><circle cx="64" cy="41" r="3" ${F('sun')}/><circle cx="74" cy="41" r="3" ${F('mint')}/>` +
    `<rect x="86" y="36" width="96" height="10" rx="5" ${F('surface')} opacity=".2"/>` +
    lines(56, 66, 70, 3) + `<rect x="56" y="102" width="46" height="14" rx="7" ${F('brand')}/>` +
    qr(140, 64, 44) + spark(212, 28, 8),

  menu: () => blob('sun') +
    `<ellipse cx="120" cy="138" rx="86" ry="10" ${F('ink')} opacity=".08"/>` +
    `<path d="M76 34 h88 a8 8 0 0 1 8 8 v88 h-104 v-88 a8 8 0 0 1 8 -8Z" ${F('surface')}/>` +
    `<rect x="68" y="124" width="104" height="10" rx="3" ${F('coral')}/>` +
    `<text x="120" y="54" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="700" font-size="13" ${F('ink')}>MENU</text>` +
    qr(98, 64, 44) + lines(88, 114, 64, 1) +
    `<path d="M44 60v34M38 60v12a6 6 0 0 0 12 0V60M44 94v28" ${S('ink', 3)}/>` +
    `<path d="M196 60c8 4 8 30 0 34v28" ${S('ink', 3)}/>` + spark(206, 34, 7, 'coral'),

  card: () => blob('coral-tint') +
    `<g transform="rotate(-6 120 84)"><rect x="42" y="40" width="156" height="92" rx="14" ${F('surface')}/>` +
    `<circle cx="76" cy="72" r="16" ${F('coral')}/><circle cx="76" cy="67" r="6" ${F('surface')}/><path d="M64 82a12 10 0 0 1 24 0" ${F('surface')}/>` +
    lines(102, 62, 60, 2, 'ink', 11) + lines(58, 102, 70, 2) + qr(152, 96, 28, 'brand') + `</g>` +
    spark(206, 30, 8) + spark(34, 132, 5, 'brand'),

  wifi: () => blob('mint') +
    `<path d="M74 70a66 66 0 0 1 92 0M86 84a46 46 0 0 1 68 0M98 98a26 26 0 0 1 44 0" ${S('leaf', 7)}/>` +
    `<circle cx="120" cy="112" r="6" ${F('leaf')}/>` + qr(160, 94, 42) + spark(56, 40, 7),

  app: () => blob('lilac') +
    phone(92, 22, 60, 116) +
    `<rect x="104" y="44" width="16" height="16" rx="5" ${F('brand')}/><rect x="124" y="44" width="16" height="16" rx="5" ${F('coral')}/>` +
    `<rect x="104" y="64" width="16" height="16" rx="5" ${F('sun')}/><rect x="124" y="64" width="16" height="16" rx="5" ${F('leaf')}/>` +
    `<rect x="102" y="96" width="40" height="12" rx="6" ${F('ink')}/><rect x="102" y="112" width="40" height="12" rx="6" ${F('ink')}/>` +
    `<rect x="36" y="56" width="46" height="46" rx="12" ${F('surface')}/><path d="M59 70c-5-6-15 0-10 9l10 11 10-11c5-9-5-15-10-9Z" ${F('coral')}/>` +
    qr(164, 64, 40) + spark(210, 32, 7),

  whatsapp: () => blob('mint') +
    `<path d="M58 44h96a14 14 0 0 1 14 14v38a14 14 0 0 1-14 14H96l-22 18v-18H58a14 14 0 0 1-14-14V58a14 14 0 0 1 14-14Z" ${F('leaf')}/>` +
    lines(62, 62, 70, 3, 'surface', 12) + qr(164, 86, 42) + spark(206, 40, 8),

  modifiable: () => blob('sky') +
    `<rect x="26" y="34" width="72" height="96" rx="8" ${F('surface')}/>` + qr(38, 50, 48) + lines(38, 108, 48, 2) +
    `<path d="M112 62c14-12 30-12 42 0" ${S('brand', 4)}/><path d="M150 52l5 10-11 2" ${S('brand', 4)}/>` +
    `<path d="M154 100c-14 12-30 12-42 0" ${S('coral', 4)}/><path d="M116 110l-5-10 11-2" ${S('coral', 4)}/>` +
    `<rect x="168" y="36" width="50" height="34" rx="8" ${F('surface')}/>` + lines(176, 45, 34, 2, 'line') +
    `<rect x="168" y="92" width="50" height="34" rx="8" ${F('surface')}/><rect x="168" y="92" width="50" height="34" rx="8" ${S('brand', 2.5)}/>` + lines(176, 101, 34, 2, 'brand') +
    spark(214, 22, 7),

  fixed: () => blob('soft') +
    `<rect x="70" y="30" width="100" height="112" rx="10" ${F('surface')}/>` + qr(92, 46, 56) + lines(88, 116, 64, 2) +
    `<rect x="150" y="96" width="40" height="34" rx="8" ${F('ink')}/><path d="M160 96v-8a10 10 0 0 1 20 0v8" ${S('ink', 5)}/>` +
    `<circle cx="170" cy="112" r="4" ${F('sun')}/>`,

  stats: () => blob('sun') +
    `<rect x="40" y="30" width="160" height="104" rx="14" ${F('surface')}/>` +
    ([[60, 96, 16], [84, 84, 28], [108, 90, 22], [132, 66, 46], [156, 52, 60]] as const).map(([x, y, h], i) =>
      `<rect x="${x}" y="${y}" width="16" height="${h + 16}" rx="5" ${F(i > 2 ? 'brand' : 'sky')}/>`).join('') +
    `<path d="M58 84 L92 70 L116 76 L140 52 L176 40" ${S('coral', 3.5)}/><path d="M166 38l10 2-3 10" ${S('coral', 3.5)}/>` + spark(212, 28, 8, 'coral'),

  empty: () => blob('sky') +
    `<g transform="rotate(-10 90 70)">${qr(62, 38, 50, 'coral')}</g><g transform="rotate(8 150 64)">${qr(122, 34, 50, 'brand')}</g>` +
    `<path d="M52 92h136l-10 44H62Z" ${F('ink')}/><path d="M44 86h152v12H44Z" rx="4" ${F('ink')}/>` +
    `<rect x="104" y="106" width="32" height="8" rx="4" ${F('surface')} opacity=".3"/>` + spark(206, 36, 8) + spark(38, 44, 5, 'coral'),

  account: () => blob('lilac') +
    phone(34, 40, 44, 80, -8) + `<rect x="92" y="34" width="116" height="76" rx="10" ${F('ink')}/><rect x="98" y="40" width="104" height="64" rx="6" ${F('surface')}/>` +
    `<rect x="82" y="110" width="136" height="8" rx="4" ${F('ink')}/>` +
    qr(112, 50, 36, 'brand') + lines(156, 54, 34, 3) + `<g transform="rotate(-8 56 80)">${qr(44, 64, 24, 'coral')}</g>` +
    `<path d="M84 72c4-4 6-4 10 0" ${S('brand', 3)} stroke-dasharray="1 5"/>` + spark(214, 28, 7),

  print: () => blob('coral-tint') +
    `<rect x="62" y="58" width="116" height="52" rx="12" ${F('ink')}/><rect x="80" y="26" width="80" height="40" rx="6" ${F('surface')}/>` +
    `<rect x="80" y="94" width="80" height="52" rx="6" ${F('surface')}/>` + qr(100, 100, 40) +
    `<circle cx="164" cy="74" r="4" ${F('ok')}/>` + spark(206, 36, 8),

  lock: () => blob('sun') +
    `<rect x="84" y="70" width="72" height="60" rx="14" ${F('ink')}/><path d="M98 70V56a22 22 0 0 1 44 0v14" ${S('ink', 9)}/>` +
    `<circle cx="120" cy="96" r="7" ${F('sun')}/><rect x="117" y="98" width="6" height="16" rx="3" ${F('sun')}/>` + spark(180, 44, 9, 'coral'),

  shortlink: () => blob('sky') +
    `<rect x="22" y="42" width="196" height="26" rx="13" ${F('surface')}/>` +
    `<text x="36" y="59" font-family="Geist Mono, monospace" font-size="10" ${F('subtle')}>https://boutique.com/p?id=8842&amp;ref=…</text>` +
    `<path d="M120 76v18" ${S('ink', 3)}/><path d="M112 88l8 8 8-8" ${S('ink', 3)}/>` +
    `<rect x="54" y="102" width="132" height="36" rx="18" ${F('ink')}/>` +
    `<text x="120" y="125" text-anchor="middle" font-family="Geist Mono, monospace" font-weight="600" font-size="13" ${F('surface')}>link.cg/promo</text>` +
    qr(190, 104, 30, 'brand') + spark(210, 30, 8) + spark(30, 120, 5, 'coral'),

  share: () => blob('mint') +
    phone(34, 30, 62, 112, -6) +
    `<g transform="rotate(-6 65 86)"><rect x="42" y="60" width="44" height="22" rx="7" ${F('leaf')}/><rect x="46" y="66" width="30" height="4" rx="2" ${F('surface')}/><rect x="46" y="73" width="20" height="4" rx="2" ${F('surface')}/></g>` +
    `<path d="M108 58h92a12 12 0 0 1 12 12v28a12 12 0 0 1-12 12h-58l-18 14v-14h-16a12 12 0 0 1-12-12V70a12 12 0 0 1 12-12Z" ${F('surface')}/>` +
    `<rect x="112" y="68" width="30" height="30" rx="8" ${F('brand')}/><path d="M121 83h12M127 77v12" ${S('surface', 3)}/>` +
    `<text x="150" y="80" font-family="Geist Mono, monospace" font-weight="600" font-size="11" ${F('ink')}>link.cg/</text>` +
    `<text x="150" y="94" font-family="Geist Mono, monospace" font-weight="600" font-size="11" ${F('brand')}>promo</text>` +
    spark(210, 34, 8) + spark(116, 130, 5, 'coral'),
  hello: () => blob('sky') + `<circle cx="120" cy="84" r="44" ${F('sun')}/>` +
    `<circle cx="104" cy="78" r="5" ${F('ink')}/><circle cx="136" cy="78" r="5" ${F('ink')}/><path d="M104 98c8 8 24 8 32 0" ${S('ink', 4)}/>` +
    `<path d="M168 60c10-6 18 2 14 12" ${S('coral', 4)}/>` + spark(60, 44, 8, 'brand') + spark(190, 118, 6),
}

export type IllustrationName =
  | 'welcome' | 'link' | 'menu' | 'card' | 'wifi' | 'app' | 'whatsapp' | 'modifiable' | 'fixed'
  | 'stats' | 'empty' | 'account' | 'print' | 'lock' | 'shortlink' | 'share' | 'hello'

/** Illustration décorative (aria-hidden). Largeur 100 %, hauteur fixée via className ou height. */
export function Illustration({ name, className = '', height }: { name: IllustrationName; className?: string; height?: number }) {
  const make = ILL[name]
  if (!make) return null
  const h = height ? ` height="${height}"` : ''
  return (
    <div
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{
        __html: `<svg viewBox="0 0 240 160" width="100%"${h} preserveAspectRatio="xMidYMid meet" style="display:block">${make()}</svg>`,
      }}
    />
  )
}
