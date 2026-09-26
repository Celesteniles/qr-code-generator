// Maquettes — utilitaires partagés : QR factice (SVG), onglets, tiroir, thème.
// Aucune dépendance. Le QR est un motif pseudo-aléatoire avec vrais repères
// (finder patterns) : suffisant pour juger le rendu, pas scannable.

(function () {
  function rng(seed) {
    let s = seed >>> 0 || 1
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  }

  // opts : { size, fg, fg2, bg, dot: square|rounded|dots|classy, corner: square|rounded|dot, seed, logo }
  function qrSvg(opts) {
    const o = Object.assign({ size: 240, fg: '#14152b', bg: '#ffffff', dot: 'rounded', corner: 'rounded', seed: 7 }, opts)
    const n = 25, m = 2, cell = o.size / (n + m * 2)
    const r = rng(o.seed)
    const inFinder = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)
    const inLogo = (x, y) => o.logo && x > 8 && x < 16 && y > 8 && y < 16
    const grid = []
    for (let y = 0; y < n; y++) { grid[y] = []; for (let x = 0; x < n; x++) grid[y][x] = !inFinder(x, y) && !inLogo(x, y) && r() > 0.52 }
    const on = (x, y) => y >= 0 && y < n && x >= 0 && x < n && grid[y][x]
    const id = 'g' + Math.floor(Math.random() * 1e9)
    const fill = o.fg2 ? `url(#${id})` : o.fg
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.size} ${o.size}" width="${o.size}" height="${o.size}" role="img" aria-label="Aperçu du QR code">`
    if (o.fg2) s += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${o.fg}"/><stop offset="1" stop-color="${o.fg2}"/></linearGradient></defs>`
    s += `<rect width="100%" height="100%" rx="${cell * 1.2}" fill="${o.bg}"/>`
    s += `<g fill="${fill}">`
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (!grid[y][x]) continue
      const px = (x + m) * cell, py = (y + m) * cell
      if (o.dot === 'dots') s += `<circle cx="${px + cell / 2}" cy="${py + cell / 2}" r="${cell * 0.42}"/>`
      else if (o.dot === 'square') s += `<rect x="${px}" y="${py}" width="${cell + 0.3}" height="${cell + 0.3}"/>`
      else if (o.dot === 'classy') {
        const rr = on(x - 1, y) || on(x, y - 1) ? 0 : cell * 0.5
        s += `<rect x="${px}" y="${py}" width="${cell + 0.3}" height="${cell + 0.3}" rx="${rr}"/>`
      } else {
        const lone = !on(x - 1, y) && !on(x + 1, y) && !on(x, y - 1) && !on(x, y + 1)
        s += `<rect x="${px}" y="${py}" width="${cell + 0.3}" height="${cell + 0.3}" rx="${lone ? cell / 2 : cell * 0.3}"/>`
      }
    }
    const finder = (fx, fy) => {
      const px = (fx + m) * cell, py = (fy + m) * cell
      const R = o.corner === 'square' ? 0 : o.corner === 'dot' ? cell * 3.5 : cell * 1.6
      const Ri = o.corner === 'square' ? 0 : o.corner === 'dot' ? cell * 1.5 : cell * 0.8
      s += `<rect x="${px + cell / 2}" y="${py + cell / 2}" width="${cell * 6}" height="${cell * 6}" rx="${R}" fill="none" stroke="${fill}" stroke-width="${cell}"/>`
      s += `<rect x="${px + cell * 2}" y="${py + cell * 2}" width="${cell * 3}" height="${cell * 3}" rx="${Ri}"/>`
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7)
    s += `</g>`
    if (o.logo) {
      const c = o.size / 2, w = cell * 6
      s += `<rect x="${c - w / 2}" y="${c - w / 2}" width="${w}" height="${w}" rx="${cell * 1.4}" fill="${o.logoBg || '#0060ff'}"/>`
      s += `<text x="${c}" y="${c + cell * 1.1}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="${cell * 3}" fill="#fff">${o.logo}</text>`
    }
    return s + `</svg>`
  }

  function renderAll(root = document) {
    root.querySelectorAll('[data-qr]').forEach((el) => {
      const d = el.dataset
      el.innerHTML = qrSvg({
        size: Number(d.size || 240), fg: d.fg, fg2: d.fg2, bg: d.bg, dot: d.dot, corner: d.corner,
        seed: Number(d.seed || 7), logo: d.logo, logoBg: d.logoBg,
      })
    })
  }

  // Onglets : [data-tabs] > [data-tab="x"] + [data-panel="x"]
  function tabs() {
    document.querySelectorAll('[data-tabs]').forEach((group) => {
      const btns = group.querySelectorAll('[data-tab]')
      btns.forEach((b) => b.addEventListener('click', () => {
        btns.forEach((x) => x.setAttribute('aria-selected', String(x === b)))
        group.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.tab })
      }))
    })
  }

  // Choix exclusifs : [data-choice] > button → aria-pressed
  function choices() {
    document.querySelectorAll('[data-choice]').forEach((group) => {
      const btns = group.querySelectorAll(':scope > button')
      btns.forEach((b) => b.addEventListener('click', () => {
        btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
        const target = group.dataset.choice && document.querySelector(group.dataset.choice)
        if (target && b.dataset.set) {
          Object.assign(target.dataset, JSON.parse(b.dataset.set))
          renderAll(target.parentElement)
        }
      }))
    })
  }

  // Tiroir : [data-open="#id"], [data-close]
  function drawers() {
    document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
      const d = document.querySelector(b.dataset.open)
      if (d) { d.hidden = false; requestAnimationFrame(() => d.classList.add('is-open')) }
    }))
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => {
      const d = b.closest('.drawer')
      d.classList.remove('is-open'); setTimeout(() => { d.hidden = true }, 200)
    }))
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return
      document.querySelectorAll('.drawer.is-open [data-close]').forEach((b) => b.click())
    })
  }

  // Thème : bouton [data-theme-toggle]
  function theme() {
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => {
      const root = document.documentElement
      const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)
      root.dataset.theme = dark ? 'light' : 'dark'
    }))
  }

  // Suppression en deux temps (maquette du comportement proposé)
  function confirmDelete() {
    document.querySelectorAll('[data-confirm]').forEach((b) => {
      const label = b.innerHTML
      b.addEventListener('click', () => {
        if (b.classList.contains('is-confirm')) { b.closest('[data-row]')?.remove(); return }
        b.classList.add('is-confirm'); b.textContent = 'Confirmer ?'
        setTimeout(() => { b.classList.remove('is-confirm'); b.innerHTML = label }, 2500)
      })
    })
  }

  // Copie : [data-copy]
  function copy() {
    document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
      navigator.clipboard?.writeText(b.dataset.copy)
      const t = b.getAttribute('aria-label'); b.classList.add('is-done'); b.setAttribute('aria-label', 'Copié')
      setTimeout(() => { b.classList.remove('is-done'); b.setAttribute('aria-label', t) }, 1500)
    }))
  }

  // Pictogrammes de formes : <span data-glyph="dots|square|rounded|classy|classy-rounded|extra-rounded|c-square|c-rounded|c-dot">
  const CELLS = [[0, 0], [1, 0], [0, 1], [2, 1], [1, 2], [2, 2], [0, 2]]
  function glyph(type) {
    const c = 9, g = 1.5
    let body = ''
    if (type.startsWith('c-')) {
      const R = type === 'c-square' ? 0 : type === 'c-dot' ? 12 : 6
      const r = type === 'c-square' ? 0 : type === 'c-dot' ? 5 : 2.5
      body = `<rect x="3" y="3" width="24" height="24" rx="${R}" fill="none" stroke="currentColor" stroke-width="3.5"/><rect x="10" y="10" width="10" height="10" rx="${r}" fill="currentColor"/>`
    } else {
      body = CELLS.map(([x, y]) => {
        const px = g + x * c + x * 0.75, py = g + y * c + y * 0.75
        if (type === 'dots') return `<circle cx="${px + c / 2}" cy="${py + c / 2}" r="${c / 2 - .3}"/>`
        if (type === 'square') return `<rect x="${px}" y="${py}" width="${c}" height="${c}"/>`
        if (type === 'rounded') return `<rect x="${px}" y="${py}" width="${c}" height="${c}" rx="2.4"/>`
        if (type === 'extra-rounded') return `<rect x="${px}" y="${py}" width="${c}" height="${c}" rx="4"/>`
        const k = type === 'classy' ? 4.5 : 6
        return `<path d="M${px} ${py + k}a${k} ${k} 0 0 1 ${k} -${k}h${c - k}v${c - k}a${k} ${k} 0 0 1 -${k} ${k}h-${c - k}z"/>`
      }).join('')
    }
    return `<svg viewBox="0 0 30 30" fill="currentColor" aria-hidden="true">${body}</svg>`
  }
  function glyphs() { document.querySelectorAll('[data-glyph]').forEach((el) => { el.outerHTML = glyph(el.dataset.glyph) }) }

  // État visiteur / connecté (maquettes C) : [data-state-set="guest|user"], mémorisé entre pages
  function state() {
    const btns = document.querySelectorAll('[data-state-set]')
    if (!btns.length) return
    const apply = (s) => {
      document.body.dataset.state = s
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.stateSet === s)))
      try { sessionStorage.setItem('maquette-state', s) } catch (e) { /* stockage indisponible */ }
    }
    let saved = null
    try { saved = sessionStorage.getItem('maquette-state') } catch (e) { /* idem */ }
    const fromUrl = new URLSearchParams(location.search).get('etat')
    apply(fromUrl || saved || document.body.dataset.state || 'guest')
    btns.forEach((b) => b.addEventListener('click', () => apply(b.dataset.stateSet)))
  }

  window.Maquette = { qrSvg, renderAll }
  document.addEventListener('DOMContentLoaded', state)
  // Bandeau d'annotation : un clic hors lien le referme
  document.addEventListener('click', (e) => { const n = e.target.closest('.note'); if (n && !e.target.closest('a')) n.remove() })
  document.addEventListener('DOMContentLoaded', () => { glyphs(); renderAll(); tabs(); choices(); drawers(); theme(); confirmDelete(); copy() })
})()
