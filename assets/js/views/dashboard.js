/* ============================================================
   views/dashboard.js — painel principal
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util, ST = App.store, C = App.charts, UI = App.ui;
  const { esc } = U;
  App.views = App.views || {};

  /* ---------- séries de apoio ---------- */
  function weeklyThroughput(weeks) {
    const out = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const start = U.addDays(U.startOfWeek(U.today(), 1), -7 * i);
      const end = U.addDays(start, 6);
      out.push({
        y: ST.doneBetween(start, end).length,
        label: U.fmtDate(start, 'short'),
        tipLabel: 'Semana de ' + U.fmtDate(start)
      });
    }
    return out;
  }
  function activityMap() {
    const map = {};
    const bump = (date, n) => { if (date) map[String(date).slice(0, 10)] = (map[String(date).slice(0, 10)] || 0) + (n || 1); };
    ST.state.tasks.forEach(t => { if (t.completedAt) bump(t.completedAt, 2); });
    ST.state.meetings.forEach(m => bump(m.date, 2));
    ST.state.journal.forEach(j => bump(j.date, 1));
    ST.state.insights.forEach(i => bump(i.createdAt, 1));
    ST.state.notes.forEach(n => bump(n.updatedAt, 1));
    ST.state.timeLogs.forEach(l => bump(l.date, 1));
    return map;
  }

  /* ---------- blocos ---------- */
  function statTiles() {
    const open = ST.openTasks(), overdue = ST.overdueTasks();
    const from = U.startOfWeek(U.today(), 1);
    const doneWeek = ST.doneBetween(from, U.today()).length;
    const prevStart = U.addDays(from, -7), prevEnd = U.addDays(from, -1);
    const donePrev = ST.doneBetween(prevStart, prevEnd).length;
    const delta = doneWeek - donePrev;
    const spark = weeklyThroughput(12).map(p => p.y);
    const hours = ST.impactHoursMonth();
    const goalH = ST.settings.goals.hoursSavedMonth || 40;

    return `
    <div class="grid grid--stats">
      <div class="stat ${overdue.length ? 'stat--alert' : ''}">
        <span class="stat__label">${U.icon('inbox', 'i--sm')} Demandas abertas</span>
        <span class="stat__value">${open.length}</span>
        <span class="stat__meta">${overdue.length
          ? `<span class="stat__delta stat__delta--down">${U.icon('alert', 'i--sm')} ${overdue.length} em atraso</span>`
          : '<span class="stat__delta stat__delta--up">nenhuma atrasada</span>'}</span>
      </div>
      <div class="stat">
        <span class="stat__label">${U.icon('check', 'i--sm')} Entregas nesta semana</span>
        <span class="stat__value">${doneWeek}<small> / ${ST.settings.goals.tasksPerWeek || 8}</small></span>
        <span class="stat__meta">${delta === 0 ? 'igual à semana passada'
          : `<span class="stat__delta stat__delta--${delta > 0 ? 'up' : 'down'}">${delta > 0 ? '↑' : '↓'} ${Math.abs(delta)}</span> vs. semana passada`}</span>
        <div class="stat__spark">${C.sparkline(spark, { color: 'var(--accent)' })}</div>
      </div>
      <div class="stat">
        <span class="stat__label">${U.icon('rocket', 'i--sm')} Projetos ativos</span>
        <span class="stat__value">${ST.activeProjects().length}</span>
        <span class="stat__meta">${ST.state.projects.filter(p => p.stage === 'producao').length} em produção · ${ST.state.projects.filter(p => p.stage === 'piloto').length} em piloto</span>
      </div>
      <div class="stat stat--accent">
        <span class="stat__label">${U.icon('zap', 'i--sm')} Horas devolvidas/mês</span>
        <span class="stat__value">${U.fmtNumber(hours)}<small>h</small></span>
        <span class="stat__meta">${ST.peopleImpacted()} pessoas impactadas · meta ${goalH}h</span>
      </div>
    </div>`;
  }

  function focusCard() {
    const top = ST.prioritized(4);
    const agenda = ST.dayAgenda(U.today());
    const j = ST.journalOf(U.today());

    const agendaHtml = agenda.length ? `<div class="timeline">${agenda.map(i => `
        <div class="tl-item ${i.time && i.time <= U.nowTime() ? '' : 'is-accent'}" data-agenda-kind="${i.kind}" data-agenda-id="${i.id}" style="cursor:pointer">
          <span class="tl-item__time">${i.time ? esc(i.time) : (i.kind === 'task' ? 'prazo' : 'dia todo')}</span>
          <span class="tl-item__title">${esc(i.title)}</span>
          <span class="tl-item__sub">${i.sectorId ? esc(ST.sectorName(i.sectorId)) : ''}${i.kind === 'meeting' ? ' · reunião' : i.kind === 'task' ? ' · vence hoje' : ''}</span>
        </div>`).join('')}</div>`
      : `<p class="small muted" style="padding:8px 0">Agenda livre hoje. Bom dia para trabalho profundo — que tal reservar um bloco de foco?</p>
         <button class="btn btn--sm" data-act="new-event">${U.icon('plus', 'i--sm')}<span>Criar bloco de foco</span></button>`;

    const topHtml = top.length ? top.map((t, i) => `
      <div class="list__row" data-task-open="${t.id}">
        <span style="width:22px;height:22px;flex:none;border-radius:99px;display:grid;place-items:center;font-size:11px;font-weight:700;background:${i === 0 ? 'var(--accent)' : 'var(--sunken)'};color:${i === 0 ? 'var(--accent-ink)' : 'var(--ink-3)'}">${i + 1}</span>
        <div class="list__main">
          <span class="list__title list__title--wrap">${esc(t.title)}</span>
          <span class="list__sub">${t.sectorId ? esc(ST.sectorName(t.sectorId)) : 'sem setor'}${t.due ? ' · prazo ' + esc(U.fmtRelative(t.due)) : ''}${t.estimateH ? ' · ~' + t.estimateH + 'h' : ''}</span>
        </div>
        <div class="list__side">${UI.priorityChip(t.priority)}${UI.dueChip(t.due, t.status)}</div>
      </div>`).join('')
      : `<div class="empty" style="padding:22px"><div class="empty__icon">🌤️</div><p>Nenhuma demanda aberta. Momento raro — aproveite.</p></div>`;

    return `
    <div class="grid grid--wide">
      <div class="card">
        <div class="card__head">
          <div><h3>Prioridades de hoje</h3><p>Ordenadas por prazo, prioridade e envelhecimento</p></div>
          <div class="card__actions"><button class="btn btn--sm" data-act="new-task">${U.icon('plus', 'i--sm')}<span>Nova</span></button></div>
        </div>
        <div class="card__body"><div class="list">${topHtml}</div></div>
      </div>
      <div class="stack">
        <div class="card">
          <div class="card__head"><div><h3>Hoje na agenda</h3><p>${esc(U.fmtDate(U.today(), 'full'))}</p></div></div>
          <div class="card__body">${agendaHtml}</div>
        </div>
        <div class="card" style="${j ? '' : 'border-color:var(--accent-line)'}">
          <div class="card__body" style="display:grid;gap:9px">
            <div class="row" style="gap:8px">
              <span style="font-size:20px">${j ? '📓' : '✍️'}</span>
              <div style="flex:1">
                <strong style="font-size:13.5px">${j ? 'Diário de hoje registrado' : 'Ainda não escreveu hoje'}</strong>
                <div class="small muted">${j ? esc(U.stripMd(j.focus || j.wins || '').slice(0, 70) || 'Registro salvo') : 'Cinco minutos agora poupam meses de esquecimento'}</div>
              </div>
            </div>
            <button class="btn btn--sm ${j ? '' : 'btn--primary'} btn--block" data-act="journal">${j ? 'Revisar registro do dia' : 'Registrar o dia'}</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function chartsRow() {
    const statusItems = ST.TASK_STATUS.filter(s => s.id !== 'done').map(s => ({
      label: s.label, value: ST.tasksByStatus(s.id).length, color: s.series
    }));
    const openTotal = U.sum(statusItems.map(i => i.value));

    return `
    <div class="grid grid--2">
      <div class="card">
        <div class="card__head"><div><h3>Ritmo de entregas</h3><p>Demandas concluídas por semana, últimas 12 semanas</p></div></div>
        <div class="card__body">${C.lineArea([{ name: 'Entregas', color: 'var(--s1)', points: weeklyThroughput(12) }], { height: 200 })}</div>
      </div>
      <div class="card">
        <div class="card__head"><div><h3>Onde o trabalho está parado</h3><p>Demandas abertas por situação</p></div></div>
        <div class="card__body">${C.donut(statusItems, { centerValue: openTotal, centerLabel: 'abertas', valueLabel: 'Demandas' })}</div>
      </div>
    </div>`;
  }

  function sectorsRow() {
    const sectors = ST.state.sectors.map(s => ({
      label: s.name,
      parts: ST.TASK_STATUS.filter(st => st.id !== 'done').map(st => ({
        key: st.label, color: st.series,
        value: ST.state.tasks.filter(t => t.sectorId === s.id && t.status === st.id).length
      }))
    })).filter(r => U.sum(r.parts.map(p => p.value)) > 0)
      .sort((a, b) => U.sum(b.parts.map(p => p.value)) - U.sum(a.parts.map(p => p.value)));

    const legend = ST.TASK_STATUS.filter(s => s.id !== 'done').map(s => ({ label: s.label, color: s.series }));

    const stages = ST.PROJECT_STAGE.map(s => ({
      label: s.label, hint: s.hint,
      value: ST.state.projects.filter(p => p.stage === s.id && p.status !== 'cancelado').length
    }));

    return `
    <div class="grid grid--2">
      <div class="card">
        <div class="card__head">
          <div><h3>Demanda aberta por setor</h3><p>Quem está esperando você agora</p></div>
          <div class="card__actions"><button class="link-btn" data-go="reports">ver detalhes</button></div>
        </div>
        <div class="card__body">${sectors.length ? C.barsStacked(sectors, legend) : '<p class="small muted">Nenhuma demanda aberta por setor.</p>'}</div>
      </div>
      <div class="card">
        <div class="card__head"><div><h3>Pipeline de projetos</h3><p>Da descoberta à produção</p></div>
          <div class="card__actions"><button class="link-btn" data-go="projects">ver projetos</button></div></div>
        <div class="card__body">${C.funnel(stages)}</div>
      </div>
    </div>`;
  }

  function bottomRow() {
    const g = ST.settings.goals;
    const from = U.startOfWeek(U.today(), 1);
    const doneWeek = ST.doneBetween(from, U.today()).length;
    const meetWeek = ST.meetingsBetween(from, U.today()).length;

    const recentMeetings = ST.state.meetings.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
    const recentInsights = ST.state.insights.slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 4);

    return `
    <div class="grid grid--2">
      <div class="card">
        <div class="card__head"><div><h3>Constância</h3><p>Cada quadrado é um dia com registro no sistema</p></div>
          <div class="card__actions"><span class="chip chip--accent">🔥 ${ST.streak()} dias seguidos</span></div></div>
        <div class="card__body">${C.heatmap(activityMap(), { valueLabel: 'Atividades' })}</div>
      </div>
      <div class="card">
        <div class="card__head"><div><h3>Metas da semana e do mês</h3><p>Combinadas por você nas configurações</p></div></div>
        <div class="card__body" style="display:grid;gap:15px">
          ${C.meter(doneWeek, g.tasksPerWeek || 8, { label: 'Entregas na semana' })}
          ${C.meter(meetWeek, g.meetingsPerWeek || 4, { label: 'Reuniões na semana' })}
          ${C.meter(ST.impactHoursMonth(), g.hoursSavedMonth || 40, { label: 'Horas devolvidas por mês', valueText: U.fmtNumber(ST.impactHoursMonth()) + 'h / ' + (g.hoursSavedMonth || 40) + 'h' })}
        </div>
      </div>
    </div>

    <div class="grid grid--2">
      <div class="card">
        <div class="card__head"><div><h3>Últimas reuniões</h3></div>
          <div class="card__actions"><button class="link-btn" data-go="meetings">ver todas</button></div></div>
        <div class="card__body"><div class="list">${recentMeetings.length ? recentMeetings.map(m => `
          <div class="list__row" data-meeting-open="${m.id}">
            <div class="list__main">
              <span class="list__title">${esc(m.title)}</span>
              <span class="list__sub">${esc(U.fmtDate(m.date, 'medium'))} · ${esc(ST.sectorName(m.sectorId))} · ${(m.decisions || []).length} decisão(ões)</span>
            </div>
            <div class="list__side">${UI.sectorChip(m.sectorId)}</div>
          </div>`).join('') : '<p class="small muted">Nenhuma reunião registrada ainda.</p>'}</div></div>
      </div>
      <div class="card">
        <div class="card__head"><div><h3>Insights recentes</h3></div>
          <div class="card__actions"><button class="link-btn" data-go="insights">ver todos</button></div></div>
        <div class="card__body"><div class="list">${recentInsights.length ? recentInsights.map(i => `
          <div class="list__row" data-insight-open="${i.id}">
            <div class="list__main">
              <span class="list__title">${esc(i.title)}</span>
              <span class="list__sub">impacto ${i.impact}/5 · esforço ${i.effort}/5 · ${esc(ST.label.insight(i.status))}</span>
            </div>
            <div class="list__side">${UI.sectorChip(i.sectorId)}</div>
          </div>`).join('') : '<p class="small muted">Nenhum insight registrado ainda.</p>'}</div></div>
      </div>
    </div>`;
  }

  /* ---------- view ---------- */
  App.views.dashboard = {
    title: 'Painel',
    subtitle: () => U.greeting() + (ST.settings.userName ? ', ' + ST.settings.userName.split(' ')[0] : '') + ' · ' + U.fmtDate(U.today(), 'full'),
    render(root) {
      root.innerHTML = `<div class="stack">
        ${statTiles()}
        ${focusCard()}
        ${chartsRow()}
        ${sectorsRow()}
        ${bottomRow()}
      </div>`;
      U.hydrateIcons(root);

      U.on(root, 'click', '[data-task-open]', (e, n) => App.forms.task(n.dataset.taskOpen));
      U.on(root, 'click', '[data-meeting-open]', (e, n) => App.views.meetings.detail(n.dataset.meetingOpen));
      U.on(root, 'click', '[data-insight-open]', (e, n) => App.forms.insight(n.dataset.insightOpen));
      U.on(root, 'click', '[data-go]', (e, n) => App.go(n.dataset.go));
      U.on(root, 'click', '[data-act="new-task"]', () => App.forms.task());
      U.on(root, 'click', '[data-act="new-event"]', () => App.forms.event(null, { type: 'foco', time: '08:00', endTime: '10:00' }));
      U.on(root, 'click', '[data-act="journal"]', () => App.forms.journal());
      U.on(root, 'click', '[data-agenda-id]', (e, n) => {
        const kind = n.dataset.agendaKind, id = n.dataset.agendaId;
        if (kind === 'meeting') App.views.meetings.detail(id);
        else if (kind === 'task') App.forms.task(id);
        else App.forms.event(id);
      });
    }
  };
})(window.App);
