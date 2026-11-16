/* ============================================================
   views/calendar.js — calendário mensal, semanal e agenda
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util, ST = App.store, UI = App.ui;
  const { esc } = U;
  App.views = App.views || {};

  const state = { mode: 'month', cursor: U.startOfMonth(U.today()), sector: '' };

  const visible = date => ST.dayAgenda(date).filter(i => !state.sector || i.sectorId === state.sector);

  /* ---------- mês ---------- */
  function monthGrid() {
    const first = U.parseISO(U.startOfMonth(state.cursor));
    const gridStart = U.startOfWeek(U.iso(first), 1);
    const monthKey = state.cursor.slice(0, 7);
    let html = '';
    for (let i = 0; i < 42; i++) {
      const date = U.addDays(gridStart, i);
      const out = date.slice(0, 7) !== monthKey;
      if (i >= 35 && out) break;
      const items = visible(date);
      const isToday = date === U.today();
      html += `<div class="cal__day ${out ? 'is-out' : ''} ${isToday ? 'is-today' : ''}" data-day="${date}">
        <div class="cal__daynum">${U.parseISO(date).getDate()}${isToday ? ' <span class="chip chip--accent" style="font-size:9px;padding:0 5px">hoje</span>' : ''}
          <button class="add" data-add-day="${date}" title="Adicionar">+</button></div>
        ${items.slice(0, 3).map(i => `<div class="cal__ev ${i.done ? 'is-done' : ''}" style="border-left-color:${i.color};background:color-mix(in srgb, ${i.color} 12%, var(--surface))"
            data-open-kind="${i.kind}" data-open-id="${i.id}" title="${esc(i.title)}">
          ${i.time ? `<strong class="tnum">${esc(i.time.slice(0, 5))}</strong>` : ''}<span class="truncate">${esc(i.title)}</span></div>`).join('')}
        ${items.length > 3 ? `<div class="cal__more" data-day-list="${date}">+${items.length - 3} mais</div>` : ''}
      </div>`;
    }
    return `<div class="cal">
      <div class="cal__head">${[1, 2, 3, 4, 5, 6, 0].map(d => `<div>${U.DAYS_SHORT[d]}</div>`).join('')}</div>
      <div class="cal__grid">${html}</div>
    </div>`;
  }

  /* ---------- semana ---------- */
  function weekList() {
    const start = U.startOfWeek(state.cursor, 1);
    let html = '';
    for (let i = 0; i < 7; i++) {
      const date = U.addDays(start, i);
      const items = visible(date);
      html += dayBlock(date, items);
    }
    return `<div class="card"><div class="card__body">${html}</div></div>`;
  }

  /* ---------- agenda (próximos 30 dias) ---------- */
  function agendaList() {
    let html = '';
    let count = 0;
    for (let i = 0; i < 45; i++) {
      const date = U.addDays(U.today(), i);
      const items = visible(date);
      if (!items.length) continue;
      html += dayBlock(date, items);
      count += items.length;
    }
    return `<div class="card"><div class="card__body">${count ? html : UI.emptyState('📅', 'Agenda vazia pela frente', 'Nada marcado nos próximos 45 dias. Bloqueie tempo para trabalho profundo antes que alguém bloqueie por você.')}</div></div>`;
  }

  function dayBlock(date, items) {
    const dt = U.parseISO(date);
    return `<div class="agenda-day ${date === U.today() ? 'is-today' : ''}">
      <div class="agenda-day__date">
        <div class="agenda-day__dow">${U.DAYS_SHORT[dt.getDay()]}</div>
        <div class="agenda-day__num">${dt.getDate()}</div>
        <div class="small muted">${U.MONTHS_SHORT[dt.getMonth()]}</div>
      </div>
      <div class="agenda-day__items">
        ${items.length ? items.map(i => `
          <div class="list__row" data-open-kind="${i.kind}" data-open-id="${i.id}" style="padding:8px 10px;border:1px solid var(--border);border-radius:var(--r-sm);border-left:3px solid ${i.color}">
            <div class="list__main">
              <span class="list__title">${i.done ? '✓ ' : ''}${esc(i.title)}</span>
              <span class="list__sub">${i.time ? esc(i.time) + (i.ref && i.ref.endTime ? '–' + esc(i.ref.endTime) : '') + ' · ' : ''}${esc(ST.label.eventType(i.type))}${i.sectorId ? ' · ' + esc(ST.sectorName(i.sectorId)) : ''}${i.ref && i.ref.location ? ' · ' + esc(i.ref.location) : ''}</span>
            </div>
            <div class="list__side">${i.kind === 'event' ? `<button class="btn btn--sm btn--ghost" data-done-event="${i.id}">${i.done ? 'reabrir' : 'concluir'}</button>` : ''}</div>
          </div>`).join('')
        : '<p class="small muted">Dia livre.</p>'}
      </div>
    </div>`;
  }

  function dayModal(date) {
    const items = visible(date);
    UI.modal({
      title: U.fmtDate(date, 'full'), size: 'sm',
      body: `<div style="display:grid;gap:7px">${items.length ? items.map(i => `
        <div class="list__row" data-open-kind="${i.kind}" data-open-id="${i.id}" style="border-left:3px solid ${i.color};padding-left:9px">
          <div class="list__main"><span class="list__title">${esc(i.title)}</span>
          <span class="list__sub">${i.time ? esc(i.time) + ' · ' : ''}${esc(ST.label.eventType(i.type))}</span></div>
        </div>`).join('') : '<p class="small muted">Nada marcado neste dia.</p>'}</div>`,
      footer: ['spacer', { label: 'Adicionar evento', variant: 'primary', icon: 'plus', onClick: ({ close }) => { close(); App.forms.event(null, { date }); } }]
    });
  }

  App.views.calendar = {
    title: 'Agenda',
    subtitle: () => {
      const hoje = ST.dayAgenda(U.today()).length;
      const semana = U.sum([0, 1, 2, 3, 4, 5, 6].map(i => ST.dayAgenda(U.addDays(U.today(), i)).length));
      return `${hoje} compromisso(s) hoje · ${semana} nos próximos 7 dias`;
    },
    render(root, params) {
      if (params && params.date) state.cursor = U.startOfMonth(params.date);
      const label = state.mode === 'month' ? U.fmtDate(state.cursor, 'monthYear')
        : state.mode === 'week' ? 'Semana de ' + U.fmtDate(U.startOfWeek(state.cursor, 1))
        : 'Próximos 45 dias';

      root.innerHTML = `
        <div class="toolbar">
          ${state.mode !== 'agenda' ? `
            <button class="icon-btn" data-nav="-1" title="Anterior">${U.icon('chevronLeft')}</button>
            <button class="btn btn--sm" data-nav="0">Hoje</button>
            <button class="icon-btn" data-nav="1" title="Próximo">${U.icon('chevronRight')}</button>` : ''}
          <strong style="font-size:15px;margin-left:4px">${esc(label.charAt(0).toUpperCase() + label.slice(1))}</strong>
          <div class="spacer"></div>
          <select class="select" data-f="sector"><option value="">Todos os setores</option>
            ${ST.state.sectors.map(s => `<option value="${s.id}" ${state.sector === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
          <div class="pill-group">
            <button data-mode="month" class="${state.mode === 'month' ? 'is-active' : ''}">Mês</button>
            <button data-mode="week" class="${state.mode === 'week' ? 'is-active' : ''}">Semana</button>
            <button data-mode="agenda" class="${state.mode === 'agenda' ? 'is-active' : ''}">Agenda</button>
          </div>
          <button class="btn btn--primary btn--sm" data-new>${U.icon('plus', 'i--sm')}<span>Novo evento</span></button>
        </div>

        ${state.mode === 'month' ? monthGrid() : state.mode === 'week' ? weekList() : agendaList()}

        <div class="row small muted" style="margin-top:12px;gap:14px">
          ${ST.EVENT_TYPE.map(t => `<span class="legend__item"><span class="legend__swatch" style="background:${t.color}"></span>${esc(t.label)}</span>`).join('')}
          <span class="legend__item"><span class="legend__swatch" style="background:var(--critical)"></span>Prazo de demanda</span>
        </div>`;

      U.hydrateIcons(root);
      U.on(root, 'click', '[data-nav]', (ev, n) => {
        const dir = Number(n.dataset.nav);
        if (dir === 0) state.cursor = state.mode === 'month' ? U.startOfMonth(U.today()) : U.today();
        else state.cursor = state.mode === 'month' ? U.addMonths(state.cursor, dir) : U.addDays(state.cursor, dir * 7);
        App.render();
      });
      U.on(root, 'click', '[data-mode]', (ev, n) => { state.mode = n.dataset.mode; App.render(); });
      U.on(root, 'change', 'select[data-f]', (ev, n) => { state[n.dataset.f] = n.value; App.render(); });
      U.on(root, 'click', '[data-new]', () => App.forms.event(null, { date: state.mode === 'month' ? (state.cursor.slice(0, 7) === U.today().slice(0, 7) ? U.today() : state.cursor) : U.today() }));
      U.on(root, 'click', '[data-add-day]', (ev, n) => { ev.stopPropagation(); App.forms.event(null, { date: n.dataset.addDay }); });
      U.on(root, 'click', '[data-day-list]', (ev, n) => { ev.stopPropagation(); dayModal(n.dataset.dayList); });
      U.on(root, 'click', '[data-done-event]', (ev, n) => {
        ev.stopPropagation();
        const e = ST.get('events', n.dataset.doneEvent);
        ST.update('events', e.id, { done: !e.done });
      });
      U.on(root, 'click', '[data-open-id]', (ev, n) => {
        ev.stopPropagation();
        if (ev.target.closest('[data-done-event]')) return;
        const kind = n.dataset.openKind, id = n.dataset.openId;
        if (kind === 'meeting') App.views.meetings.detail(id);
        else if (kind === 'task') App.forms.task(id);
        else App.forms.event(id);
      });
      U.on(root, 'click', '.cal__day', (ev, n) => {
        if (ev.target.closest('[data-open-id],[data-add-day],[data-day-list]')) return;
        dayModal(n.dataset.day);
      });
    }
  };
  /* modal de dia precisa dos mesmos handlers */
  document.addEventListener('click', ev => {
    const node = ev.target.closest('#niaSheetRoot [data-open-id]');
    if (!node) return;
    const kind = node.dataset.openKind, id = node.dataset.openId;
    App.ui.closeTopModal();
    if (kind === 'meeting') App.views.meetings.detail(id);
    else if (kind === 'task') App.forms.task(id);
    else App.forms.event(id);
  });
})(window.App);
