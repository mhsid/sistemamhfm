/* ============================================================
   views/tasks.js — quadro (kanban) e lista de demandas
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util, ST = App.store, UI = App.ui;
  const { esc } = U;
  App.views = App.views || {};

  const state = { mode: 'board', q: '', sector: '', priority: '', project: '', filter: '', sort: 'score' };

  /* ---------- filtro ---------- */
  function filtered() {
    let list = ST.state.tasks.slice();
    if (state.q) {
      const q = U.norm(state.q);
      list = list.filter(t => U.norm(t.title + ' ' + (t.description || '') + ' ' + (t.tags || []).join(' ')).includes(q));
    }
    if (state.sector) list = list.filter(t => t.sectorId === state.sector);
    if (state.priority) list = list.filter(t => t.priority === state.priority);
    if (state.project) list = list.filter(t => t.projectId === state.project);
    if (state.filter === 'overdue') list = list.filter(t => t.status !== 'done' && t.due && t.due < U.today());
    if (state.filter === 'today') list = list.filter(t => t.status !== 'done' && t.due === U.today());
    if (state.filter === 'week') {
      const end = U.addDays(U.today(), 7);
      list = list.filter(t => t.status !== 'done' && t.due && t.due <= end);
    }
    const sorters = {
      score: (a, b) => ST.taskScore(b) - ST.taskScore(a),
      due: (a, b) => (a.due || '9999').localeCompare(b.due || '9999'),
      created: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
      title: (a, b) => a.title.localeCompare(b.title)
    };
    return list.sort(sorters[state.sort] || sorters.score);
  }

  /* ---------- cartão ---------- */
  function card(t) {
    const pri = ST.PRIORITY.find(p => p.id === t.priority) || ST.PRIORITY[1];
    const checks = t.checklist || [];
    const doneChecks = checks.filter(c => c.done).length;
    const late = t.due && t.due < U.today() && t.status !== 'done';
    const isToday = t.due === U.today() && t.status !== 'done';
    const proj = t.projectId ? ST.get('projects', t.projectId) : null;

    return `<article class="tcard" draggable="true" data-task="${t.id}">
      <div class="tcard__top">
        <span class="tcard__pri" style="background:${pri.color}" title="Prioridade ${esc(pri.label)}"></span>
        <span class="tcard__title">${esc(t.title)}</span>
      </div>
      ${checks.length ? `<div class="tcard__bar" title="${doneChecks} de ${checks.length} itens"><span style="width:${U.pct(doneChecks, checks.length)}%"></span></div>` : ''}
      <div class="tcard__meta">
        ${t.sectorId ? `<span class="chip" style="font-size:10.5px"><span class="chip__dot" style="background:${ST.sectorColor(t.sectorId)}"></span>${esc(ST.sectorName(t.sectorId))}</span>` : ''}
        ${t.due ? `<span class="${late ? 'tcard__due--late' : isToday ? 'tcard__due--today' : ''}" style="display:inline-flex;align-items:center;gap:3px">${U.icon('clock', 'i--sm')}${esc(U.fmtDate(t.due, 'short'))}</span>` : ''}
        ${checks.length ? `<span>${doneChecks}/${checks.length}</span>` : ''}
        ${t.timeSpentMin ? `<span>${esc(U.fmtDuration(t.timeSpentMin))}</span>` : ''}
        ${proj ? `<span class="truncate" style="max-width:110px" title="${esc(proj.name)}">${U.icon('rocket', 'i--sm')}</span>` : ''}
      </div>
    </article>`;
  }

  /* ---------- quadro ---------- */
  function board(list) {
    const wip = ST.settings.wipLimit || 3;
    return `<div class="kanban">${ST.TASK_STATUS.map(col => {
      const items = list.filter(t => t.status === col.id);
      const over = col.id === 'doing' && items.length > wip;
      return `<section class="kcol" data-col="${col.id}">
        <header class="kcol__head">
          <span class="kcol__dot" style="background:${col.color}"></span>
          <span class="kcol__title">${esc(col.label)}</span>
          <span class="kcol__count">${items.length}</span>
          <button class="kcol__add" data-add-col="${col.id}" title="Adicionar em ${esc(col.label)}">${U.icon('plus', 'i--sm')}</button>
        </header>
        ${over ? `<div class="kcol__wip">${U.icon('alert', 'i--sm')} acima do seu limite de ${wip}</div>` : ''}
        <div class="kcol__body">
          ${items.map(card).join('') || `<p class="small muted" style="padding:6px 4px 12px">${esc(col.hint)}</p>`}
        </div>
      </section>`;
    }).join('')}</div>`;
  }

  /* ---------- lista ---------- */
  function listView(list) {
    if (!list.length) return `<div class="card"><div class="card__body">${UI.emptyState('🗂️', 'Nada por aqui', 'Nenhuma demanda corresponde aos filtros atuais.')}</div></div>`;
    return `<div class="card"><div class="card__body" style="padding:6px 14px">
      <div class="list">${list.map(t => `
        <div class="list__row" data-task="${t.id}">
          <button class="checkbox-round ${t.status === 'done' ? 'is-done' : ''}" data-toggle="${t.id}" title="${t.status === 'done' ? 'Reabrir' : 'Concluir'}"></button>
          <div class="list__main">
            <span class="list__title ${t.status === 'done' ? 'is-done' : ''}">${esc(t.title)}</span>
            <span class="list__sub">
              ${t.sectorId ? esc(ST.sectorName(t.sectorId)) : 'sem setor'}
              ${t.projectId ? ' · ' + esc((ST.get('projects', t.projectId) || {}).name || '') : ''}
              ${t.due ? ' · prazo ' + esc(U.fmtRelative(t.due)) : ''}
              ${(t.checklist || []).length ? ' · ' + t.checklist.filter(c => c.done).length + '/' + t.checklist.length + ' itens' : ''}
            </span>
          </div>
          <div class="list__side">
            ${UI.priorityChip(t.priority)}
            ${UI.statusChip(t.status)}
            <button class="icon-btn" data-menu="${t.id}" style="width:28px;height:28px">${U.icon('list', 'i--sm')}</button>
          </div>
        </div>`).join('')}</div>
    </div></div>`;
  }

  /* ---------- toolbar ---------- */
  function toolbar() {
    const o = (list, sel, blank) => `<option value="">${esc(blank)}</option>` +
      list.map(x => `<option value="${esc(x.id)}" ${x.id === sel ? 'selected' : ''}>${esc(x.name || x.label)}</option>`).join('');
    return `<div class="toolbar">
      <div class="search-input">${U.icon('search', 'i--sm')}
        <input class="input" type="search" placeholder="Buscar demanda…" value="${esc(state.q)}" data-f="q">
      </div>
      <select class="select" data-f="sector">${o(ST.state.sectors, state.sector, 'Todos os setores')}</select>
      <select class="select" data-f="priority">${o(ST.PRIORITY, state.priority, 'Toda prioridade')}</select>
      <select class="select" data-f="project">${o(ST.state.projects, state.project, 'Todos os projetos')}</select>
      <select class="select" data-f="filter">
        <option value="">Sem recorte</option>
        <option value="overdue" ${state.filter === 'overdue' ? 'selected' : ''}>Em atraso</option>
        <option value="today" ${state.filter === 'today' ? 'selected' : ''}>Vencem hoje</option>
        <option value="week" ${state.filter === 'week' ? 'selected' : ''}>Próximos 7 dias</option>
      </select>
      <select class="select" data-f="sort">
        <option value="score" ${state.sort === 'score' ? 'selected' : ''}>Ordenar: relevância</option>
        <option value="due" ${state.sort === 'due' ? 'selected' : ''}>Ordenar: prazo</option>
        <option value="created" ${state.sort === 'created' ? 'selected' : ''}>Ordenar: mais recentes</option>
        <option value="title" ${state.sort === 'title' ? 'selected' : ''}>Ordenar: título</option>
      </select>
      <div class="spacer"></div>
      <div class="pill-group">
        <button data-mode="board" class="${state.mode === 'board' ? 'is-active' : ''}">Quadro</button>
        <button data-mode="list" class="${state.mode === 'list' ? 'is-active' : ''}">Lista</button>
      </div>
      <button class="btn btn--primary btn--sm" data-new>${U.icon('plus', 'i--sm')}<span>Nova demanda</span></button>
    </div>`;
  }

  /* ---------- view ---------- */
  App.views.tasks = {
    title: 'Demandas',
    subtitle: () => {
      const open = ST.openTasks().length, over = ST.overdueTasks().length;
      return `${open} abertas${over ? ' · ' + over + ' em atraso' : ''} · ${ST.tasksByStatus('doing').length} em andamento`;
    },
    render(root, params) {
      if (params && params.filter) state.filter = params.filter;
      if (params && params.project) state.project = params.project;
      const list = filtered();
      root.innerHTML = toolbar() + (state.mode === 'board' ? board(list) : listView(list));
      U.hydrateIcons(root);

      /* filtros */
      U.on(root, 'input', '[data-f]', U.debounce((ev, node) => {
        state[node.dataset.f] = node.value;
        App.render();
      }, 220));
      U.on(root, 'change', 'select[data-f]', (ev, node) => { state[node.dataset.f] = node.value; App.render(); });
      U.on(root, 'click', '[data-mode]', (ev, node) => { state.mode = node.dataset.mode; App.render(); });
      U.on(root, 'click', '[data-new]', () => App.forms.task(null, { sectorId: state.sector, projectId: state.project }));
      U.on(root, 'click', '[data-add-col]', (ev, node) => App.forms.task(null, { status: node.dataset.addCol, sectorId: state.sector, projectId: state.project }));

      /* abrir / concluir / menu */
      U.on(root, 'click', '[data-toggle]', (ev, node) => {
        ev.stopPropagation();
        const t = ST.get('tasks', node.dataset.toggle);
        const done = t.status === 'done';
        ST.update('tasks', t.id, { status: done ? 'todo' : 'done', completedAt: done ? null : new Date().toISOString() });
        UI.toast(done ? 'Demanda reaberta' : 'Concluída ✓ ' + (Math.random() < .3 ? 'Uma a menos.' : ''), done ? '' : 'good');
      });
      U.on(root, 'click', '[data-menu]', (ev, node) => {
        ev.stopPropagation();
        const t = ST.get('tasks', node.dataset.menu);
        UI.menu(node, [
          { label: 'Editar', icon: 'edit', onClick: () => App.forms.task(t.id) },
          { label: 'Registrar tempo', icon: 'clock', onClick: () => App.forms.timeLog(t.id) },
          { label: 'Duplicar', icon: 'copy', onClick: () => {
            const copy = U.clone(t); delete copy.id; delete copy.createdAt; delete copy.updatedAt;
            copy.title = t.title + ' (cópia)'; copy.status = 'todo'; copy.completedAt = null;
            ST.add('tasks', copy); UI.toast('Demanda duplicada');
          } },
          'sep',
          { label: 'Excluir', icon: 'trash', danger: true, onClick: async () => {
            if (await UI.confirm({ title: 'Excluir demanda?', message: '“' + t.title + '” será removida.', danger: true, confirmText: 'Excluir' })) {
              ST.remove('tasks', t.id);
              UI.toast('Excluída', '', { label: 'Desfazer', onClick: () => ST.undoRemove() });
            }
          } }
        ]);
      });
      U.on(root, 'click', '[data-task]', UI.guard((ev, node) => {
        if (ev.target.closest('[data-toggle],[data-menu]')) return;
        App.forms.task(node.dataset.task);
      }, 'abrir a demanda'));

      /* arrastar e soltar */
      let dragId = null;
      U.on(root, 'dragstart', '.tcard', (ev, node) => {
        dragId = node.dataset.task;
        node.classList.add('is-dragging');
        ev.dataTransfer.effectAllowed = 'move';
        try { ev.dataTransfer.setData('text/plain', dragId); } catch (e) { /* Safari */ }
      });
      U.on(root, 'dragend', '.tcard', (ev, node) => {
        node.classList.remove('is-dragging');
        U.$$('.kcol', root).forEach(c => c.classList.remove('is-over'));
      });
      U.on(root, 'dragover', '.kcol', (ev, node) => {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
        U.$$('.kcol', root).forEach(c => c.classList.toggle('is-over', c === node));
      });
      U.on(root, 'drop', '.kcol', (ev, node) => {
        ev.preventDefault();
        const id = dragId || ev.dataTransfer.getData('text/plain');
        const status = node.dataset.col;
        const t = id && ST.get('tasks', id);
        if (!t || t.status === status) { U.$$('.kcol', root).forEach(c => c.classList.remove('is-over')); return; }
        const patch = { status };
        if (status === 'done') patch.completedAt = new Date().toISOString();
        if (t.status === 'done' && status !== 'done') patch.completedAt = null;
        ST.update('tasks', id, patch);
        if (status === 'done') UI.toast('Concluída ✓', 'good');
        dragId = null;
      });
    }
  };
})(window.App);
