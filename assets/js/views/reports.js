/* ============================================================
   views/reports.js — indicadores e relatório para a direção
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util, ST = App.store, UI = App.ui, C = App.charts;
  const { esc, el } = U;
  App.views = App.views || {};

  const state = { period: '90' };
  const from = () => U.addDays(U.today(), -Number(state.period));

  /* ---------- agregações ---------- */
  function agg() {
    const f = from(), t = U.today();
    const done = ST.doneBetween(f, t);
    const meets = ST.meetingsBetween(f, t);
    const logs = ST.state.timeLogs.filter(l => l.date >= f && l.date <= t);
    const newInsights = ST.state.insights.filter(i => String(i.createdAt || '').slice(0, 10) >= f);
    const converted = ST.state.insights.filter(i => i.status === 'convertido');
    return { f, t, done, meets, logs, newInsights, converted };
  }

  function weeklySeries(weeks) {
    const pts = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const s = U.addDays(U.startOfWeek(U.today(), 1), -7 * i);
      pts.push({ y: ST.doneBetween(s, U.addDays(s, 6)).length, label: U.fmtDate(s, 'short'), tipLabel: 'Semana de ' + U.fmtDate(s) });
    }
    return pts;
  }

  function sectorTable() {
    const f = from();
    const rows = ST.state.sectors.map(s => {
      const open = ST.state.tasks.filter(t => t.sectorId === s.id && t.status !== 'done').length;
      const done = ST.state.tasks.filter(t => t.sectorId === s.id && t.status === 'done' && String(t.completedAt || '').slice(0, 10) >= f).length;
      const meets = ST.state.meetings.filter(m => m.sectorId === s.id && m.date >= f).length;
      const lastMeet = ST.state.meetings.filter(m => m.sectorId === s.id).sort((a, b) => b.date.localeCompare(a.date))[0];
      const projs = ST.state.projects.filter(p => p.sectorId === s.id && p.status !== 'cancelado').length;
      const hours = U.sum(ST.state.projects.filter(p => p.sectorId === s.id && (p.stage === 'piloto' || p.stage === 'producao')).map(p => (p.impact || {}).hoursSavedMonth));
      const silent = !lastMeet || U.daysBetween(lastMeet.date, U.today()) > 45;
      return { s, open, done, meets, lastMeet, projs, hours, silent };
    }).sort((a, b) => (b.open + b.done) - (a.open + a.done));

    return `<div class="tbl-wrap"><table class="tbl">
      <thead><tr>
        <th>Setor</th><th class="num">Abertas</th><th class="num">Entregues</th>
        <th class="num">Reuniões</th><th>Último contato</th><th class="num">Projetos</th><th class="num">h/mês</th>
      </tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td><span class="chip"><span class="chip__dot" style="background:${r.s.color}"></span>${esc(r.s.name)}</span></td>
        <td class="num">${r.open}</td>
        <td class="num">${r.done}</td>
        <td class="num">${r.meets}</td>
        <td class="${r.silent ? '' : ''}">${r.lastMeet
          ? `<span class="${r.silent ? 'chip chip--warning' : 'muted small'}">${esc(U.fmtRelative(r.lastMeet.date))}</span>`
          : '<span class="chip chip--warning">nunca</span>'}</td>
        <td class="num">${r.projs}</td>
        <td class="num">${r.hours || '—'}</td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  /* O documento completo vive em report.js — aqui só o atalho. */
  const openReport = () => App.report.open();

  App.views.reports = {
    title: 'Relatórios',
    subtitle: () => 'Os números que provam o valor do seu trabalho',
    openReport,
    render(root) {
      const a = agg();
      const totalMin = U.sum(a.logs.map(l => l.minutes));

      /* entregas por setor */
      const bySector = ST.state.sectors.map(s => ({
        label: s.name, color: s.color, value: a.done.filter(t => t.sectorId === s.id).length
      })).filter(x => x.value > 0).sort((x, y) => y.value - x.value);

      /* tempo por setor */
      const timeBySector = ST.state.sectors.map(s => {
        const min = U.sum(a.logs.map(l => {
          const t = ST.get('tasks', l.taskId);
          return t && t.sectorId === s.id ? l.minutes : 0;
        }));
        return { label: s.name, color: s.color, value: Math.round(min / 60 * 10) / 10 };
      }).filter(x => x.value > 0).sort((x, y) => y.value - x.value);

      /* prioridade das entregas */
      const byPriority = ST.PRIORITY.map((p, i) => ({
        label: p.label, color: ST.SERIES[i % 8], value: a.done.filter(t => t.priority === p.id).length
      }));

      /* reuniões por tipo */
      const byType = ST.MEETING_TYPE.map(mt => ({
        label: mt.label, value: a.meets.filter(m => m.type === mt.id).length
      })).filter(x => x.value > 0).sort((x, y) => y.value - x.value);

      const convRate = ST.state.insights.length ? U.pct(ST.state.insights.filter(i => i.status === 'convertido').length, ST.state.insights.length) : 0;
      const openAvgAge = (() => {
        const open = ST.openTasks();
        if (!open.length) return 0;
        return Math.round(U.sum(open.map(t => U.daysBetween(String(t.createdAt || '').slice(0, 10), U.today()))) / open.length);
      })();

      root.innerHTML = `
        <div class="toolbar">
          <span class="small muted">Período:</span>
          <div class="pill-group">
            ${[['30', '30 dias'], ['90', '90 dias'], ['180', '6 meses'], ['365', '1 ano']].map(p =>
              `<button data-period="${p[0]}" class="${state.period === p[0] ? 'is-active' : ''}">${p[1]}</button>`).join('')}
          </div>
          <div class="spacer"></div>
          <button class="btn btn--sm" data-print>${U.icon('printer', 'i--sm')}<span>Imprimir</span></button>
          <button class="btn btn--primary btn--sm" data-report>${U.icon('printer', 'i--sm')}<span>Relatório para a gestão</span></button>
        </div>

        <div class="grid grid--stats" style="margin-bottom:16px">
          <div class="stat"><span class="stat__label">Entregas no período</span><span class="stat__value">${a.done.length}</span>
            <span class="stat__meta">${(a.done.length / (Number(state.period) / 7)).toFixed(1)} por semana</span></div>
          <div class="stat"><span class="stat__label">Tempo registrado</span><span class="stat__value" style="font-size:25px">${esc(U.fmtDuration(totalMin))}</span>
            <span class="stat__meta">${a.logs.length} registro(s)</span></div>
          <div class="stat"><span class="stat__label">Reuniões</span><span class="stat__value">${a.meets.length}</span>
            <span class="stat__meta">${U.fmtDuration(U.sum(a.meets.map(m => m.durationMin)))} em sala</span></div>
          <div class="stat"><span class="stat__label">Insights → entregas</span><span class="stat__value">${convRate}<small>%</small></span>
            <span class="stat__meta">${a.newInsights.length} novos no período</span></div>
          <div class="stat"><span class="stat__label">Idade média das abertas</span><span class="stat__value">${openAvgAge}<small> dias</small></span>
            <span class="stat__meta">${ST.overdueTasks().length} em atraso</span></div>
        </div>

        <div class="grid grid--2">
          <div class="card"><div class="card__head"><div><h3>Ritmo de entregas</h3><p>Demandas concluídas por semana</p></div></div>
            <div class="card__body">${C.lineArea([{ name: 'Entregas', color: 'var(--s1)', points: weeklySeries(Math.min(26, Math.ceil(Number(state.period) / 7))) }], { height: 210 })}</div></div>
          <div class="card"><div class="card__head"><div><h3>Entregas por setor</h3><p>Quem mais recebeu do seu trabalho</p></div></div>
            <div class="card__body">${bySector.length ? C.barsH(bySector, { valueLabel: 'Entregas' }) : '<p class="small muted">Sem entregas no período.</p>'}</div></div>
        </div>

        <div class="grid grid--2">
          <div class="card"><div class="card__head"><div><h3>Tempo dedicado por setor</h3><p>Horas registradas — onde seu tempo realmente foi</p></div></div>
            <div class="card__body">${timeBySector.length ? C.barsH(timeBySector, { valueLabel: 'Horas', format: v => v + 'h' })
              : '<p class="small muted">Nenhum tempo registrado. Use “Registrar tempo” no menu de cada demanda para descobrir onde suas horas vão.</p>'}</div></div>
          <div class="card"><div class="card__head"><div><h3>Perfil das entregas</h3><p>Por prioridade</p></div></div>
            <div class="card__body">${C.donut(byPriority, { size: 160, centerValue: a.done.length, centerLabel: 'entregas', valueLabel: 'Entregas' })}</div></div>
        </div>

        <div class="grid grid--2">
          <div class="card"><div class="card__head"><div><h3>Natureza das reuniões</h3><p>Como você usa o tempo com os setores</p></div></div>
            <div class="card__body">${byType.length ? C.barsH(byType, { valueLabel: 'Reuniões' }) : '<p class="small muted">Sem reuniões no período.</p>'}</div></div>
          <div class="card"><div class="card__head"><div><h3>Impacto por projeto</h3><p>Somente piloto e produção contam horas</p></div></div>
            <div class="card__body">${(() => {
              const items = ST.state.projects.filter(p => (p.impact || {}).hoursSavedMonth > 0)
                .map(p => ({ label: p.name, value: p.impact.hoursSavedMonth, color: ST.sectorColor(p.sectorId), meta: ST.label.stage(p.stage) }))
                .sort((x, y) => y.value - x.value);
              return items.length ? C.barsH(items, { valueLabel: 'Horas/mês', format: v => v + 'h', labelWidth: '42%' })
                : '<p class="small muted">Preencha o impacto esperado dos projetos para acompanhar aqui.</p>';
            })()}</div></div>
        </div>

        <div class="card">
          <div class="card__head"><div><h3>Cobertura dos setores</h3><p>Um engenheiro de IA que só atende quem grita vira refém da urgência alheia</p></div></div>
          <div class="card__body">${sectorTable()}</div>
        </div>`;

      U.hydrateIcons(root);
      U.on(root, 'click', '[data-period]', (ev, n) => { state.period = n.dataset.period; App.render(); });
      U.on(root, 'click', '[data-report]', () => openReport());
      U.on(root, 'click', '[data-print]', () => window.print());
    }
  };
})(window.App);
