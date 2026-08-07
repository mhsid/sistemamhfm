/* ============================================================
   views/notes.js — anotações livres (método, referências, ideias)
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util, ST = App.store, UI = App.ui;
  const { esc, el } = U;
  App.views = App.views || {};

  const state = { q: '', tag: '', sector: '' };

  function allTags() {
    return U.uniq(ST.state.notes.reduce((acc, n) => acc.concat(n.tags || []), [])).sort();
  }
  function filtered() {
    let list = ST.state.notes.slice();
    if (state.q) {
      const q = U.norm(state.q);
      list = list.filter(n => U.norm(n.title + ' ' + (n.body || '') + ' ' + (n.tags || []).join(' ')).includes(q));
    }
    if (state.tag) list = list.filter(n => (n.tags || []).includes(state.tag));
    if (state.sector) list = list.filter(n => n.sectorId === state.sector);
    return list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  function read(id) {
    const n = ST.get('notes', id);
    if (!n) return;
    const body = el('div', { html: `
      <div class="row" style="gap:6px;margin-bottom:14px">
        ${UI.sectorChip(n.sectorId) || ''}
        ${(n.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        <div class="spacer"></div>
        <span class="small muted">atualizada ${esc(U.fmtRelative(String(n.updatedAt).slice(0, 10)))}</span>
      </div>
      <div class="md">${U.markdown(n.body) || '<p class="muted">Nota vazia.</p>'}</div>` });

    UI.modal({
      title: n.title, size: 'wide', body,
      footer: [
        { label: n.pinned ? 'Desafixar' : 'Fixar', icon: 'pin', onClick: ({ close }) => { ST.update('notes', id, { pinned: !n.pinned }); close(); UI.toast(n.pinned ? 'Desafixada' : 'Fixada no topo'); } },
        { label: 'Copiar', icon: 'copy', onClick: () => { if (navigator.clipboard) navigator.clipboard.writeText(n.body || '').then(() => UI.toast('Copiado ✓', 'good')); } },
        'spacer',
        { label: 'Editar', variant: 'primary', icon: 'edit', onClick: ({ close }) => { close(); App.forms.note(id); } }
      ]
    });
  }

  App.views.notes = {
    title: 'Anotações',
    subtitle: () => `${ST.state.notes.length} anotações · ${ST.state.notes.filter(n => n.pinned).length} fixadas`,
    render(root) {
      const list = filtered();
      const tags = allTags();
      root.innerHTML = `
        <div class="toolbar">
          <div class="search-input">${U.icon('search', 'i--sm')}
            <input class="input" type="search" placeholder="Buscar no conteúdo das anotações…" value="${esc(state.q)}" data-f="q"></div>
          <select class="select" data-f="sector"><option value="">Todos os setores</option>
            ${ST.state.sectors.map(s => `<option value="${s.id}" ${state.sector === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
          <select class="select" data-f="tag"><option value="">Todas as etiquetas</option>
            ${tags.map(t => `<option value="${esc(t)}" ${state.tag === t ? 'selected' : ''}>#${esc(t)}</option>`).join('')}</select>
          <div class="spacer"></div>
          <button class="btn btn--primary btn--sm" data-new>${U.icon('plus', 'i--sm')}<span>Nova anotação</span></button>
        </div>

        ${list.length ? `<div class="notes-grid">${list.map(n => `
          <article class="note" data-note="${n.id}" data-color="${esc(n.color || '')}">
            ${n.pinned ? '<span class="note__pin">📌</span>' : ''}
            <h3 class="note__title">${esc(n.title)}</h3>
            <div class="note__body">${esc(U.stripMd(n.body || '').slice(0, 320))}</div>
            <div class="note__foot">
              ${UI.sectorChip(n.sectorId) || ''}
              ${(n.tags || []).slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
              <div class="spacer"></div>
              <span class="small muted">${esc(U.fmtDate(String(n.updatedAt).slice(0, 10), 'short'))}</span>
            </div>
          </article>`).join('')}</div>`
        : `<div class="card"><div class="card__body">${UI.emptyState('📝', 'Nenhuma anotação', 'Use este espaço para o que não é tarefa: seu método, princípios, roteiros de reunião, referências e ideias soltas.')}</div></div>`}`;

      U.hydrateIcons(root);
      U.on(root, 'input', 'input[data-f]', U.debounce((ev, n) => { state[n.dataset.f] = n.value; App.render(); }, 220));
      U.on(root, 'change', 'select[data-f]', (ev, n) => { state[n.dataset.f] = n.value; App.render(); });
      U.on(root, 'click', '[data-new]', () => App.forms.note());
      U.on(root, 'click', '[data-note]', (ev, n) => read(n.dataset.note));
    }
  };
})(window.App);
