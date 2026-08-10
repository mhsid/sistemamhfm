/* ============================================================
   brand.js — identidade visual do Colégio Fazer Crescer

   O logo oficial fica em assets/img/logo.png (um logo.svg, se existir,
   tem preferência). O desenho vetorial abaixo — copa entrelaçada, pássaro
   e traço curvo — é a reserva usada quando nenhum arquivo é encontrado,
   e também é a fonte do favicon e do avatar do companheiro.
   As cores vieram da amostragem do arquivo oficial.
   ============================================================ */
(function (App) {
  'use strict';

  const COLORS = {
    lime: '#afca08',      // verde-limão da copa (do arquivo oficial)
    limeInk: '#95ae00',   // verde escurecido, legível em gráficos
    navy: '#133880',      // azul-marinho do pássaro e do traço (oficial)
    navySoft: '#5b86d5'   // azul claro para o modo escuro
  };

  /** Copa entrelaçada + tronco, em verde. */
  function canopy(lime) {
    let loops = '';
    for (let k = 0; k < 6; k++) {
      const ang = -90 + k * 60, rad = ang * Math.PI / 180;
      const cx = (50 + 20 * Math.cos(rad)).toFixed(1);
      const cy = (36 + 20 * Math.sin(rad)).toFixed(1);
      loops += `<ellipse cx="${cx}" cy="${cy}" rx="10" ry="13.5" transform="rotate(${ang + 90} ${cx} ${cy})"/>`;
    }
    return `<g fill="none" stroke="${lime}" stroke-width="5.6" stroke-linecap="round">
      ${loops}<circle cx="50" cy="36" r="8.5"/>
      <path d="M43 55 C39 65 34 72 26 77"/><path d="M57 55 C61 65 66 72 74 77"/></g>`;
  }

  /** Pássaro em voo — também usado sozinho como avatar do companheiro. */
  function bird(navy, eye) {
    return `<path fill="${navy}" d="M90 36 C85 31 76 30 67 33 C60 35 54 39 50 43
      C46 35 42 27 39 19 C40 30 41 40 43 48 C35 51 27 56 19 62
      C29 60 41 57 51 55 C65 52 78 47 86 42 L97 39 Z"/>
      <circle cx="86" cy="35.5" r="1.5" fill="${eye || '#fff'}"/>`;
  }

  /** Traço curvo da base. */
  const swoosh = navy => `<path fill="${navy}" d="M3 72 C24 106 74 106 99 56 C86 100 26 104 3 82 Z"/>`;

  /** Marca completa. */
  function markSvg(opts) {
    opts = opts || {};
    const lime = opts.lime || COLORS.lime;
    const navy = opts.navy || COLORS.navy;
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Colégio Fazer Crescer">
      ${canopy(lime)}${bird(navy)}${swoosh(navy)}</svg>`;
  }

  /** Só o pássaro, enquadrado — avatar do companheiro. */
  function birdSvg(navy) {
    return `<svg viewBox="14 14 88 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${bird(navy || '#fff')}</svg>`;
  }

  /* ---------- logo oficial (opcional) ----------
     Procura assets/img/logo.svg e depois logo.png uma única vez e guarda o
     resultado, para não repetir requisições a cada tela. */
  const LOGO_KEY = 'nucleo-ia:logo';
  let resolved = null;

  function probe(cb) {
    const attempt = (url, next) => {
      const im = new Image();
      im.onload = () => cb(url);
      im.onerror = next;
      im.src = url;
    };
    attempt('assets/img/logo.svg', () => attempt('assets/img/logo.png', () => cb('')));
  }

  /** Resolve o logo (do cache ou procurando) e chama done(). */
  function init(done) {
    let cached = null;
    try { cached = localStorage.getItem(LOGO_KEY); } catch (e) { /* sem storage */ }
    if (cached !== null) { resolved = cached; applyFavicon(); if (done) done(); return; }
    probe(url => {
      resolved = url;
      try { localStorage.setItem(LOGO_KEY, url); } catch (e) { /* sem storage */ }
      applyFavicon();
      if (done) done();
    });
  }

  /** Força nova procura — usado quando o arquivo é adicionado depois. */
  function rescan(done) {
    try { localStorage.removeItem(LOGO_KEY); } catch (e) { /* sem storage */ }
    resolved = null;
    init(done);
  }
  const hasCustom = () => !!resolved;

  /** Marca pronta para o HTML: logo oficial se existir, senão o desenho. */
  function logo(size, opts) {
    const px = size || 36;
    return `<span class="brandmark" style="width:${px}px;height:${px}px">` +
      (resolved ? `<img src="${resolved}" alt="Logo do colégio">` : markSvg(opts)) + `</span>`;
  }

  /** Favicon gerado a partir da própria marca. */
  function applyFavicon() {
    const link0 = document.querySelector('link[rel="icon"]');
    if (resolved && link0) { link0.href = resolved; return; }
    const inner = canopy(COLORS.lime) + bird(COLORS.navy) + swoosh(COLORS.navy);
    const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 106 106">${inner}</svg>`;
    const link = document.querySelector('link[rel="icon"]');
    if (link) link.href = 'data:image/svg+xml,' + encodeURIComponent(full);
  }

  App.brand = {
    COLORS, markSvg, birdSvg, logo, init, rescan, hasCustom, applyFavicon,
    school: 'Colégio Fazer Crescer',
    system: 'Núcleo de IA'
  };
})(window.App);
