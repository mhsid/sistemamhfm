/* ============================================================
   app.js — casca do sistema: navegação, atalhos, busca global
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util, ST = App.store, UI = App.ui;
  const { $, esc, el } = U;

  const NAV = [
    { section: 'Acompanhamento' },
    { id: 'dashboard', label: 'Painel', icon: 'dashboard' },
    { id: 'calendar', label: 'Agenda', icon: 'calendar', count: () => ST.dayAgenda(U.today()).length },
    { section: 'Trabalho' },
    { id: 'tasks', label: 'Demandas', icon: 'kanban', count: () => ST.openTasks().length, alert: () => ST.overdueTasks().length > 0 },
    { id: 'projects', label: 'Projetos', icon: 'rocket', count: () => ST.activeProjects().length },
    { section: 'Registro' },
    { id: 'meetings', label: 'Reuniões', icon: 'users' },
    { id: 'insights', label: 'Insights', icon: 'bulb', count: () => ST.state.insights.filter(i => i.status === 'novo').length },
    { id: 'notes', label: 'Anotações', icon: 'note' },
    { id: 'journal', label: 'Diário', icon: 'book' },
    { section: 'Sistema' },
    { id: 'reports', label: 'Relatórios', icon: 'chart' },
    { id: 'settings', label: 'Configurações', icon: 'settings' }
  ];

  let current = 'dashboard';
  let currentParams = null;

  /* ---------- NAVEGAÇÃO ---------- */
  function buildNav() {
    const nav = $('#nav');
    nav.innerHTML = NAV.map(item => {
      if (item.section) return `<div class="nav__section">${esc(item.section)}</div>`;
      const n = item.count ? item.count() : 0;
      const alert = item.alert && item.alert();
      return `<button class="nav__item ${current === item.id ? 'is-active' : ''}" data-nav="${item.id}">
        ${U.icon(item.icon)}<span>${esc(item.label)}</span>
        ${n ? `<span class="nav__count ${alert ? 'is-alert' : ''}">${n}</span>` : ''}
      </button>`;
    }).join('');
    U.hydrateIcons(nav);
  }

  function go(view, params) {
    if (!App.views[view]) view = 'dashboard';
    current = view;
    currentParams = params || null;
    if (location.hash.slice(1) !== view) {
      history.replaceState(null, '', '#' + view);
    }
    $('#app').classList.remove('nav-open');
    $('#scrim').hidden = true;
    render();
    $('#view').scrollTop = 0;
  }

  /** Re-renderiza a view atual preservando o foco de campos de filtro. */
  function render() {
    const view = App.views[current];
    if (!view) return;
    const active = document.activeElement;
    const keep = active && active.dataset && active.dataset.f
      ? { f: active.dataset.f, start: active.selectionStart, end: active.selectionEnd } : null;

    $('#viewTitle').textContent = typeof view.title === 'function' ? view.title() : view.title;
    $('#viewSubtitle').textContent = typeof view.subtitle === 'function' ? view.subtitle() : (view.subtitle || '');

    /* Troca o container por um clone limpo: descarta os listeners delegados
       da view anterior, que de outra forma se acumulariam a cada render. */
    const old = $('#view');
    const root = old.cloneNode(false);
    old.parentNode.replaceChild(root, old);

    try {
      view.render(root, currentParams);
    } catch (e) {
      console.error('Erro ao renderizar', current, e);
      root.innerHTML = `<div class="card"><div class="card__body">
        <h3>Algo quebrou nesta tela</h3>
        <p class="small muted" style="margin:8px 0">${esc(e.message)}</p>
        <button class="btn btn--sm" onclick="location.reload()">Recarregar</button></div></div>`;
    }
    currentParams = null;
    App.charts.hydrate(root);

    if (keep) {
      const node = root.querySelector(`[data-f="${keep.f}"]`);
      if (node) {
        node.focus();
        if (node.setSelectionRange && node.type !== 'number' && node.type !== 'date') {
          try { node.setSelectionRange(keep.start, keep.end); } catch (e) { /* ignorado */ }
        }
      }
    }
    buildNav();
    refreshChrome();
  }

  function refreshChrome() {
    const s = ST.settings;
    const first = (s.userName || '').trim();
    $('#userName').textContent = first || 'Configure seu perfil';
    $('#userRole').textContent = s.role || 'Engenheiro de IA';
    $('#userAvatar').textContent = (first || 'N').charAt(0).toUpperCase();
    $('#brandName').textContent = s.school || App.brand.school;
    $('#brandSub').textContent = App.brand.system;
    $('#streakNum').textContent = ST.streak();
    const viewName = typeof App.views[current].title === 'function' ? App.views[current].title() : App.views[current].title;
    document.title = viewName + ' · Núcleo IA · ' + (s.school || App.brand.school);
  }

  /* ---------- TEMA ---------- */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', ST.settings.theme || 'auto');
    const isDark = ST.settings.theme === 'dark' ||
      (ST.settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    $('#btnTheme').innerHTML = U.icon(isDark ? 'sun' : 'moon');
    U.hydrateIcons($('#btnTheme'));
  }
  function toggleTheme() {
    const order = ['auto', 'light', 'dark'];
    const next = order[(order.indexOf(ST.settings.theme || 'auto') + 1) % 3];
    ST.settings.theme = next;
    ST.emit('theme');
    applyTheme();
    UI.toast('Tema: ' + ({ auto: 'automático (segue o sistema)', light: 'claro', dark: 'escuro' })[next]);
  }

  /* ---------- COMPANHEIRO ---------- */
  function toggleCompanion(force) {
    const app = $('#app');
    const open = force === undefined ? !app.classList.contains('companion-open') : force;
    app.classList.toggle('companion-open', open);
    if (open) App.companion.render();
  }

  /* ---------- PALETA DE COMANDOS ---------- */
  const COMMANDS = [
    { label: 'Nova demanda', hint: 'criar', icon: 'plus', run: () => App.forms.task() },
    { label: 'Registrar reunião', hint: 'criar', icon: 'users', run: () => App.forms.meeting() },
    { label: 'Novo insight', hint: 'criar', icon: 'bulb', run: () => App.forms.insight() },
    { label: 'Nova anotação', hint: 'criar', icon: 'note', run: () => App.forms.note() },
    { label: 'Novo evento na agenda', hint: 'criar', icon: 'calendar', run: () => App.forms.event() },
    { label: 'Novo projeto', hint: 'criar', icon: 'rocket', run: () => App.forms.project() },
    { label: 'Registrar o dia no diário', hint: 'criar', icon: 'book', run: () => App.forms.journal() },
    { label: 'Revisão semanal', hint: 'ritual', icon: 'refresh', run: () => App.companion.review() },
    { label: 'Relatório para a direção', hint: 'exportar', icon: 'chart', run: () => App.views.reports.openReport() },
    { label: 'Exportar backup', hint: 'dados', icon: 'download', run: () => App.views.settings.exportNow() },
    { label: 'Alternar tema', hint: 'aparência', icon: 'moon', run: toggleTheme },
    { label: 'Abrir companheiro', hint: 'ajuda', icon: 'sparkles', run: () => toggleCompanion(true) }
  ];

  function searchAll(q) {
    const nq = U.norm(q);
    if (!nq) return [];
    const out = [];
    const push = (group, icon, label, hint, run) => out.push({ group, icon, label, hint, run });
    ST.state.tasks.forEach(t => {
      if (U.norm(t.title + ' ' + (t.description || '')).includes(nq))
        push('Demandas', 'kanban', t.title, ST.label.status(t.status) + (t.sectorId ? ' · ' + ST.sectorName(t.sectorId) : ''), () => App.forms.task(t.id));
    });
    ST.state.projects.forEach(p => {
      if (U.norm(p.name + ' ' + (p.problem || '') + ' ' + (p.solution || '')).includes(nq))
        push('Projetos', 'rocket', p.name, ST.label.stage(p.stage), () => go('projects', { open: p.id }));
    });
    ST.state.meetings.forEach(m => {
      if (U.norm(m.title + ' ' + (m.notes || '') + ' ' + (m.decisions || []).join(' ')).includes(nq))
        push('Reuniões', 'users', m.title, U.fmtDate(m.date), () => App.views.meetings.detail(m.id));
    });
    ST.state.insights.forEach(i => {
      if (U.norm(i.title + ' ' + (i.description || '')).includes(nq))
        push('Insights', 'bulb', i.title, ST.label.insight(i.status), () => App.forms.insight(i.id));
    });
    ST.state.notes.forEach(n => {
      if (U.norm(n.title + ' ' + (n.body || '')).includes(nq))
        push('Anotações', 'note', n.title, U.fmtRelative(String(n.updatedAt).slice(0, 10)), () => App.forms.note(n.id));
    });
    ST.state.journal.forEach(j => {
      if (U.norm([j.focus, j.wins, j.blockers, j.learned].join(' ')).includes(nq))
        push('Diário', 'book', j.focus || U.fmtDate(j.date), U.fmtDate(j.date, 'full'), () => App.forms.journal(j.date));
    });
    return out.slice(0, 24);
  }

  let paletteItems = [], paletteIndex = 0;

  function openPalette() {
    $('#paletteRoot').hidden = false;
    const input = $('#paletteInput');
    input.value = '';
    updatePalette('');
    setTimeout(() => input.focus(), 30);
  }
  const closePalette = () => { $('#paletteRoot').hidden = true; };

  function updatePalette(q) {
    const nq = U.norm(q);
    const navItems = NAV.filter(n => n.id && (!nq || U.norm(n.label).includes(nq)))
      .map(n => ({ group: 'Ir para', icon: n.icon, label: n.label, hint: '', run: () => go(n.id) }));
    const cmds = COMMANDS.filter(c => !nq || U.norm(c.label + ' ' + c.hint).includes(nq))
      .map(c => ({ group: 'Ações', icon: c.icon, label: c.label, hint: c.hint, run: c.run }));
    const found = searchAll(q);
    paletteItems = (nq ? found.concat(cmds, navItems) : cmds.slice(0, 6).concat(navItems)).slice(0, 30);
    paletteIndex = 0;
    renderPalette();
  }

  function renderPalette() {
    const box = $('#paletteResults');
    if (!paletteItems.length) {
      box.innerHTML = `<p class="small muted" style="padding:20px;text-align:center">Nada encontrado. Tente outro termo — a busca cobre demandas, projetos, reuniões, insights, notas e diário.</p>`;
      return;
    }
    let html = '', lastGroup = '';
    paletteItems.forEach((it, i) => {
      if (it.group !== lastGroup) { html += `<div class="palette__group">${esc(it.group)}</div>`; lastGroup = it.group; }
      html += `<div class="palette__item ${i === paletteIndex ? 'is-active' : ''}" data-pi="${i}">
        ${U.icon(it.icon, 'i--sm')}<span class="truncate">${esc(it.label)}</span>
        <span class="spacer"></span>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</div>`;
    });
    box.innerHTML = html;
    U.hydrateIcons(box);
    const active = box.querySelector('.is-active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function runPalette(i) {
    const item = paletteItems[i];
    if (!item) return;
    closePalette();
    setTimeout(() => item.run(), 40);
  }

  /* ---------- BOAS-VINDAS ---------- */
  function onboarding() {
    const body = el('div', { html: `
      <div style="text-align:center;margin-bottom:18px">
        <span style="display:block;width:72px;height:72px;margin:0 auto">${App.brand.logo(72)}</span>
        <h3 style="font-size:19px;margin-top:10px">Núcleo de IA · Colégio Fazer Crescer</h3>
        <p class="small muted" style="max-width:430px;margin:6px auto 0;line-height:1.6">
          Este é o seu diário de bordo como Engenheiro de IA do colégio: reuniões, insights, demandas, projetos,
          agenda e indicadores em um lugar só — com um companheiro digital te lembrando do que importa.
        </p>
      </div>
      <div class="form-grid">
        <div class="field"><label class="field__label">Como você quer ser chamado?</label>
          <input class="input" name="userName" placeholder="Seu nome" autofocus></div>
        <div class="field"><label class="field__label">Nome da instituição</label>
          <input class="input" name="school" value="Colégio Fazer Crescer"></div>
        <div class="field col-2"><label class="field__label">Como seu companheiro deve se chamar?</label>
          <input class="input" name="companionName" value="Sabiá" placeholder="Sabiá">
          <span class="field__hint">O padrão é Sabiá — o pássaro que voa no logo do colégio</span></div>
        <div class="field col-2"><label class="field__label">E como ele deve falar com você?</label>
          <select class="select" name="persona">
            <option value="parceiro">Parceiro — caloroso, me motiva</option>
            <option value="direto">Direto — objetivo, sem rodeios</option>
            <option value="zen">Zen — calmo, me faz respirar</option>
          </select></div>
      </div>
      <p class="small muted" style="margin-top:14px;line-height:1.6">
        O sistema já vem com demandas, projetos e reuniões de exemplo para você navegar sem tela vazia.
        Quando quiser começar do zero, é um clique em <strong>Configurações → remover exemplos</strong>.
        Tudo é salvo apenas neste navegador; exporte backups de tempos em tempos.
      </p>` });

    UI.modal({
      title: '', size: 'sm', dismissable: false, body,
      footer: ['spacer', { label: 'Começar', variant: 'primary', icon: 'arrowRight', onClick: ({ close }) => {
        const v = App.forms.helpers.readForm(body);
        ST.settings.userName = v.userName || '';
        ST.settings.school = v.school || App.brand.school;
        ST.settings.companion.name = v.companionName || 'Sabiá';
        ST.settings.companion.persona = v.persona || 'parceiro';
        ST.settings.onboarded = true;
        ST.emit('onboarding');
        close();
        refreshChrome();
        App.companion.render();
        toggleCompanion(true);
        UI.toast('Tudo pronto. Bom trabalho! 🚀', 'good');
      } }]
    });
  }

  /* ---------- ATALHOS ---------- */
  function keyboard(ev) {
    const typing = /input|textarea|select/i.test(ev.target.tagName) || ev.target.isContentEditable;

    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      $('#paletteRoot').hidden ? openPalette() : closePalette();
      return;
    }
    if (ev.key === 'Escape') {
      if (!$('#paletteRoot').hidden) { closePalette(); return; }
      if (UI.hasModal()) { UI.closeTopModal(); return; }
      if ($('#app').classList.contains('companion-open')) toggleCompanion(false);
      return;
    }
    if (!$('#paletteRoot').hidden) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); paletteIndex = Math.min(paletteIndex + 1, paletteItems.length - 1); renderPalette(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); paletteIndex = Math.max(paletteIndex - 1, 0); renderPalette(); }
      else if (ev.key === 'Enter') { ev.preventDefault(); runPalette(paletteIndex); }
      return;
    }
    if (typing || UI.hasModal() || ev.ctrlKey || ev.metaKey || ev.altKey) return;

    const map = { n: () => App.forms.quickAdd(), c: () => toggleCompanion(), d: () => go('dashboard'),
      t: () => go('tasks'), a: () => go('calendar'), j: () => App.forms.journal(), r: () => go('reports') };
    const fn = map[ev.key.toLowerCase()];
    if (fn) { ev.preventDefault(); fn(); }
  }

  /* ---------- TOOLTIPS DOS GRÁFICOS ---------- */
  function installTooltips() {
    let currentTip = null;
    document.addEventListener('mouseover', ev => {
      const node = ev.target.closest ? ev.target.closest('[data-tip]') : null;
      if (!node) return;
      currentTip = node;
      UI.showTip(decodeURIComponent(node.getAttribute('data-tip')), ev.clientX, ev.clientY);
    });
    document.addEventListener('mousemove', ev => {
      if (!currentTip) return;
      if (!currentTip.isConnected || !(ev.target.closest && ev.target.closest('[data-tip]'))) { currentTip = null; UI.hideTip(); return; }
      UI.showTip(decodeURIComponent(currentTip.getAttribute('data-tip')), ev.clientX, ev.clientY);
    });
    document.addEventListener('mouseleave', () => { currentTip = null; UI.hideTip(); });
    window.addEventListener('scroll', () => { currentTip = null; UI.hideTip(); }, true);
  }

  /* ---------- INICIALIZAÇÃO ---------- */
  function boot() {
    ST.load();
    applyTheme();
    installTooltips();
    App.brand.applyFavicon();
    App.brand.init(() => {
      const brandMark = $('#brandMark'), bootMark = $('#bootMark');
      if (brandMark) brandMark.innerHTML = App.brand.logo(38);
      if (bootMark) bootMark.innerHTML = App.brand.logo(72);
    });

    U.hydrateIcons(document);
    $('#btnCloseNav').innerHTML = U.icon('x');
    $('#btnCloseCompanion').innerHTML = U.icon('x');
    $('#btnOpenNav').innerHTML = U.icon('menu');
    U.hydrateIcons(document);

    /* eventos da casca */
    U.on($('#nav'), 'click', '[data-nav]', (ev, n) => go(n.dataset.nav));
    $('#btnQuickAdd').addEventListener('click', () => App.forms.quickAdd());
    $('#btnSearch').addEventListener('click', openPalette);
    $('#btnTheme').addEventListener('click', toggleTheme);
    $('#btnCompanion').addEventListener('click', () => toggleCompanion());
    $('#btnCloseCompanion').addEventListener('click', () => toggleCompanion(false));
    $('#btnOpenNav').addEventListener('click', () => { $('#app').classList.add('nav-open'); $('#scrim').hidden = false; });
    $('#btnCloseNav').addEventListener('click', () => { $('#app').classList.remove('nav-open'); $('#scrim').hidden = true; });
    $('#scrim').addEventListener('click', () => { $('#app').classList.remove('nav-open'); $('#scrim').hidden = true; });
    $('#streakBox').addEventListener('click', () => go('journal'));
    $('#paletteInput').addEventListener('input', U.debounce(ev => updatePalette(ev.target.value), 120));
    $('#paletteRoot').addEventListener('mousedown', ev => { if (ev.target.id === 'paletteRoot') closePalette(); });
    U.on($('#paletteResults'), 'click', '[data-pi]', (ev, n) => runPalette(Number(n.dataset.pi)));
    U.on($('#paletteResults'), 'mousemove', '[data-pi]', (ev, n) => {
      const i = Number(n.dataset.pi);
      if (i !== paletteIndex) { paletteIndex = i; renderPalette(); }
    });
    document.addEventListener('keydown', keyboard);
    window.addEventListener('hashchange', () => {
      const view = location.hash.slice(1);
      if (view && App.views[view] && view !== current) go(view);
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (ST.settings.theme === 'auto') applyTheme(); });
    window.addEventListener('resize', U.debounce(() => App.charts.hydrate($('#view')), 250));

    /* re-render em qualquer mudança de dados */
    const rerender = U.debounce(() => {
      render();
      if ($('#app').classList.contains('companion-open')) App.companion.render();
      else App.companion.render();
    }, 90);
    ST.subscribe(rerender);

    /* rota inicial */
    const initial = location.hash.slice(1);
    current = App.views[initial] ? initial : 'dashboard';
    render();
    App.companion.start();

    $('#boot').remove();
    $('#app').hidden = false;

    if (!ST.settings.onboarded) setTimeout(onboarding, 320);
    else if (window.innerWidth > 1180) toggleCompanion(true);
  }

  App.go = go;
  App.render = render;
  App.refreshChrome = refreshChrome;
  App.toggleCompanion = toggleCompanion;
  App.openPalette = openPalette;
  App.boot = boot;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.App);
