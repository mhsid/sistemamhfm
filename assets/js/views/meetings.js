/* ============================================================
   views/meetings.js — registro e memória das reuniões
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util, ST = App.store, UI = App.ui, C = App.charts;
  const { esc, el } = U;
  App.views = App.views || {};

  const state = { q: '', sector: '', type: '', period: '90' };

  function filtered() {
    let list = ST.state.meetings.slice();
    if (state.q) {
      const q = U.norm(state.q);
      list = list.filter(m => U.norm([m.title, m.notes, m.agenda, (m.participants || []).join(' '), (m.decisions || []).join(' ')].join(' ')).includes(q));
    }
    if (state.sector) list = list.filter(m => m.sectorId === state.sector);
    if (state.type) list = list.filter(m => m.type === state.type);
    if (state.period !== 'all') {
      const from = U.addDays(U.today(), -Number(state.period));
      list = list.filter(m => m.date >= from);
    }
    return list.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
  }

  /* ============================================================
     DETALHE
     ============================================================ */
  function detail(id) {
    const m = ST.get('meetings', id);
    if (!m) return;
    const linkedTasks = (m.taskIds || []).map(tid => ST.get('tasks', tid)).filter(Boolean);
    const linkedInsights = (m.insightIds || []).map(iid => ST.get('insights', iid)).filter(Boolean);
    const mood = ST.MOODS.find(x => x.id === (m.mood || 3)) || ST.MOODS[2];

    const body = el('div', { html: `
      <div class="row" style="gap:7px;margin-bottom:14px">
        ${UI.sectorChip(m.sectorId) || '<span class="chip">Vários setores</span>'}
        <span class="chip">${esc(ST.label.meetingType(m.type))}</span>
        <span class="chip">${U.icon('calendar', 'i--sm')} ${esc(U.fmtDate(m.date, 'full'))}</span>
        ${m.time ? `<span class="chip">${U.icon('clock', 'i--sm')} ${esc(m.time)}${m.durationMin ? ' · ' + esc(U.fmtDuration(m.durationMin)) : ''}</span>` : ''}
        <span class="chip" title="Como você avaliou a reunião">${mood.emoji} ${esc(mood.label)}</span>
      </div>

      ${(m.participants || []).length ? `<div class="section-title">Quem participou</div>
        <div class="row" style="gap:6px;margin-bottom:14px">${m.participants.map(p => `<span class="chip">${esc(p)}</span>`).join('')}</div>` : ''}

      ${m.agenda ? `<div class="section-title">Pauta</div><div class="md">${U.markdown(m.agenda)}</div><div class="divider"></div>` : ''}

      <div class="section-title">Anotações</div>
      <div class="md">${U.markdown(m.notes) || '<p class="muted small">Sem anotações.</p>'}</div>

      ${(m.decisions || []).length ? `<div class="divider"></div><div class="section-title">Decisões</div>
        <div style="display:grid;gap:6px">${m.decisions.map(dec => `
          <div class="list__row" style="cursor:default">
            <span style="color:var(--good)">${U.icon('check', 'i--sm')}</span>
            <div class="list__main"><span class="list__title" style="white-space:normal">${esc(dec)}</span></div>
            <button class="btn btn--sm" data-dec-task="${esc(dec)}">virar demanda</button>
          </div>`).join('')}</div>` : ''}

      <div class="divider"></div>
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <div class="section-title" style="margin:0">Desdobramentos</div>
        <div class="row" style="gap:6px">
          <button class="btn btn--sm" data-new-task>${U.icon('plus', 'i--sm')}<span>Demanda</span></button>
          <button class="btn btn--sm" data-new-insight>${U.icon('bulb', 'i--sm')}<span>Insight</span></button>
        </div>
      </div>
      <div style="display:grid;gap:4px">
        ${linkedTasks.map(t => `<div class="list__row" data-task-open="${t.id}">
            <div class="list__main"><span class="list__title ${t.status === 'done' ? 'is-done' : ''}">${esc(t.title)}</span>
            <span class="list__sub">${t.due ? 'prazo ' + esc(U.fmtRelative(t.due)) : 'sem prazo'}</span></div>
            <div class="list__side">${UI.statusChip(t.status)}</div></div>`).join('')}
        ${linkedInsights.map(i => `<div class="list__row" data-insight-open="${i.id}">
            <div class="list__main"><span class="list__title">💡 ${esc(i.title)}</span>
            <span class="list__sub">impacto ${i.impact}/5 · esforço ${i.effort}/5</span></div>
            <div class="list__side"><span class="chip">${esc(ST.label.insight(i.status))}</span></div></div>`).join('')}
        ${!linkedTasks.length && !linkedInsights.length ? '<p class="small muted">Nada saiu desta reunião ainda. Se foi só conversa, tudo bem — mas se ficou algo combinado, registre agora.</p>' : ''}
      </div>

      ${m.followUpDate ? `<div class="divider"></div>
        <div class="row" style="gap:8px"><span class="chip chip--accent">${U.icon('bell', 'i--sm')} Retorno combinado para ${esc(U.fmtDate(m.followUpDate))} (${esc(U.fmtRelative(m.followUpDate))})</span></div>` : ''}` });

    const modal = UI.modal({
      title: m.title, size: 'wide',
      subtitle: U.fmtDate(m.date, 'full') + (m.time ? ' às ' + m.time : ''),
      body,
      footer: [
        { label: 'Editar', icon: 'edit', onClick: ({ close }) => { close(); App.forms.meeting(id); } },
        { label: 'Copiar resumo', icon: 'copy', onClick: () => copySummary(m) },
        'spacer',
        { label: 'Fechar', variant: 'primary', onClick: ({ close }) => close() }
      ]
    });

    const link = (field, newId) => {
      const arr = (m[field] || []).concat([newId]);
      ST.update('meetings', id, { [field]: arr });
    };

    U.on(body, 'click', '[data-new-task]', () => {
      modal.close();
      const form = App.forms.task(null, { sectorId: m.sectorId, sourceType: 'meeting', sourceId: id });
      afterCreate('tasks', tid => { link('taskIds', tid); });
    });
    U.on(body, 'click', '[data-dec-task]', (ev, n) => {
      modal.close();
      App.forms.task(null, { title: n.dataset.decTask, sectorId: m.sectorId, sourceType: 'meeting', sourceId: id });
      afterCreate('tasks', tid => link('taskIds', tid));
    });
    U.on(body, 'click', '[data-new-insight]', () => {
      modal.close();
      App.forms.insight(null, { sectorId: m.sectorId, source: 'Reunião: ' + m.title });
      afterCreate('insights', iid => link('insightIds', iid));
    });
    U.on(body, 'click', '[data-task-open]', (ev, n) => { modal.close(); App.forms.task(n.dataset.taskOpen); });
    U.on(body, 'click', '[data-insight-open]', (ev, n) => { modal.close(); App.forms.insight(n.dataset.insightOpen); });
  }

  /** Observa a próxima inserção em uma coleção para criar o vínculo. */
  function afterCreate(collection, fn) {
    const before = ST.state[collection].length;
    const off = ST.subscribe(() => {
      if (ST.state[collection].length > before) {
        off();
        fn(ST.state[collection][0].id);
      }
    });
    setTimeout(off, 600000);
  }

  function copySummary(m) {
    const txt = [
      m.title,
      U.fmtDate(m.date, 'full') + (m.time ? ' às ' + m.time : '') + (m.durationMin ? ' · ' + U.fmtDuration(m.durationMin) : ''),
      'Setor: ' + ST.sectorName(m.sectorId),
      (m.participants || []).length ? 'Participantes: ' + m.participants.join(', ') : '',
      '', 'ANOTAÇÕES', m.notes || '—',
      (m.decisions || []).length ? '\nDECISÕES\n' + m.decisions.map(d => '- ' + d).join('\n') : '',
      m.followUpDate ? '\nRetorno combinado: ' + U.fmtDate(m.followUpDate) : ''
    ].filter(x => x !== '').join('\n');
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(
      () => UI.toast('Resumo copiado ✓', 'good'),
      () => UI.toast('Não consegui copiar', 'bad'));
  }

  /* ---------- view ---------- */
  App.views.meetings = {
    title: 'Reuniões',
    subtitle: () => {
      const from = U.addDays(U.today(), -30);
      const n = ST.state.meetings.filter(m => m.date >= from).length;
      const mins = U.sum(ST.state.meetings.filter(m => m.date >= from).map(m => m.durationMin));
      return `${n} nos últimos 30 dias · ${U.fmtDuration(mins)} em reunião`;
    },
    detail,
    render(root, params) {
      if (params && params.open) setTimeout(() => detail(params.open), 60);
      const list = filtered();
      const o = (arr, sel, blank) => `<option value="">${esc(blank)}</option>` +
        arr.map(x => `<option value="${esc(x.id)}" ${x.id === sel ? 'selected' : ''}>${esc(x.name || x.label)}</option>`).join('');

      /* por setor nos últimos 90 dias */
      const from90 = U.addDays(U.today(), -90);
      const bySector = ST.state.sectors.map(s => ({
        label: s.name, color: s.color,
        value: ST.state.meetings.filter(m => m.sectorId === s.id && m.date >= from90).length
      })).filter(x => x.value > 0).sort((a, b) => b.value - a.value);

      /* reuniões por mês, últimos 6 meses */
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const ref = U.addMonths(U.today(), -i);
        const start = U.startOfMonth(ref), end = U.endOfMonth(ref);
        months.push({
          label: U.MONTHS_SHORT[U.parseISO(start).getMonth()],
          value: ST.state.meetings.filter(m => m.date >= start && m.date <= end).length
        });
      }

      const groups = U.groupBy(list, m => m.date.slice(0, 7));

      root.innerHTML = `
        <div class="toolbar">
          <div class="search-input">${U.icon('search', 'i--sm')}
            <input class="input" type="search" placeholder="Buscar em anotações, decisões, participantes…" value="${esc(state.q)}" data-f="q"></div>
          <select class="select" data-f="sector">${o(ST.state.sectors, state.sector, 'Todos os setores')}</select>
          <select class="select" data-f="type">${o(ST.MEETING_TYPE, state.type, 'Todos os tipos')}</select>
          <select class="select" data-f="period">
            <option value="30" ${state.period === '30' ? 'selected' : ''}>Últimos 30 dias</option>
            <option value="90" ${state.period === '90' ? 'selected' : ''}>Últimos 90 dias</option>
            <option value="365" ${state.period === '365' ? 'selected' : ''}>Último ano</option>
            <option value="all" ${state.period === 'all' ? 'selected' : ''}>Tudo</option>
          </select>
          <div class="spacer"></div>
          <button class="btn btn--primary btn--sm" data-new>${U.icon('plus', 'i--sm')}<span>Registrar reunião</span></button>
        </div>

        <div class="grid grid--2" style="margin-bottom:16px">
          <div class="card"><div class="card__head"><div><h3>Presença por setor</h3><p>Reuniões nos últimos 90 dias — quem você está deixando de ouvir?</p></div></div>
            <div class="card__body">${bySector.length ? C.barsH(bySector, { valueLabel: 'Reuniões' }) : '<p class="small muted">Sem reuniões no período.</p>'}</div></div>
          <div class="card"><div class="card__head"><div><h3>Cadência mensal</h3><p>Últimos 6 meses</p></div></div>
            <div class="card__body">${C.columns(months, { height: 180, valueLabel: 'Reuniões' })}</div></div>
        </div>

        ${list.length ? Object.keys(groups).sort().reverse().map(month => `
          <div style="margin-bottom:18px">
            <div class="section-title">${esc(U.fmtDate(month + '-01', 'monthYear'))} · ${groups[month].length} reunião(ões)</div>
            <div class="grid grid--2">
              ${groups[month].map(m => `
                <article class="card" data-meeting="${m.id}" style="cursor:pointer">
                  <div class="card__body" style="display:grid;gap:9px">
                    <div class="row" style="gap:6px">
                      ${UI.sectorChip(m.sectorId) || '<span class="chip">Vários setores</span>'}
                      <span class="chip">${esc(ST.label.meetingType(m.type))}</span>
                      <div class="spacer"></div>
                      <span class="small muted tnum">${esc(U.fmtDate(m.date, 'short'))}${m.time ? ' · ' + esc(m.time) : ''}</span>
                    </div>
                    <h3 style="font-size:14.5px">${esc(m.title)}</h3>
                    <p class="small muted" style="display:-webkit-box;-webkit-line-clamp:3;line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap">${esc(U.stripMd(m.notes || m.agenda || 'Sem anotações.'))}</p>
                    <div class="row small muted" style="gap:12px">
                      ${(m.participants || []).length ? `<span>${U.icon('users', 'i--sm')} ${m.participants.length}</span>` : ''}
                      ${(m.decisions || []).length ? `<span>${U.icon('check', 'i--sm')} ${m.decisions.length} decisão(ões)</span>` : ''}
                      ${(m.taskIds || []).length ? `<span>${U.icon('kanban', 'i--sm')} ${m.taskIds.length} demanda(s)</span>` : ''}
                      ${(m.insightIds || []).length ? `<span>${U.icon('bulb', 'i--sm')} ${m.insightIds.length}</span>` : ''}
                      ${m.followUpDate && m.followUpDate >= U.today() ? `<span class="chip chip--accent" style="font-size:10px">retorno ${esc(U.fmtRelative(m.followUpDate))}</span>` : ''}
                    </div>
                  </div>
                </article>`).join('')}
            </div>
          </div>`).join('')
        : `<div class="card"><div class="card__body">${UI.emptyState('👥', 'Nenhuma reunião registrada', 'Toda conversa com um setor é matéria-prima. Registre logo depois — em 24h você já esqueceu metade.')}</div></div>`}`;

      U.hydrateIcons(root);
      U.on(root, 'input', 'input[data-f]', U.debounce((ev, n) => { state[n.dataset.f] = n.value; App.render(); }, 220));
      U.on(root, 'change', 'select[data-f]', (ev, n) => { state[n.dataset.f] = n.value; App.render(); });
      U.on(root, 'click', '[data-new]', () => App.forms.meeting());
      U.on(root, 'click', '[data-meeting]', UI.guard((ev, n) => detail(n.dataset.meeting), 'abrir a reunião'));
    }
  };
})(window.App);
