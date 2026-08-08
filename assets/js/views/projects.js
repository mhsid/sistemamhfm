/* ============================================================
   views/projects.js — portfólio de soluções por setor
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util, ST = App.store, UI = App.ui, C = App.charts;
  const { esc, el } = U;
  App.views = App.views || {};

  const state = { q: '', sector: '', stage: '', status: 'ativo' };

  function filtered() {
    let list = ST.state.projects.slice();
    if (state.q) {
      const q = U.norm(state.q);
      list = list.filter(p => U.norm(p.name + ' ' + (p.problem || '') + ' ' + (p.solution || '') + ' ' + (p.tags || []).join(' ')).includes(q));
    }
    if (state.sector) list = list.filter(p => p.sectorId === state.sector);
    if (state.stage) list = list.filter(p => p.stage === state.stage);
    if (state.status) list = list.filter(p => p.status === state.status);
    const order = ST.PROJECT_STAGE.map(s => s.id);
    return list.sort((a, b) => order.indexOf(b.stage) - order.indexOf(a.stage) || (b.progress || 0) - (a.progress || 0));
  }

  function projectCard(p) {
    const tasks = ST.tasksOfProject(p.id);
    const openTasks = tasks.filter(t => t.status !== 'done').length;
    const ms = p.milestones || [];
    const msDone = ms.filter(m => m.done).length;
    const stageIdx = ST.PROJECT_STAGE.findIndex(s => s.id === p.stage);
    const lastUpdate = (p.updates || []).length ? p.updates[0].date : String(p.updatedAt || '').slice(0, 10);
    const quiet = U.daysBetween(lastUpdate, U.today()) >= 14 && p.status === 'ativo';

    return `<article class="card" data-project="${p.id}" style="cursor:pointer;display:grid;gap:0">
      <div class="card__body" style="display:grid;gap:11px">
        <div class="row" style="gap:7px">
          ${UI.sectorChip(p.sectorId) || '<span class="chip">Transversal</span>'}
          <span class="chip ${p.status === 'ativo' ? 'chip--accent' : p.status === 'concluido' ? 'chip--good' : p.status === 'pausado' ? 'chip--warning' : ''}">${esc(ST.PROJECT_STATUS.find(s => s.id === p.status).label)}</span>
          ${quiet ? `<span class="chip chip--warning" title="Sem atualização há mais de 14 dias">${U.icon('alert', 'i--sm')} parado</span>` : ''}
        </div>
        <h3 style="font-size:15px">${esc(p.name)}</h3>
        <p class="small muted" style="display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(U.stripMd(p.problem || p.solution || ''))}</p>

        <div style="display:flex;gap:3px;margin-top:2px" title="Etapa: ${esc(ST.label.stage(p.stage))}">
          ${ST.PROJECT_STAGE.map((s, i) => `<span style="flex:1;height:4px;border-radius:99px;background:${i <= stageIdx ? 'var(--accent)' : 'var(--sunken)'}"></span>`).join('')}
        </div>
        <div class="row small muted" style="justify-content:space-between">
          <span>${esc(ST.label.stage(p.stage))}</span>
          <span class="tnum">${p.progress || 0}%</span>
        </div>

        <div class="divider" style="margin:2px 0"></div>
        <div class="row small muted" style="gap:14px">
          <span title="Demandas abertas">${U.icon('kanban', 'i--sm')} ${openTasks}/${tasks.length}</span>
          ${ms.length ? `<span title="Marcos concluídos">${U.icon('flag', 'i--sm')} ${msDone}/${ms.length}</span>` : ''}
          ${(p.impact || {}).hoursSavedMonth ? `<span title="Horas economizadas por mês">${U.icon('zap', 'i--sm')} ${p.impact.hoursSavedMonth}h/mês</span>` : ''}
          ${p.targetDate ? `<span class="${p.targetDate < U.today() && p.status === 'ativo' ? 'tcard__due--late' : ''}" title="Entrega prevista">${U.icon('clock', 'i--sm')} ${esc(U.fmtDate(p.targetDate, 'medium'))}</span>` : ''}
        </div>
      </div>
    </article>`;
  }

  /* ============================================================
     DETALHE DO PROJETO
     ============================================================ */
  function detail(id) {
    const p = ST.get('projects', id);
    if (!p) return;
    const tasks = ST.tasksOfProject(id);
    const ms = p.milestones || [];
    const impact = p.impact || {};

    const body = el('div', { html: `
      <div class="row" style="gap:7px;margin-bottom:14px">
        ${UI.sectorChip(p.sectorId) || ''}
        <span class="chip chip--accent">${esc(ST.label.stage(p.stage))}</span>
        <span class="chip">${esc(ST.PROJECT_STATUS.find(s => s.id === p.status).label)}</span>
        ${p.startDate ? `<span class="chip">início ${esc(U.fmtDate(p.startDate, 'medium'))}</span>` : ''}
        ${p.targetDate ? `<span class="chip ${p.targetDate < U.today() && p.status === 'ativo' ? 'chip--critical' : ''}">entrega ${esc(U.fmtDate(p.targetDate, 'medium'))}</span>` : ''}
      </div>

      ${C.meter(p.progress || 0, 100, { label: 'Progresso', valueText: (p.progress || 0) + '%' })}

      <div class="grid grid--stats" style="margin:16px 0">
        <div class="stat"><span class="stat__label">Horas/mês devolvidas</span><span class="stat__value">${U.fmtNumber(impact.hoursSavedMonth || 0)}<small>h</small></span></div>
        <div class="stat"><span class="stat__label">Pessoas impactadas</span><span class="stat__value">${U.fmtNumber(impact.peopleImpacted || 0)}</span></div>
        <div class="stat"><span class="stat__label">Economia estimada</span><span class="stat__value" style="font-size:22px">${esc(U.fmtMoney(impact.costSaved || 0))}<small>/ano</small></span></div>
      </div>

      <div class="section-title">O problema</div>
      <div class="md">${U.markdown(p.problem) || '<p class="muted small">Não descrito.</p>'}</div>
      <div class="section-title" style="margin-top:14px">A solução</div>
      <div class="md">${U.markdown(p.solution) || '<p class="muted small">Não descrita.</p>'}</div>

      ${(p.stakeholders || []).length ? `<div class="section-title" style="margin-top:14px">Pessoas envolvidas</div>
        <div class="row" style="gap:6px">${p.stakeholders.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>` : ''}

      <div class="divider"></div>
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <div class="section-title" style="margin:0">Marcos</div>
        <button class="link-btn" data-add-ms>+ novo marco</button>
      </div>
      <div data-ms-list style="display:grid;gap:6px">
        ${ms.length ? ms.map(m => `
          <div class="list__row" style="cursor:default">
            <button class="checkbox-round ${m.done ? 'is-done' : ''}" data-ms-toggle="${m.id}"></button>
            <div class="list__main">
              <span class="list__title ${m.done ? 'is-done' : ''}">${esc(m.title)}</span>
              ${m.due ? `<span class="list__sub">${esc(U.fmtDate(m.due))} · ${esc(U.fmtRelative(m.due))}</span>` : ''}
            </div>
            <button class="icon-btn" data-ms-del="${m.id}" style="width:28px;height:28px">${U.icon('trash', 'i--sm')}</button>
          </div>`).join('') : '<p class="small muted">Nenhum marco definido. Marcos deixam o projeto verificável.</p>'}
      </div>

      <div class="divider"></div>
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <div class="section-title" style="margin:0">Demandas do projeto</div>
        <button class="link-btn" data-add-task>+ nova demanda</button>
      </div>
      <div style="display:grid;gap:4px">
        ${tasks.length ? tasks.map(t => `
          <div class="list__row" data-task-open="${t.id}">
            <div class="list__main"><span class="list__title ${t.status === 'done' ? 'is-done' : ''}">${esc(t.title)}</span>
            <span class="list__sub">${t.due ? 'prazo ' + esc(U.fmtRelative(t.due)) : 'sem prazo'}</span></div>
            <div class="list__side">${UI.statusChip(t.status)}</div>
          </div>`).join('') : '<p class="small muted">Nenhuma demanda ligada a este projeto.</p>'}
      </div>

      <div class="divider"></div>
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <div class="section-title" style="margin:0">Diário do projeto</div>
        <button class="link-btn" data-add-update>+ registrar atualização</button>
      </div>
      <div data-updates class="timeline">
        ${(p.updates || []).length ? p.updates.map(up => `
          <div class="tl-item is-accent">
            <span class="tl-item__time">${esc(U.fmtDate(up.date))} · ${esc(U.fmtRelative(up.date))}</span>
            <div class="md" style="font-size:13px">${U.markdown(up.text)}</div>
          </div>`).join('') : '<p class="small muted">Sem atualizações registradas. Projeto sem notícia é projeto que o setor acha que morreu.</p>'}
      </div>` });

    const m = UI.modal({
      title: p.name, size: 'wide',
      subtitle: ST.sectorName(p.sectorId) + ' · ' + ST.label.stage(p.stage),
      body,
      footer: [
        { label: 'Editar projeto', icon: 'edit', onClick: ({ close }) => { close(); App.forms.project(id); } },
        'spacer',
        { label: 'Fechar', variant: 'primary', onClick: ({ close }) => close() }
      ]
    });

    const refresh = () => { m.close(); detail(id); };

    U.on(body, 'click', '[data-ms-toggle]', (ev, n) => {
      const item = (p.milestones || []).find(x => x.id === n.dataset.msToggle);
      if (!item) return;
      item.done = !item.done;
      ST.update('projects', id, { milestones: p.milestones });
      refresh();
    });
    U.on(body, 'click', '[data-ms-del]', (ev, n) => {
      ST.update('projects', id, { milestones: (p.milestones || []).filter(x => x.id !== n.dataset.msDel) });
      refresh();
    });
    U.on(body, 'click', '[data-add-ms]', () => {
      const f = el('div', { html: `<div class="form-grid">
        ${App.forms.helpers.text('title', 'Marco', '', { col2: true, placeholder: 'Ex.: Piloto com uma série completa' })}
        ${App.forms.helpers.text('due', 'Prazo', '', { type: 'date' })}</div>` });
      UI.modal({ title: 'Novo marco', size: 'sm', body: f, footer: ['spacer',
        { label: 'Cancelar', onClick: ({ close }) => close() },
        { label: 'Adicionar', variant: 'primary', onClick: ({ close }) => {
          const v = App.forms.helpers.readForm(f);
          if (!v.title) { UI.toast('Descreva o marco', 'bad'); return; }
          const list = (p.milestones || []).concat([{ id: U.uid('ms'), title: v.title, due: v.due || '', done: false }]);
          ST.update('projects', id, { milestones: list });
          close(); refresh();
        } }] });
    });
    U.on(body, 'click', '[data-add-update]', () => {
      const f = el('div', { html: `<div class="form-grid">
        ${App.forms.helpers.area('text', 'O que aconteceu?', '', { col2: true, rows: 5, placeholder: 'Avanços, obstáculos, feedback recebido, decisões…' })}
        ${App.forms.helpers.text('date', 'Data', U.today(), { type: 'date' })}</div>` });
      UI.modal({ title: 'Atualização do projeto', body: f, footer: ['spacer',
        { label: 'Cancelar', onClick: ({ close }) => close() },
        { label: 'Registrar', variant: 'primary', onClick: ({ close }) => {
          const v = App.forms.helpers.readForm(f);
          if (!v.text) { UI.toast('Escreva a atualização', 'bad'); return; }
          const list = [{ id: U.uid('up'), date: v.date || U.today(), text: v.text }].concat(p.updates || []);
          ST.update('projects', id, { updates: list });
          UI.toast('Atualização registrada ✓', 'good');
          close(); refresh();
        } }] });
    });
    U.on(body, 'click', '[data-add-task]', () => { m.close(); App.forms.task(null, { projectId: id, sectorId: p.sectorId }); });
    U.on(body, 'click', '[data-task-open]', (ev, n) => { m.close(); App.forms.task(n.dataset.taskOpen); });
  }

  /* ---------- view ---------- */
  App.views.projects = {
    title: 'Projetos',
    subtitle: () => `${ST.activeProjects().length} ativos · ${ST.impactHoursMonth()}h/mês devolvidas ao colégio`,
    detail,
    render(root, params) {
      if (params && params.open) setTimeout(() => detail(params.open), 60);
      const list = filtered();
      const o = (arr, sel, blank) => `<option value="">${esc(blank)}</option>` +
        arr.map(x => `<option value="${esc(x.id)}" ${x.id === sel ? 'selected' : ''}>${esc(x.name || x.label)}</option>`).join('');

      const stages = ST.PROJECT_STAGE.map(s => ({
        label: s.label, hint: s.hint, value: ST.state.projects.filter(p => p.stage === s.id && p.status !== 'cancelado').length
      }));

      root.innerHTML = `
        <div class="toolbar">
          <div class="search-input">${U.icon('search', 'i--sm')}
            <input class="input" type="search" placeholder="Buscar projeto…" value="${esc(state.q)}" data-f="q"></div>
          <select class="select" data-f="sector">${o(ST.state.sectors, state.sector, 'Todos os setores')}</select>
          <select class="select" data-f="stage">${o(ST.PROJECT_STAGE, state.stage, 'Todas as etapas')}</select>
          <select class="select" data-f="status">
            <option value="">Todas as situações</option>
            ${ST.PROJECT_STATUS.map(s => `<option value="${s.id}" ${state.status === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
          </select>
          <div class="spacer"></div>
          <button class="btn btn--primary btn--sm" data-new>${U.icon('plus', 'i--sm')}<span>Novo projeto</span></button>
        </div>

        <div class="grid grid--2" style="margin-bottom:16px">
          <div class="card"><div class="card__head"><div><h3>Pipeline</h3><p>Quantos projetos em cada etapa</p></div></div>
            <div class="card__body">${C.funnel(stages)}</div></div>
          <div class="card"><div class="card__head"><div><h3>Impacto acumulado</h3><p>Somando piloto e produção</p></div></div>
            <div class="card__body">
              <div class="grid grid--3" style="gap:10px">
                <div class="stat" style="box-shadow:none"><span class="stat__label">Horas/mês</span><span class="stat__value">${ST.impactHoursMonth()}<small>h</small></span></div>
                <div class="stat" style="box-shadow:none"><span class="stat__label">Pessoas</span><span class="stat__value">${ST.peopleImpacted()}</span></div>
                <div class="stat" style="box-shadow:none"><span class="stat__label">Economia/ano</span><span class="stat__value" style="font-size:20px">${esc(U.fmtMoney(U.sum(ST.state.projects.map(p => (p.impact || {}).costSaved))))}</span></div>
              </div>
              <p class="small muted" style="margin-top:12px">Esses são os números que a direção pergunta. Mantenha-os honestos: estimativa combinada com o setor vale mais que número otimista.</p>
            </div></div>
        </div>

        ${list.length ? `<div class="grid grid--3">${list.map(projectCard).join('')}</div>`
          : `<div class="card"><div class="card__body">${UI.emptyState('🚀', 'Nenhum projeto aqui', 'Ajuste os filtros ou crie o primeiro projeto a partir de uma demanda recorrente de algum setor.')}</div></div>`}`;

      U.hydrateIcons(root);
      U.on(root, 'input', 'input[data-f]', U.debounce((ev, n) => { state[n.dataset.f] = n.value; App.render(); }, 220));
      U.on(root, 'change', 'select[data-f]', (ev, n) => { state[n.dataset.f] = n.value; App.render(); });
      U.on(root, 'click', '[data-new]', () => App.forms.project());
      U.on(root, 'click', '[data-project]', (ev, n) => detail(n.dataset.project));
    }
  };
})(window.App);
