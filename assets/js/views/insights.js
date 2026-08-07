/* ============================================================
   views/insights.js — banco de percepções
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util, ST = App.store, UI = App.ui, C = App.charts;
  const { esc } = U;
  App.views = App.views || {};

  const state = { q: '', sector: '', status: '' };

  function filtered() {
    let list = ST.state.insights.slice();
    if (state.q) {
      const q = U.norm(state.q);
      list = list.filter(i => U.norm(i.title + ' ' + (i.description || '') + ' ' + (i.tags || []).join(' ')).includes(q));
    }
    if (state.sector) list = list.filter(i => i.sectorId === state.sector);
    if (state.status) list = list.filter(i => i.status === state.status);
    return list.sort((a, b) => (b.impact - b.effort) - (a.impact - a.effort) || String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function convertToTask(i) {
    App.forms.task(null, {
      title: i.title,
      description: (i.description || '') + '\n\n— origem: insight registrado em ' + U.fmtDate(String(i.createdAt).slice(0, 10)),
      sectorId: i.sectorId, tags: i.tags, sourceType: 'insight', sourceId: i.id,
      priority: i.impact >= 4 ? 'alta' : 'media'
    });
    const before = ST.state.tasks.length;
    const off = ST.subscribe(() => {
      if (ST.state.tasks.length > before) {
        off();
        ST.update('insights', i.id, { status: 'convertido', convertedTo: { type: 'tasks', id: ST.state.tasks[0].id } });
      }
    });
    setTimeout(off, 600000);
  }
  function convertToProject(i) {
    App.forms.project(null);
    const before = ST.state.projects.length;
    const off = ST.subscribe(() => {
      if (ST.state.projects.length > before) {
        off();
        ST.update('insights', i.id, { status: 'convertido', convertedTo: { type: 'projects', id: ST.state.projects[0].id } });
      }
    });
    setTimeout(off, 600000);
  }

  function insightCard(i) {
    const conv = i.convertedTo ? ST.get(i.convertedTo.type, i.convertedTo.id) : null;
    const tone = i.status === 'novo' ? 'accent' : i.status === 'avaliando' ? 'warning' : (i.status === 'aprovado' || i.status === 'convertido') ? 'good' : '';
    const quick = i.impact >= 4 && i.effort <= 2;
    return `<article class="card" data-insight="${i.id}" style="cursor:pointer">
      <div class="card__body" style="display:grid;gap:9px">
        <div class="row" style="gap:6px">
          ${UI.sectorChip(i.sectorId) || '<span class="chip">Geral</span>'}
          <span class="chip ${tone ? 'chip--' + tone : ''}">${esc(ST.label.insight(i.status))}</span>
          ${quick ? '<span class="chip chip--good" title="Muito impacto, pouco esforço">⚡ ganho rápido</span>' : ''}
          <div class="spacer"></div>
          <span class="small muted">${esc(U.fmtRelative(String(i.createdAt).slice(0, 10)))}</span>
        </div>
        <h3 style="font-size:14.5px;line-height:1.35">${esc(i.title)}</h3>
        <p class="small muted" style="display:-webkit-box;-webkit-line-clamp:3;line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(U.stripMd(i.description || ''))}</p>
        <div class="row" style="gap:12px;margin-top:2px">
          <span class="small muted">impacto <strong style="color:var(--ink)">${i.impact}</strong>/5</span>
          <span class="small muted">esforço <strong style="color:var(--ink)">${i.effort}</strong>/5</span>
          ${i.source ? `<span class="small muted truncate" style="max-width:150px">via ${esc(i.source)}</span>` : ''}
        </div>
        ${conv ? `<div class="small" style="color:var(--good-text)">${U.icon('check', 'i--sm')} virou ${i.convertedTo.type === 'tasks' ? 'demanda' : 'projeto'}: ${esc(conv.title || conv.name)}</div>` : ''}
        <div class="row" style="gap:6px;margin-top:4px">
          ${i.status !== 'convertido' && i.status !== 'arquivado' ? `
            <button class="btn btn--sm" data-to-task="${i.id}">virar demanda</button>
            <button class="btn btn--sm" data-to-project="${i.id}">virar projeto</button>
            <button class="btn btn--sm btn--ghost" data-archive="${i.id}">arquivar</button>` : ''}
        </div>
      </div>
    </article>`;
  }

  App.views.insights = {
    title: 'Insights',
    subtitle: () => {
      const novos = ST.state.insights.filter(i => i.status === 'novo').length;
      const conv = ST.state.insights.filter(i => i.status === 'convertido').length;
      const total = ST.state.insights.length;
      return `${total} registrados · ${novos} aguardando decisão · ${U.pct(conv, total)}% viraram entrega`;
    },
    render(root) {
      const list = filtered();
      const o = (arr, sel, blank) => `<option value="">${esc(blank)}</option>` +
        arr.map(x => `<option value="${esc(x.id)}" ${x.id === sel ? 'selected' : ''}>${esc(x.name || x.label)}</option>`).join('');

      const points = ST.state.insights
        .filter(i => i.status !== 'arquivado')
        .map(i => ({ x: i.effort, y: i.impact, label: i.title, id: i.id, color: ST.sectorColor(i.sectorId), meta: ST.sectorName(i.sectorId) }));

      const byStatus = ST.INSIGHT_STATUS.map((s, ix) => ({
        label: s.label, value: ST.state.insights.filter(i => i.status === s.id).length, color: ST.SERIES[ix % 8]
      }));

      root.innerHTML = `
        <div class="toolbar">
          <div class="search-input">${U.icon('search', 'i--sm')}
            <input class="input" type="search" placeholder="Buscar insight…" value="${esc(state.q)}" data-f="q"></div>
          <select class="select" data-f="sector">${o(ST.state.sectors, state.sector, 'Todos os setores')}</select>
          <select class="select" data-f="status">${o(ST.INSIGHT_STATUS, state.status, 'Todas as situações')}</select>
          <div class="spacer"></div>
          <button class="btn btn--primary btn--sm" data-new>${U.icon('plus', 'i--sm')}<span>Novo insight</span></button>
        </div>

        <div class="grid grid--wide" style="margin-bottom:16px">
          <div class="card">
            <div class="card__head"><div><h3>Impacto × esforço</h3><p>O canto superior esquerdo é onde você deveria estar trabalhando</p></div></div>
            <div class="card__body">${points.length ? C.matrix(points) : '<p class="small muted">Registre insights para ver a matriz.</p>'}</div>
          </div>
          <div class="stack">
            <div class="card">
              <div class="card__head"><div><h3>Situação</h3><p>Insight parado não vira nada</p></div></div>
              <div class="card__body">${C.donut(byStatus, { size: 150, centerValue: ST.state.insights.length, centerLabel: 'insights' })}</div>
            </div>
            <div class="card"><div class="card__body">
              <p class="small muted" style="line-height:1.6">💡 <strong style="color:var(--ink)">Regra de ouro:</strong> todo insight termina em um de três lugares — vira demanda, vira projeto ou vai para o arquivo. Deixar no limbo é o mesmo que não ter anotado.</p>
            </div></div>
          </div>
        </div>

        ${list.length ? `<div class="grid grid--3">${list.map(insightCard).join('')}</div>`
          : `<div class="card"><div class="card__body">${UI.emptyState('💡', 'Nenhum insight aqui', 'Percepções de corredor, reclamações repetidas, gambiarras que os setores inventaram — tudo isso é insight.')}</div></div>`}`;

      U.hydrateIcons(root);
      U.on(root, 'input', 'input[data-f]', U.debounce((ev, n) => { state[n.dataset.f] = n.value; App.render(); }, 220));
      U.on(root, 'change', 'select[data-f]', (ev, n) => { state[n.dataset.f] = n.value; App.render(); });
      U.on(root, 'click', '[data-new]', () => App.forms.insight());
      U.on(root, 'click', '[data-to-task]', (ev, n) => { ev.stopPropagation(); convertToTask(ST.get('insights', n.dataset.toTask)); });
      U.on(root, 'click', '[data-to-project]', (ev, n) => { ev.stopPropagation(); convertToProject(ST.get('insights', n.dataset.toProject)); });
      U.on(root, 'click', '[data-archive]', (ev, n) => {
        ev.stopPropagation();
        ST.update('insights', n.dataset.archive, { status: 'arquivado' });
        UI.toast('Insight arquivado — decisão também é progresso');
      });
      U.on(root, 'click', '[data-insight]', (ev, n) => {
        if (ev.target.closest('button')) return;
        App.forms.insight(n.dataset.insight);
      });
      U.on(root, 'click', '[data-matrix-id]', (ev, n) => { if (n.dataset.matrixId) App.forms.insight(n.dataset.matrixId); });
    }
  };
})(window.App);
