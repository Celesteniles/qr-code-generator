// Proposition E — coquille simplifiée. À charger après d.js et AVANT icons.js / shared.js.
//
//   <aside class="side" data-shell-e></aside>
//   <body data-page="accueil|creer|…" data-nostate>  (data-nostate : pas de bascule visiteur/connecté)
//
// Changements par rapport à D :
// - barre latérale : Accueil, Mes liens & QR, Carte de visite. Plus de « Visite guidée » ni
//   d'« Offres » en rubrique : Offres passe dans le menu du compte et la carte de l'offre.
// - visiteur : une seule invitation au compte (courte), pas de doublon en haut de page.
// - mobile : Accueil · Mes liens · + · Carte · Compte (Offres sort des onglets).

(function () {
  function shell() {
    const side = document.querySelector('[data-shell-e]')
    if (!side) return
    const page = document.body.dataset.page
    const cur = (p) => (p === page ? 'aria-current="page"' : '')
    side.innerHTML = `
      <a class="logo" href="e-accueil.html"><span class="logo-mark"></span><span>link<b>.cg</b></span></a>
      <a class="btn btn-cta btn-block new" href="e-creer.html"><i data-i="plus"></i>Créer</a>
      <a class="nav" ${cur('accueil')} href="e-accueil.html"><i data-i="home"></i>Accueil</a>
      <a class="nav" ${cur('mes-qr')} href="d-mes-qr.html"><i data-i="link"></i>Mes liens &amp; QR</a>
      <a class="nav" ${cur('carte')} href="d-carte.html"><i data-i="user"></i>Carte de visite<i data-i="lock" class="lock only-guest"></i></a>
      <div class="side-foot">
        <div class="side-card compact only-guest">
          <strong>Gardez vos liens</strong>
          <p class="muted">Compte gratuit : liens modifiables et visites comptées.</p>
          <a class="btn btn-brand btn-sm btn-block mt-12" href="d-connexion.html?mode=inscription">Créer mon compte</a>
        </div>
        <div class="side-card only-user">
          <div class="row"><strong>Offre Gratuit</strong><span class="subtle num" style="margin-left:auto">5 / 25 liens</span></div>
          <div class="meter mt-8"><span style="width:20%"></span></div>
          <a class="link small mt-12" href="d-offres.html" style="display:inline-flex">Voir les offres <i data-i="arrow" class="sm"></i></a>
        </div>
        <div class="me">
          <span class="avatar only-user">CG</span>
          <div class="grow only-user"><div style="font-weight:600">Céleste</div><div class="subtle xs">NS Creative</div></div>
          <a class="grow only-guest small" href="d-connexion.html" style="font-weight:600">Se connecter</a>
          <button class="icon-btn" data-theme-toggle aria-label="Changer de thème"><i data-i="moon" class="sm"></i></button>
        </div>
      </div>`

    const tab = document.createElement('nav')
    tab.className = 'tabbar e'
    tab.innerHTML = `
      <a ${cur('accueil')} href="e-accueil.html"><i data-i="home"></i>Accueil</a>
      <a ${cur('mes-qr')} href="d-mes-qr.html"><i data-i="link"></i>Mes liens</a>
      <a href="e-creer.html" aria-label="Créer un lien ou un QR"><span class="fab"><i data-i="plus"></i></span></a>
      <a ${cur('carte')} href="d-carte.html"><i data-i="user"></i>Carte</a>
      <a href="d-connexion.html"><i data-i="contact"></i>Compte</a>`
    document.body.appendChild(tab)

    if (document.body.hasAttribute('data-nostate')) return
    const sw = document.createElement('div')
    sw.className = 'state-switch'
    sw.innerHTML = 'Aperçu&nbsp;: <button data-state-set="guest">Visiteur</button><button data-state-set="user">Connecté</button>'
    document.body.appendChild(sw)
  }
  document.addEventListener('DOMContentLoaded', shell)
})()
