// Génère les icônes de link.cg à partir du symbole (src/components/kit/logo-mark.ts) :
//   public/icon.svg                 favicon vectoriel (navigateurs récents)
//   public/favicon-16x16.png, -32x32.png, src/app/favicon.ico (16/32/48)
//   public/apple-touch-icon.png     180 px, fond papier (iOS n'aime pas la transparence)
//   public/android-chrome-192x192.png, -512x512.png, icon-maskable-512.png
// Rendu par Chrome sans interface (CHROME=chemin pour un autre emplacement), .ico par ImageMagick.
// Usage : node scripts/icons.mjs

import { spawn, execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { logoMarkSvg } from '../src/components/kit/logo-mark.ts'

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PAPER = '#f6f3ee'
const out = (p) => join(import.meta.dirname, '..', p)
const tmp = mkdtempSync(join(tmpdir(), 'linkcg-icons-'))

const port = 9400 + Math.floor(Math.random() * 400)
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${tmp}/profile`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(1500)
const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id) } }
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
await send('Page.enable')

/** Rend le symbole en PNG : `pad` = marge (fraction), `bg` = fond (transparent si absent). */
async function render(file, px, { pad = 0, bg = null } = {}) {
  const inner = Math.round(px * (1 - 2 * pad))
  const html = `<html><body style="margin:0;background:${bg ?? 'transparent'}">
    <div style="width:${px}px;height:${px}px;display:grid;place-items:center">${logoMarkSvg(inner)}</div></body></html>`
  await send('Emulation.setDeviceMetricsOverride', { width: px, height: px, deviceScaleFactor: 1, mobile: false })
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
  await send('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(html).toString('base64') })
  await sleep(400)
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: px, height: px, scale: 1 } })
  writeFileSync(file, Buffer.from(r.result.data, 'base64'))
}

writeFileSync(out('public/icon.svg'), logoMarkSvg(64).replace(' width="64" height="64"', '') + '\n')
await render(out('public/favicon-16x16.png'), 16)
await render(out('public/favicon-32x32.png'), 32)
await render(join(tmp, 'f48.png'), 48)
await render(out('public/apple-touch-icon.png'), 180, { pad: 0.1, bg: PAPER })
await render(out('public/android-chrome-192x192.png'), 192, { pad: 0.1, bg: PAPER })
await render(out('public/android-chrome-512x512.png'), 512, { pad: 0.1, bg: PAPER })
// « maskable » : Android découpe l'icône (cercle, goutte…) ; le symbole reste dans la zone sûre (80 %).
await render(out('public/icon-maskable-512.png'), 512, { pad: 0.2, bg: PAPER })

chrome.kill()
execFileSync('magick', [out('public/favicon-16x16.png'), out('public/favicon-32x32.png'), join(tmp, 'f48.png'), out('src/app/favicon.ico')])
console.log('Icônes générées.')
process.exit(0)
