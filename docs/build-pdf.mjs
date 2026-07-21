#!/usr/bin/env node
// Génère docs/presentation-commerciale.pdf depuis docs/PRESENTATION-COMMERCIALE.md
// Usage : node docs/build-pdf.mjs
// Dépendances : marked + Google Chrome.

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = join(DIR, '..')
const SRC = join(DIR, 'PRESENTATION-COMMERCIALE.md')
const LOGO = join(ROOT, 'apps', 'web', 'public', 'logo.png')
const HTML = join(DIR, '.presentation.tmp.html')
const PDF = join(DIR, 'Presentation.pdf')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const require = createRequire(import.meta.url)
const { marked } = require('marked')

const DATE = process.env.DOC_DATE ?? 'Juillet 2026'
const AUTHOR = process.env.DOC_AUTHOR ?? 'Celeste GAKONO'

const logo = `data:image/png;base64,${readFileSync(LOGO).toString('base64')}`

// Le titre H1 est porté par la couverture, on le retire du corps.
const md = readFileSync(SRC, 'utf8').replace(/^#\s+.*\n/, '')

// Typographie française : la ponctuation double est précédée d'une espace
// insécable, sans quoi la justification peut la rejeter en début de ligne.
// Sûr sur ce corpus : le motif exige une espace avant le signe, ce qui exclut
// les « https:// » et les attributs HTML.
const frenchSpacing = (s) =>
  s.replace(/ ([:;!?»])/g, ' $1').replace(/« /g, '« ')

// Les titres « ## 3. La solution » deviennent un numéro cadratin + un intitulé.
const body = frenchSpacing(marked.parse(md, { mangle: false, headerIds: false }))
  .replace(
    /<h2>(\d+)\.\s*(.*?)<\/h2>/g,
    (_, n, title) =>
      `<h2><span class="num">${String(n).padStart(2, '0')}</span><span>${title}</span></h2>`,
  )

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Présentation de la solution cible</title>
<style>
  /* Marges latérales larges : à 10,5 pt, une justification de 174 mm donnerait
     des lignes de ~100 signes, bien au-delà du confort de lecture. */
  @page { size: A4; margin: 22mm 26mm; }

  :root {
    --ink:     #0f1115;
    --body:    #2b2f36;
    --muted:   #6b7280;
    --light:   #9ca3af;
    --accent:  #0060ff;   /* bleu exact du logo NS Creative */
    --tint:    #f0f5ff;
    --rule:    #e5e7eb;
  }

  * { box-sizing: border-box; }

  body {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.62;
    color: var(--body);
    margin: 0;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  /* ══ Couverture ══════════════════════════════════════════════ */
  .cover {
    height: 253mm;
    display: flex;
    flex-direction: column;
    page-break-after: always;
  }
  .cover .logo { width: 74px; height: 74px; margin-top: 34mm; }

  /* Filet d'accentuation : un fond perdu serait rogné par Chrome, qui n'imprime
     rien hors de la zone définie par @page. */
  .cover .rule {
    width: 62px;
    height: 4px;
    background: var(--accent);
    margin: 40px 0 22px;
  }

  .cover .eyebrow {
    margin: 0 0 14px;
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .cover h1 {
    font-size: 33pt;
    line-height: 1.1;
    letter-spacing: -0.025em;
    margin: 0 0 18px;
    font-weight: 700;
    color: var(--ink);
  }
  .cover .sub {
    font-size: 12.5pt;
    line-height: 1.5;
    color: var(--muted);
    margin: 0;
    max-width: 118mm;
    text-align: left;   /* le sous-titre reste du texte d'affichage, non justifié */
    hyphens: none;
  }
  .cover .spacer { flex: 1; }

  .cover .meta {
    display: flex;
    border-top: 2px solid var(--ink);
    padding-top: 16px;
  }
  .cover .meta div { flex: 1; }
  .cover .meta .k {
    display: block;
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--light);
    margin-bottom: 5px;
  }
  .cover .meta .v { font-size: 10pt; font-weight: 600; color: var(--ink); }
  .cover .meta .v small {
    display: block;
    font-size: 9pt;
    font-weight: 400;
    color: var(--muted);
    margin-top: 2px;
  }

  /* ══ Titres de section ═══════════════════════════════════════ */
  h2 {
    display: flex;
    align-items: baseline;
    gap: 16px;
    font-size: 18pt;
    letter-spacing: -0.02em;
    color: var(--ink);
    margin: 0 0 24px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--ink);
    page-break-before: always;
    page-break-after: avoid;
  }
  h2 .num {
    font-size: 11pt;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 0.04em;
    font-variant-numeric: tabular-nums;
  }

  h3 {
    font-size: 11pt;
    font-weight: 700;
    color: var(--ink);
    margin: 28px 0 9px;
    padding-left: 11px;
    border-left: 3px solid var(--accent);
    page-break-after: avoid;
  }

  /* Justification + césure. Les deux vont ensemble : sans césure, le français
     et ses mots longs creuseraient des lézardes dans un fer à gauche/droite.
     La césure s'appuie sur le lang="fr" porté par <html>. */
  p, li {
    text-align: justify;
    -webkit-hyphens: auto;
    hyphens: auto;
  }
  p { margin: 0 0 11px; }
  strong { font-weight: 600; color: var(--ink); }

  /* Exemples d'usage : un paragraphe entièrement en italique */
  p > em:only-child {
    display: block;
    font-style: normal;
    color: var(--body);
    background: var(--tint);
    padding: 13px 16px;
    border-radius: 3px;
    margin: 6px 0 8px;
    font-size: 9.8pt;
    page-break-inside: avoid;
  }

  ul, ol { margin: 0 0 13px; padding-left: 19px; }
  li { margin-bottom: 6px; padding-left: 3px; }
  li::marker { color: var(--accent); }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 20px;
    font-size: 9.8pt;
    page-break-inside: avoid;
  }
  th {
    text-align: left;
    font-weight: 700;
    font-size: 8pt;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 0 12px 9px;
    border-bottom: 2px solid var(--ink);
  }
  td {
    padding: 11px 12px;
    border-bottom: 1px solid var(--rule);
    vertical-align: top;
  }
  td:first-child { color: var(--ink); font-weight: 600; }
  tr:last-child td { border-bottom: none; }

  /* Les noms de domaine ne doivent pas ressembler à du code dans un document
     commercial : pas de chasse fixe, pas de fond, et surtout pas de padding
     qui créerait un blanc avant la ponctuation suivante. */
  code {
    font-family: inherit;
    font-weight: 600;
    color: var(--ink);   /* le bleu reste réservé aux liens et aux accents */
    background: none;
    padding: 0;
    white-space: nowrap;
  }
  a { color: var(--accent); text-decoration: none; font-weight: 600; }

  hr { display: none; }  /* les séparateurs sont portés par les sauts de page */
</style></head>
<body>

<section class="cover">
  <img class="logo" src="${logo}" alt="NS Creative">

  <div class="rule"></div>
  <p class="eyebrow">Document de présentation</p>
  <h1>Présentation de<br>la solution cible</h1>
  <p class="sub">Plateforme de liens intelligents pour les entreprises
     et les institutions d'Afrique centrale</p>

  <div class="spacer"></div>

  <div class="meta">
    <div><span class="k">Présenté par</span>
         <span class="v">${AUTHOR}<small>NS Creative</small></span></div>
    <div><span class="k">Plateforme</span>
         <span class="v">qrcode.cg<small>link.cg</small></span></div>
    <div><span class="k">Date</span>
         <span class="v">${DATE}</span></div>
  </div>
</section>

${body}
</body></html>`

writeFileSync(HTML, html)

execFileSync(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${PDF}`,
  `file://${HTML}`,
], { stdio: 'inherit' })

unlinkSync(HTML)
console.log(`✓ ${PDF}`)
