/* ============================================================
   report.js — Relatório para a gestão

   Monta um documento apresentável a partir do que já está registrado:
   projetos (problema, solução, impacto, marcos, diário), demandas
   entregues, reuniões e decisões, insights, cobertura por setor,
   riscos e próximos passos. Nada aqui é texto genérico: se um dado
   não existe, a seção correspondente simplesmente não aparece.
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util, ST = App.store, UI = App.ui, C = App.charts;
  const { esc, el } = U;

  const DOC_WIDTH = 720; // largura útil do documento, em px — gráficos são desenhados nela

  /* ============================================================
     1. COLETA — tudo que o período contém
     ============================================================ */
  function collect(from, to) {
    const inRange = d => d && d >= from && d <= to;

    const done = ST.state.tasks
      .filter(t => t.status === 'done' && inRange(String(t.completedAt || '').slice(0, 10)))
      .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));

    const meetings = ST.state.meetings.filter(m => inRange(m.date))
      .sort((a, b) => b.date.localeCompare(a.date));

    const logs = ST.state.timeLogs.filter(l => inRange(l.date));

    const projects = ST.state.projects.filter(p => p.status !== 'cancelado');
    const live = projects.filter(p => p.stage === 'producao');
    const pilots = projects.filter(p => p.stage === 'piloto');
    const building = projects.filter(p => ['descoberta', 'desenho', 'desenvolvimento'].indexOf(p.stage) >= 0 && p.status === 'ativo');

    /* atualizações de projeto datadas dentro do período — a narrativa real do avanço */
    const updates = [];
    projects.forEach(p => (p.updates || []).forEach(up => {
      if (inRange(up.date)) updates.push({ project: p, date: up.date, text: up.text });
    }));
    updates.sort((a, b) => b.date.localeCompare(a.date));

    const decisions = [];
    meetings.forEach(m => (m.decisions || []).forEach(d => decisions.push({ meeting: m, text: d })));

    const insightsNew = ST.state.insights.filter(i => inRange(String(i.createdAt || '').slice(0, 10)));
    const insightsConverted = ST.state.insights.filter(i => i.status === 'convertido');
    const opportunities = ST.state.insights
      .filter(i => (i.status === 'novo' || i.status === 'aprovado') && i.impact >= 4)
      .sort((a, b) => (b.impact - b.effort) - (a.impact - a.effort));

    const overdue = ST.overdueTasks();
    const waiting = ST.tasksByStatus('waiting');

    /* marcos futuros ainda abertos — o que a gestão verá acontecer a seguir */
    const nextMilestones = [];
    projects.filter(p => p.status === 'ativo').forEach(p => (p.milestones || []).forEach(ms => {
      if (!ms.done && ms.due && ms.due >= U.today()) nextMilestones.push({ project: p, ms });
    }));
    nextMilestones.sort((a, b) => a.ms.due.localeCompare(b.ms.due));

    const sectorsTouched = U.uniq(done.map(t => t.sectorId).concat(meetings.map(m => m.sectorId)).filter(Boolean));

    return {
      from, to, done, meetings, logs, projects, live, pilots, building, updates, decisions,
      insightsNew, insightsConverted, opportunities, overdue, waiting, nextMilestones, sectorsTouched,
      minutes: U.sum(logs.map(l => l.minutes)),
      meetingMinutes: U.sum(meetings.map(m => m.durationMin)),
      hoursMonth: ST.impactHoursMonth(),
      people: ST.peopleImpacted(),
      costSaved: U.sum(projects.map(p => (p.impact || {}).costSaved))
    };
  }

  /* ============================================================
     2. NARRATIVA — frases construídas a partir dos números
     ============================================================ */
  function summaryParagraph(d) {
    const parts = [];
    const periodo = `de ${U.fmtDate(d.from)} a ${U.fmtDate(d.to)}`;

    if (d.done.length) {
      parts.push(`No período ${periodo}, o Núcleo de IA concluiu <strong>${d.done.length} ${d.done.length === 1 ? 'demanda' : 'demandas'}</strong>` +
        (d.sectorsTouched.length ? ` em ${d.sectorsTouched.length} ${d.sectorsTouched.length === 1 ? 'setor' : 'setores'}` : '') + '.');
    } else {
      parts.push(`No período ${periodo} não houve demandas concluídas registradas.`);
    }

    if (d.meetings.length) {
      parts.push(`Foram <strong>${d.meetings.length} ${d.meetings.length === 1 ? 'reunião' : 'reuniões'}</strong> com os setores` +
        (d.meetingMinutes ? `, somando ${U.fmtDuration(d.meetingMinutes)} de conversa` : '') +
        (d.decisions.length ? `, das quais saíram ${d.decisions.length} ${d.decisions.length === 1 ? 'decisão registrada' : 'decisões registradas'}` : '') + '.');
    }

    if (d.hoursMonth) {
      parts.push(`As soluções em piloto e produção devolvem hoje <strong>${U.fmtNumber(d.hoursMonth)} horas por mês</strong> ao colégio` +
        (d.people ? `, alcançando ${U.fmtNumber(d.people)} pessoas` : '') + '.');
    }

    if (d.live.length) {
      parts.push(`${d.live.length === 1 ? 'Uma solução está' : `${d.live.length} soluções estão`} em produção` +
        (d.pilots.length ? ` e ${d.pilots.length === 1 ? 'outra está' : `outras ${d.pilots.length} estão`} em piloto` : '') + '.');
    } else if (d.pilots.length) {
      parts.push(`${d.pilots.length === 1 ? 'Uma solução está' : `${d.pilots.length} soluções estão`} em fase de piloto.`);
    }

    if (d.overdue.length || d.waiting.length) {
      const bits = [];
      if (d.overdue.length) bits.push(`${d.overdue.length} ${d.overdue.length === 1 ? 'demanda está atrasada' : 'demandas estão atrasadas'}`);
      if (d.waiting.length) bits.push(`${d.waiting.length} ${d.waiting.length === 1 ? 'aguarda retorno de terceiros' : 'aguardam retorno de terceiros'}`);
      parts.push(`Em aberto: ${bits.join(' e ')} — detalhado na seção de riscos.`);
    }

    return parts.join(' ');
  }

  /* ============================================================
     3. BLOCOS DO DOCUMENTO
     ============================================================ */
  const money = v => U.fmtMoney(v);
  const cap = s => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

  function kpiStrip(d) {
    const tiles = [
      { v: U.fmtNumber(d.hoursMonth), u: 'h', l: 'Horas devolvidas por mês', s: 'soluções em piloto e produção' },
      { v: U.fmtNumber(d.done.length), u: '', l: 'Demandas entregues', s: 'no período do relatório' },
      { v: U.fmtNumber(d.people), u: '', l: 'Pessoas alcançadas', s: 'professores, equipe e famílias' },
      d.costSaved
        ? { v: money(d.costSaved), u: '', l: 'Economia estimada', s: 'por ano, conforme cada projeto' }
        : { v: U.fmtNumber(d.projects.filter(p => p.status === 'ativo').length), u: '', l: 'Projetos ativos', s: 'em andamento no portfólio' }
    ];
    return `<div class="rep-kpis">${tiles.map(t => `
      <div class="rep-kpi">
        <div class="rep-kpi__v">${esc(t.v)}${t.u ? `<span>${esc(t.u)}</span>` : ''}</div>
        <div class="rep-kpi__l">${esc(t.l)}</div>
        <div class="rep-kpi__s">${esc(t.s)}</div>
      </div>`).join('')}</div>`;
  }

  function section(num, title, sub, content) {
    if (!content) return '';
    return `<section class="rep-section">
      <div class="rep-section__head">
        <span class="rep-section__num">${num}</span>
        <div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
      </div>
      ${content}
    </section>`;
  }

  /** Cartão de solução — problema, solução, impacto e estado real. */
  function projectCard(p) {
    const stageIdx = ST.PROJECT_STAGE.findIndex(s => s.id === p.stage);
    const impact = p.impact || {};
    const ms = (p.milestones || []);
    const nextMs = ms.filter(m => !m.done && m.due).sort((a, b) => a.due.localeCompare(b.due))[0];
    const lastUp = (p.updates || [])[0];
    const impacts = [
      impact.hoursSavedMonth ? `${U.fmtNumber(impact.hoursSavedMonth)}h/mês devolvidas` : '',
      impact.peopleImpacted ? `${U.fmtNumber(impact.peopleImpacted)} pessoas` : '',
      impact.costSaved ? `${money(impact.costSaved)}/ano` : ''
    ].filter(Boolean);

    return `<article class="rep-project" style="border-left-color:${ST.sectorColor(p.sectorId)}">
      <header class="rep-project__head">
        <div>
          <h3>${esc(p.name)}</h3>
          <div class="rep-project__meta">
            <span class="rep-tag">${esc(ST.sectorName(p.sectorId))}</span>
            <span class="rep-tag rep-tag--stage">${esc(ST.label.stage(p.stage))}</span>
            ${p.targetDate ? `<span>entrega prevista ${esc(U.fmtDate(p.targetDate))}</span>` : ''}
          </div>
        </div>
        <div class="rep-project__pct">${p.progress || 0}<span>%</span></div>
      </header>

      <div class="rep-steps">${ST.PROJECT_STAGE.map((s, i) =>
        `<span class="${i <= stageIdx ? 'is-on' : ''}" title="${esc(s.label)}"></span>`).join('')}</div>

      ${p.problem ? `<p class="rep-project__p"><strong>Problema:</strong> ${esc(U.stripMd(p.problem))}</p>` : ''}
      ${p.solution ? `<p class="rep-project__p"><strong>Solução:</strong> ${esc(U.stripMd(p.solution))}</p>` : ''}

      ${impacts.length ? `<div class="rep-impacts">${impacts.map(i => `<span>${esc(i)}</span>`).join('')}</div>` : ''}

      <div class="rep-project__foot">
        ${ms.length ? `<div><span class="rep-lbl">Marcos</span> ${ms.filter(m => m.done).length} de ${ms.length} concluídos${nextMs ? ` · próximo: ${esc(nextMs.title)} (${esc(U.fmtDate(nextMs.due))})` : ''}</div>` : ''}
        ${lastUp ? `<div><span class="rep-lbl">Última atualização</span> ${esc(U.fmtDate(lastUp.date))} — ${esc(U.stripMd(lastUp.text))}</div>` : ''}
        ${(p.stakeholders || []).length ? `<div><span class="rep-lbl">Envolvidos</span> ${esc(p.stakeholders.join(' · '))}</div>` : ''}
      </div>
    </article>`;
  }

  function deliveriesBySector(d) {
    if (!d.done.length) return '';
    const groups = U.groupBy(d.done, t => t.sectorId || 'sem');
    const bars = Object.keys(groups).map(k => ({
      label: k === 'sem' ? 'Sem setor' : ST.sectorName(k),
      color: k === 'sem' ? 'var(--ink-3)' : ST.sectorColor(k),
      value: groups[k].length
    })).sort((a, b) => b.value - a.value);

    const lists = Object.keys(groups)
      .sort((a, b) => groups[b].length - groups[a].length)
      .map(k => `<div class="rep-group">
        <h4><span class="rep-dot" style="background:${k === 'sem' ? '#898781' : ST.sectorColor(k)}"></span>${esc(k === 'sem' ? 'Sem setor' : ST.sectorName(k))}<span class="rep-count">${groups[k].length}</span></h4>
        <ul class="rep-list">${groups[k].map(t => `<li>${esc(t.title)}${t.projectId ? ` <span class="rep-muted">— ${esc((ST.get('projects', t.projectId) || {}).name || '')}</span>` : ''}<span class="rep-when">${esc(U.fmtDate(String(t.completedAt).slice(0, 10), 'short'))}</span></li>`).join('')}</ul>
      </div>`).join('');

    return `<div class="rep-chart">${C.barsH(bars, { valueLabel: 'Entregas', labelWidth: '38%' })}</div>${lists}`;
  }

  function meetingsBlock(d) {
    if (!d.meetings.length) return '';
    const bySector = U.groupBy(d.meetings, m => m.sectorId || 'sem');
    const rows = Object.keys(bySector).map(k => ({
      label: k === 'sem' ? 'Vários setores' : ST.sectorName(k),
      color: k === 'sem' ? 'var(--ink-3)' : ST.sectorColor(k),
      value: bySector[k].length
    })).sort((a, b) => b.value - a.value);

    const decisions = d.decisions.length ? `
      <h4 class="rep-sub">Decisões registradas</h4>
      <ul class="rep-decisions">${d.decisions.slice(0, 14).map(dec => `
        <li><span class="rep-check"></span><div>${esc(dec.text)}
          <span class="rep-muted">${esc(ST.sectorName(dec.meeting.sectorId))} · ${esc(U.fmtDate(dec.meeting.date))} · ${esc(dec.meeting.title)}</span></div></li>`).join('')}
      </ul>${d.decisions.length > 14 ? `<p class="rep-muted">e mais ${d.decisions.length - 14} decisões registradas no sistema.</p>` : ''}` : '';

    return `<div class="rep-chart">${C.barsH(rows, { valueLabel: 'Reuniões', labelWidth: '38%' })}</div>${decisions}`;
  }

  function progressBlock(d) {
    if (!d.updates.length) return '';
    return `<ul class="rep-timeline">${d.updates.slice(0, 12).map(u => `
      <li><span class="rep-timeline__date">${esc(U.fmtDate(u.date, 'medium'))}</span>
        <div><strong>${esc(u.project.name)}</strong><p>${esc(U.stripMd(u.text))}</p></div></li>`).join('')}</ul>`;
  }

  function opportunitiesBlock(d) {
    const conv = d.insightsConverted.slice(0, 6);
    const open = d.opportunities.slice(0, 6);
    if (!conv.length && !open.length) return '';
    return `
      ${conv.length ? `<h4 class="rep-sub">Percepções que viraram entrega</h4>
        <ul class="rep-list rep-list--check">${conv.map(i => {
          const target = i.convertedTo ? ST.get(i.convertedTo.type, i.convertedTo.id) : null;
          return `<li>${esc(i.title)}${target ? ` <span class="rep-muted">→ ${esc(target.title || target.name)}</span>` : ''}</li>`;
        }).join('')}</ul>` : ''}
      ${open.length ? `<h4 class="rep-sub">Oportunidades mapeadas, ainda não iniciadas</h4>
        <table class="rep-table"><thead><tr><th>Oportunidade</th><th>Setor</th><th class="num">Impacto</th><th class="num">Esforço</th></tr></thead>
        <tbody>${open.map(i => `<tr>
          <td>${esc(i.title)}</td><td>${esc(ST.sectorName(i.sectorId))}</td>
          <td class="num">${i.impact}/5</td><td class="num">${i.effort}/5</td></tr>`).join('')}</tbody></table>
        <p class="rep-muted">Ordenadas por melhor relação entre impacto e esforço.</p>` : ''}`;
  }

  function coverageTable(d) {
    const rows = ST.state.sectors.map(s => {
      const entregues = d.done.filter(t => t.sectorId === s.id).length;
      const abertas = ST.state.tasks.filter(t => t.sectorId === s.id && t.status !== 'done').length;
      const reunioes = d.meetings.filter(m => m.sectorId === s.id).length;
      const last = ST.state.meetings.filter(m => m.sectorId === s.id).sort((a, b) => b.date.localeCompare(a.date))[0];
      const projetos = d.projects.filter(p => p.sectorId === s.id).length;
      const horas = U.sum(d.projects.filter(p => p.sectorId === s.id && (p.stage === 'piloto' || p.stage === 'producao')).map(p => (p.impact || {}).hoursSavedMonth));
      const silent = last && U.daysBetween(last.date, U.today()) > 45;
      return { s, entregues, abertas, reunioes, last, projetos, horas, silent, nunca: !last };
    }).sort((a, b) => (b.entregues + b.reunioes) - (a.entregues + a.reunioes));

    const antigos = rows.filter(r => r.silent);
    const nunca = rows.filter(r => r.nunca);
    const aviso = [];
    if (antigos.length) aviso.push(`${antigos.length === 1 ? 'O setor' : 'Os setores'} <strong>${esc(antigos.map(r => r.s.name).join(', '))}</strong> ${antigos.length === 1 ? 'não tem' : 'não têm'} contato registrado há mais de 45 dias`);
    if (nunca.length) aviso.push(`${nunca.length === 1 ? 'não há reunião registrada com' : 'não há reuniões registradas com'} <strong>${esc(nunca.map(r => r.s.name).join(', '))}</strong>`);
    return `<table class="rep-table">
      <thead><tr><th>Setor</th><th class="num">Entregues</th><th class="num">Em aberto</th><th class="num">Reuniões</th><th>Último contato</th><th class="num">Projetos</th><th class="num">h/mês</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td><span class="rep-dot" style="background:${r.s.color}"></span>${esc(r.s.name)}</td>
        <td class="num">${r.entregues}</td><td class="num">${r.abertas}</td><td class="num">${r.reunioes}</td>
        <td>${r.last ? esc(U.fmtDate(r.last.date)) : '<span class="rep-flag">sem registro</span>'}${r.last && r.silent ? ' <span class="rep-flag">há mais de 45 dias</span>' : ''}</td>
        <td class="num">${r.projetos || '—'}</td><td class="num">${r.horas || '—'}</td></tr>`).join('')}</tbody></table>
      ${aviso.length ? `<p class="rep-note-inline">${cap(aviso.join('; e '))}. Vale abrir uma conversa de escuta no próximo ciclo — atender só quem procura deixa o restante do colégio invisível.</p>` : ''}`;
  }

  function risksBlock(d) {
    const items = d.overdue.map(t => ({ t, tipo: 'atraso' })).concat(d.waiting.map(t => ({ t, tipo: 'espera' })));
    if (!items.length) return '';
    return `<ul class="rep-risks">${items.slice(0, 12).map(({ t, tipo }) => `
      <li class="rep-risk rep-risk--${tipo}">
        <div><strong>${esc(t.title)}</strong>
          <span class="rep-muted">${esc(ST.sectorName(t.sectorId))}${t.projectId ? ' · ' + esc((ST.get('projects', t.projectId) || {}).name || '') : ''}</span></div>
        <span class="rep-risk__tag">${tipo === 'atraso' ? 'atrasada ' + esc(U.fmtRelative(t.due)) : 'aguardando retorno'}</span>
      </li>`).join('')}</ul>
      ${items.length > 12 ? `<p class="rep-muted">e mais ${items.length - 12} itens em aberto.</p>` : ''}`;
  }

  function nextStepsBlock(d) {
    const ms = d.nextMilestones.slice(0, 10);
    const entregas = d.projects.filter(p => p.status === 'ativo' && p.targetDate && p.targetDate >= U.today())
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate)).slice(0, 6);
    if (!ms.length && !entregas.length) return '';
    return `
      ${ms.length ? `<h4 class="rep-sub">Marcos combinados</h4>
        <table class="rep-table"><thead><tr><th>Marco</th><th>Projeto</th><th>Prazo</th></tr></thead>
        <tbody>${ms.map(x => `<tr><td>${esc(x.ms.title)}</td><td>${esc(x.project.name)}</td>
          <td>${esc(U.fmtDate(x.ms.due))} <span class="rep-muted">${esc(U.fmtRelative(x.ms.due))}</span></td></tr>`).join('')}</tbody></table>` : ''}
      ${entregas.length ? `<h4 class="rep-sub">Entregas previstas</h4>
        <ul class="rep-list">${entregas.map(p => `<li>${esc(p.name)} <span class="rep-muted">— ${esc(ST.sectorName(p.sectorId))}</span><span class="rep-when">${esc(U.fmtDate(p.targetDate))}</span></li>`).join('')}</ul>` : ''}`;
  }

  function methodology(d) {
    return `<div class="rep-note">
      <h4>Como estes números são apurados</h4>
      <ul>
        <li><strong>Horas devolvidas por mês:</strong> estimativa combinada com cada setor no início do projeto, contada apenas para soluções em piloto ou produção. Não é medição automática — é o valor que o próprio setor reconheceu como tempo economizado.</li>
        <li><strong>Demandas entregues:</strong> itens marcados como concluídos no período ${esc(U.fmtDate(d.from))}–${esc(U.fmtDate(d.to))}.</li>
        <li><strong>Pessoas alcançadas:</strong> soma declarada por projeto; uma mesma pessoa pode ser contada em projetos diferentes.</li>
        ${d.costSaved ? '<li><strong>Economia estimada:</strong> projeção anual informada projeto a projeto, sujeita a revisão com o financeiro.</li>' : ''}
        <li><strong>Tempo de trabalho:</strong> ${d.minutes ? U.fmtDuration(d.minutes) + ' registrados manualmente no período; representa o que foi apontado, não a jornada total.' : 'não houve apontamento manual de horas neste período.'}</li>
      </ul>
    </div>`;
  }

  /* ============================================================
     4. DOCUMENTO
     ============================================================ */
  function buildHtml(opts) {
    const d = collect(opts.from, opts.to);
    const s = ST.settings;
    const school = s.school || App.brand.school;
    const inc = opts.sections || {};
    let n = 0;
    const num = () => String(++n).padStart(2, '0');

    const weeks = Math.max(4, Math.min(16, Math.ceil(U.daysBetween(opts.from, opts.to) / 7)));
    const serie = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const start = U.addDays(U.startOfWeek(opts.to, 1), -7 * i);
      serie.push({ value: ST.doneBetween(start, U.addDays(start, 6)).length, label: U.fmtDate(start, 'short') });
    }
    const temRitmo = U.sum(serie.map(p => p.value)) > 0;

    const portfolio = ST.PROJECT_STAGE.map(st => ({
      label: st.label, hint: st.hint, value: d.projects.filter(p => p.stage === st.id).length
    }));

    const destaque = d.live.concat(d.pilots);

    return `<article class="report-doc">
      <header class="rep-header">
        <div class="rep-brand">${App.brand.markSvg()}</div>
        <div class="rep-headtext">
          <div class="rep-school">${esc(school)}</div>
          <h1>Relatório de Engenharia de IA</h1>
          <div class="rep-period">${esc(U.fmtDate(opts.from, 'full'))} &nbsp;—&nbsp; ${esc(U.fmtDate(opts.to, 'full'))}</div>
        </div>
      </header>
      <div class="rep-rule"></div>

      <div class="rep-to">
        <div><span class="rep-lbl">Para</span> ${esc(opts.audience || 'Direção')}</div>
        <div><span class="rep-lbl">De</span> ${esc(s.userName || '—')}${s.role ? ' · ' + esc(s.role) : ''}</div>
        <div><span class="rep-lbl">Emitido em</span> ${esc(U.fmtDate(U.today(), 'full'))}</div>
      </div>

      ${opts.message ? `<div class="rep-message">${U.markdown(opts.message)}</div>` : ''}

      ${section(num(), 'Resumo executivo', 'Os números do período e o que eles significam',
        kpiStrip(d) + `<p class="rep-lead">${summaryParagraph(d)}</p>` +
        (temRitmo ? `<div class="rep-chart rep-chart--full">
          <h4 class="rep-sub">Ritmo de entregas por semana</h4>
          ${C.svg.columns(serie, { width: DOC_WIDTH, height: 170, valueLabel: 'Entregas' })}</div>` : ''))}

      ${destaque.length ? section(num(), 'Soluções que já geram valor',
        'Em produção e em piloto — o que a comunidade escolar já usa',
        destaque.map(projectCard).join('')) : ''}

      ${d.building.length ? section(num(), 'Em construção',
        'Projetos em descoberta, desenho ou desenvolvimento',
        `<h4 class="rep-sub">Portfólio completo por etapa</h4>
         <div class="rep-chart">${C.funnel(portfolio, { valueLabel: 'Projetos' })}</div>
         <h4 class="rep-sub">Em desenvolvimento neste momento</h4>` +
        `<table class="rep-table"><thead><tr><th>Projeto</th><th>Setor</th><th>Etapa</th><th class="num">Progresso</th><th>Previsão</th></tr></thead>
         <tbody>${d.building.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(ST.sectorName(p.sectorId))}</td>
           <td>${esc(ST.label.stage(p.stage))}</td><td class="num">${p.progress || 0}%</td>
           <td>${p.targetDate ? esc(U.fmtDate(p.targetDate)) : '—'}</td></tr>`).join('')}</tbody></table>`) : ''}

      ${inc.deliveries !== false && d.done.length ? section(num(), 'Entregas do período',
        'O que foi concluído, por setor atendido', deliveriesBySector(d)) : ''}

      ${inc.progress !== false && d.updates.length ? section(num(), 'Avanços registrados',
        'Diário dos projetos no período', progressBlock(d)) : ''}

      ${inc.meetings !== false && d.meetings.length ? section(num(), 'Escuta dos setores',
        'Reuniões realizadas e decisões tomadas', meetingsBlock(d)) : ''}

      ${inc.opportunities !== false ? section(num(), 'Oportunidades identificadas',
        'Percepções de campo transformadas — e as que aguardam decisão', opportunitiesBlock(d)) : ''}

      ${inc.coverage !== false ? section(num(), 'Cobertura por setor',
        'Quem está sendo atendido e quem precisa de atenção', coverageTable(d)) : ''}

      ${inc.risks !== false && (d.overdue.length || d.waiting.length) ? section(num(), 'Riscos e bloqueios',
        'O que está travado e o que depende de decisão de terceiros', risksBlock(d)) : ''}

      ${inc.next !== false ? section(num(), 'Próximos passos',
        'Compromissos assumidos para o período seguinte', nextStepsBlock(d)) : ''}

      ${inc.methodology !== false ? `<div class="rep-section">${methodology(d)}</div>` : ''}

      <footer class="rep-footer">
        <div class="rep-sign">
          <div class="rep-sign__line"></div>
          <strong>${esc(s.userName || '')}</strong>
          <span>${esc(s.role || 'Engenheiro de IA')} · ${esc(school)}</span>
        </div>
        <div class="rep-footer__meta">
          Documento gerado pelo Núcleo de IA em ${esc(U.fmtDate(U.today()))}.<br>
          Dados de ${esc(U.fmtDate(opts.from))} a ${esc(U.fmtDate(opts.to))}.
        </div>
      </footer>
    </article>`;
  }

  /* ---------- versão em texto puro (e-mail, WhatsApp) ---------- */
  function buildText(opts) {
    const d = collect(opts.from, opts.to);
    const s = ST.settings;
    const L = [];
    const rule = '─'.repeat(46);
    L.push(`RELATÓRIO DE ENGENHARIA DE IA`);
    L.push(s.school || App.brand.school);
    L.push(`${U.fmtDate(opts.from)} a ${U.fmtDate(opts.to)}`);
    L.push(rule, '');
    L.push('RESUMO');
    L.push(summaryParagraph(d).replace(/<[^>]+>/g, ''));
    L.push('', 'NÚMEROS');
    L.push(`• ${U.fmtNumber(d.hoursMonth)}h/mês devolvidas ao colégio`);
    L.push(`• ${d.done.length} demandas entregues no período`);
    L.push(`• ${U.fmtNumber(d.people)} pessoas alcançadas`);
    if (d.costSaved) L.push(`• ${money(d.costSaved)}/ano de economia estimada`);
    if (d.meetings.length) L.push(`• ${d.meetings.length} reuniões · ${d.decisions.length} decisões registradas`);

    if (d.live.length || d.pilots.length) {
      L.push('', 'SOLUÇÕES QUE JÁ GERAM VALOR');
      d.live.concat(d.pilots).forEach(p => {
        L.push(`• ${p.name} (${ST.sectorName(p.sectorId)}) — ${ST.label.stage(p.stage)}, ${p.progress || 0}%` +
          ((p.impact || {}).hoursSavedMonth ? ` · ${p.impact.hoursSavedMonth}h/mês` : ''));
      });
    }
    if (d.done.length) {
      L.push('', 'ENTREGAS DO PERÍODO');
      d.done.slice(0, 12).forEach(t => L.push(`• ${t.title}${t.sectorId ? ` (${ST.sectorName(t.sectorId)})` : ''}`));
      if (d.done.length > 12) L.push(`  …e mais ${d.done.length - 12}.`);
    }
    if (d.decisions.length) {
      L.push('', 'DECISÕES TOMADAS COM OS SETORES');
      d.decisions.slice(0, 8).forEach(x => L.push(`• ${x.text} (${ST.sectorName(x.meeting.sectorId)}, ${U.fmtDate(x.meeting.date)})`));
    }
    if (d.overdue.length || d.waiting.length) {
      L.push('', 'RISCOS E BLOQUEIOS');
      d.overdue.slice(0, 5).forEach(t => L.push(`• ${t.title} — atrasada ${U.fmtRelative(t.due)}`));
      d.waiting.slice(0, 5).forEach(t => L.push(`• ${t.title} — aguardando retorno`));
    }
    if (d.nextMilestones.length) {
      L.push('', 'PRÓXIMOS PASSOS');
      d.nextMilestones.slice(0, 6).forEach(x => L.push(`• ${x.ms.title} — ${x.project.name}, até ${U.fmtDate(x.ms.due)}`));
    }
    L.push('', rule);
    L.push(`${s.userName || ''}${s.role ? ' · ' + s.role : ''}`);
    L.push(`Gerado em ${U.fmtDate(U.today())}.`);
    return L.join('\n');
  }

  /* ============================================================
     5. ESTILO DO DOCUMENTO
     ============================================================ */
  function styles() {
    return `
.report-doc {
  --rep-navy:#1e3a79; --rep-lime:#a8cf38; --rep-lime-ink:#8ab023;
  --ink:#12141a; --ink-2:#4a4f5a; --ink-3:#868b95;
  --surface:#ffffff; --sunken:#eef1f6; --border:#e2e6ee;
  --s1:#2f5aa8; --s2:#8ab023; --s3:#e87ba4; --s4:#eda100;
  --s5:#1baf7a; --s6:#eb6834; --s7:#4a3aa7; --s8:#e34948;
  --q1:#dbe4f6; --q2:#b3c6ea; --q3:#8ba6dc; --q4:#5b86d6; --q5:#3f6bbd; --q6:#1e3a79;
  --f1:#7f9fd8; --f2:#5b86d6; --f3:#3f6bbd; --f4:#2a5498; --f5:#1e3a79;
  --axis:#c3c8d2; --grid:#e8ebf1; --accent:#1e3a79;
  background:var(--surface); color:var(--ink);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size:13px; line-height:1.6; max-width:${DOC_WIDTH + 80}px; margin:0 auto; padding:38px 40px 32px;
}
.report-doc *{box-sizing:border-box}
.report-doc h1,.report-doc h2,.report-doc h3,.report-doc h4{margin:0;line-height:1.25;letter-spacing:-.01em}
.report-doc p{margin:0}
.report-doc ul{margin:0;padding:0;list-style:none}
.report-doc .num{text-align:right;font-variant-numeric:tabular-nums}
.rep-muted{color:var(--ink-3);font-size:11.5px}
.rep-lbl{display:inline-block;font-size:9.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--ink-3);font-weight:700;margin-right:5px}

.rep-header{display:flex;align-items:center;gap:18px}
.rep-brand{width:62px;height:62px;flex:none}
.rep-brand svg{width:100%;height:100%}
.rep-school{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--rep-navy)}
.rep-headtext h1{font-size:25px;font-weight:660;color:var(--ink);margin:3px 0 4px}
.rep-period{font-size:12.5px;color:var(--ink-2)}
.rep-rule{height:3px;margin:14px 0 16px;border-radius:2px;
  background:linear-gradient(90deg,var(--rep-navy) 0 62%,var(--rep-lime) 62% 100%)}

.rep-to{display:flex;flex-wrap:wrap;gap:10px 26px;font-size:12px;color:var(--ink-2);
  padding-bottom:14px;border-bottom:1px solid var(--border)}
.rep-message{margin:16px 0 4px;padding:14px 16px;background:var(--sunken);border-radius:10px;
  font-size:12.5px;color:var(--ink-2);border-left:3px solid var(--rep-lime)}
.rep-message p{margin:0 0 6px}.rep-message p:last-child{margin:0}

.rep-section{margin-top:26px;break-inside:avoid}
.rep-section__head{display:flex;gap:11px;align-items:flex-start;margin-bottom:13px}
.rep-section__num{flex:none;width:24px;height:24px;border-radius:7px;background:var(--rep-navy);color:#fff;
  font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;font-variant-numeric:tabular-nums}
.rep-section__head h2{font-size:15.5px;font-weight:650;color:var(--rep-navy)}
.rep-section__head p{font-size:11.5px;color:var(--ink-3);margin-top:2px}
.rep-sub{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-3);
  font-weight:700;margin:18px 0 9px}

.rep-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);
  border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:15px}
.rep-kpi{background:#f8fafd;padding:13px 14px}
.rep-kpi__v{font-size:26px;font-weight:660;color:var(--rep-navy);letter-spacing:-.02em;line-height:1.1}
.rep-kpi__v span{font-size:14px;font-weight:600}
.rep-kpi__l{font-size:11px;font-weight:640;color:var(--ink);margin-top:4px}
.rep-kpi__s{font-size:10px;color:var(--ink-3);margin-top:1px}
.rep-lead{font-size:13.5px;line-height:1.72;color:var(--ink-2)}
.rep-lead strong{color:var(--ink);font-weight:640}

.rep-chart{margin:14px 0}
.rep-chart--full{margin-top:18px}
.rep-chart svg{max-width:100%}
.rep-chart .axis-label{font-size:10.5px;fill:var(--ink-3)}
.rep-chart .grid-line{stroke:var(--grid);stroke-width:1}
.rep-chart .base-line{stroke:var(--axis);stroke-width:1}
.rep-chart .val-label{font-size:11px;fill:var(--ink-2);font-weight:620}
.rep-chart .hit{fill:transparent}
.rep-chart .legend{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:10px;font-size:11.5px;color:var(--ink-2)}
.rep-chart .legend__item{display:inline-flex;align-items:center;gap:6px}
.rep-chart .legend__swatch{width:10px;height:10px;border-radius:3px}

.rep-project{border:1px solid var(--border);border-left:4px solid var(--rep-navy);border-radius:10px;
  padding:15px 17px;margin-bottom:12px;break-inside:avoid}
.rep-project__head{display:flex;gap:14px;align-items:flex-start;justify-content:space-between}
.rep-project__head h3{font-size:15px;font-weight:650}
.rep-project__meta{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-top:5px;font-size:11px;color:var(--ink-3)}
.rep-tag{background:var(--sunken);border-radius:99px;padding:2px 9px;font-size:10.5px;font-weight:600;color:var(--ink-2)}
.rep-tag--stage{background:#e8effa;color:var(--rep-navy)}
.rep-project__pct{font-size:22px;font-weight:660;color:var(--rep-navy);line-height:1;white-space:nowrap}
.rep-project__pct span{font-size:12px}
.rep-steps{display:flex;gap:3px;margin:11px 0}
.rep-steps span{flex:1;height:4px;border-radius:99px;background:var(--sunken)}
.rep-steps span.is-on{background:var(--rep-navy)}
.rep-project__p{font-size:12.5px;color:var(--ink-2);margin-bottom:5px}
.rep-project__p strong{color:var(--ink);font-weight:640}
.rep-impacts{display:flex;flex-wrap:wrap;gap:7px;margin:9px 0}
.rep-impacts span{font-size:11px;font-weight:640;color:var(--rep-lime-ink);
  background:#f2f8e3;border:1px solid #dcebbc;border-radius:6px;padding:3px 9px}
.rep-project__foot{border-top:1px solid var(--border);margin-top:10px;padding-top:9px;
  display:grid;gap:4px;font-size:11.5px;color:var(--ink-2)}

.rep-group{margin-top:14px;break-inside:avoid}
.rep-group h4{font-size:12.5px;font-weight:650;display:flex;align-items:center;gap:7px;margin-bottom:6px}
.rep-count{margin-left:auto;font-size:11px;color:var(--ink-3);font-variant-numeric:tabular-nums}
.rep-dot{width:9px;height:9px;border-radius:99px;display:inline-block;flex:none}
.rep-list li{display:flex;gap:9px;align-items:baseline;font-size:12.5px;color:var(--ink-2);
  padding:4px 0;border-bottom:1px solid var(--border)}
.rep-list li:last-child{border-bottom:none}
.rep-list li::before{content:"";width:4px;height:4px;border-radius:99px;background:var(--axis);flex:none;transform:translateY(-2px)}
.rep-list--check li::before{content:"✓";width:auto;height:auto;background:none;color:var(--rep-lime-ink);font-weight:700;transform:none}
.rep-when{margin-left:auto;font-size:11px;color:var(--ink-3);font-variant-numeric:tabular-nums;white-space:nowrap}

.rep-decisions li{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:12.5px}
.rep-decisions li:last-child{border-bottom:none}
.rep-decisions .rep-muted{display:block;margin-top:2px}
.rep-check{flex:none;width:16px;height:16px;border-radius:5px;background:#f2f8e3;border:1px solid #dcebbc;position:relative;margin-top:2px}
.rep-check::after{content:"";position:absolute;left:5px;top:3px;width:4px;height:8px;border:solid var(--rep-lime-ink);
  border-width:0 2px 2px 0;transform:rotate(45deg)}

.rep-timeline{border-left:2px solid var(--sunken);padding-left:16px;margin-left:4px}
.rep-timeline li{position:relative;padding:0 0 14px}
.rep-timeline li::before{content:"";position:absolute;left:-21px;top:5px;width:8px;height:8px;
  border-radius:99px;background:var(--rep-navy)}
.rep-timeline__date{font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-3);font-weight:700}
.rep-timeline strong{display:block;font-size:12.5px;margin:2px 0 2px}
.rep-timeline p{font-size:12px;color:var(--ink-2)}

.rep-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
.rep-table th{text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-3);
  font-weight:700;padding:7px 9px;border-bottom:1.5px solid var(--border);white-space:nowrap}
.rep-table td{padding:8px 9px;border-bottom:1px solid var(--border);color:var(--ink-2);vertical-align:top}
.rep-table tr:last-child td{border-bottom:none}
.rep-table td:first-child{color:var(--ink);font-weight:520}
.rep-flag{font-size:10px;font-weight:640;color:#a8461c;background:#fdf0e8;border-radius:5px;padding:1px 6px;white-space:nowrap}
.rep-note-inline{font-size:11.5px;color:var(--ink-2);margin-top:9px;padding:9px 12px;
  background:#fdf8ee;border-left:3px solid var(--rep-lime);border-radius:0 8px 8px 0}

.rep-risks li{display:flex;gap:12px;align-items:center;justify-content:space-between;
  padding:9px 12px;border:1px solid var(--border);border-left-width:3px;border-radius:8px;margin-bottom:6px;font-size:12.5px}
.rep-risk--atraso{border-left-color:#d03b3b}
.rep-risk--espera{border-left-color:#ec835a}
.rep-risks strong{display:block;font-weight:600;color:var(--ink)}
.rep-risks .rep-muted{display:block}
.rep-risk__tag{font-size:10.5px;font-weight:640;white-space:nowrap;color:var(--ink-2);
  background:var(--sunken);border-radius:99px;padding:3px 10px}

.rep-note{background:#f8fafd;border:1px solid var(--border);border-radius:10px;padding:15px 17px;break-inside:avoid}
.rep-note h4{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-3);margin-bottom:9px}
.rep-note ul{display:grid;gap:6px}
.rep-note li{font-size:11.5px;color:var(--ink-2);padding-left:13px;position:relative;line-height:1.55}
.rep-note li::before{content:"";position:absolute;left:0;top:7px;width:4px;height:4px;border-radius:99px;background:var(--axis)}
.rep-note strong{color:var(--ink)}

.rep-footer{margin-top:30px;padding-top:16px;border-top:1px solid var(--border);
  display:flex;justify-content:space-between;align-items:flex-end;gap:24px;break-inside:avoid}
.rep-sign__line{width:190px;border-top:1px solid var(--ink-3);margin-bottom:6px}
.rep-sign strong{display:block;font-size:12.5px}
.rep-sign span{font-size:11px;color:var(--ink-3)}
.rep-footer__meta{font-size:10.5px;color:var(--ink-3);text-align:right}

@media (max-width:620px){
  .rep-kpis{grid-template-columns:repeat(2,1fr)}
  .rep-header{gap:12px}.rep-headtext h1{font-size:20px}
  .rep-footer{flex-direction:column;align-items:flex-start}
  .rep-footer__meta{text-align:left}
}
@media print{
  @page{margin:14mm 12mm}
  .report-doc{max-width:none;font-size:10.5pt;padding:0;box-shadow:none}
  .rep-kpi{background:#f8fafd !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .report-doc *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;
  }

  /* ============================================================
     6. SAÍDAS — pré-visualizar, imprimir, baixar
     ============================================================ */
  function ensureStyles() {
    if (document.getElementById('reportStyles')) return;
    document.head.appendChild(el('style', { id: 'reportStyles', html: styles() }));
  }

  function standalone(opts) {
    const school = ST.settings.school || App.brand.school;
    return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório de IA · ${esc(school)} · ${esc(U.fmtDate(opts.to))}</title>
<style>body{margin:0;padding:30px 16px;background:#eef1f6}
.report-doc{box-shadow:0 2px 6px rgba(16,24,48,.06),0 18px 44px rgba(16,24,48,.09);border-radius:14px}
@media print{body{background:#fff;padding:0}}
${styles()}</style></head>
<body>${buildHtml(opts)}</body></html>`;
  }

  function printDoc() {
    document.body.classList.add('printing-report');
    const cleanup = () => {
      document.body.classList.remove('printing-report');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => { window.print(); setTimeout(cleanup, 800); }, 60);
  }

  function preview(opts) {
    ensureStyles();
    const body = el('div', { class: 'report-preview', html: buildHtml(opts) });
    UI.modal({
      title: 'Relatório para a gestão', size: 'wide',
      subtitle: `${U.fmtDate(opts.from)} a ${U.fmtDate(opts.to)} · pronto para imprimir, salvar em PDF ou enviar`,
      body,
      footer: [
        { label: 'Ajustar', icon: 'edit', onClick: ({ close }) => { close(); open(opts); } },
        'spacer',
        { label: 'Copiar resumo', icon: 'copy', onClick: () => {
          if (!navigator.clipboard) { UI.toast('Navegador sem acesso à área de transferência', 'bad'); return; }
          navigator.clipboard.writeText(buildText(opts)).then(
            () => UI.toast('Resumo em texto copiado ✓', 'good'),
            () => UI.toast('Não consegui copiar', 'bad'));
        } },
        { label: 'Baixar HTML', icon: 'download', onClick: () => {
          UI.download(`relatorio-ia-${U.today()}.html`, standalone(opts), 'text/html;charset=utf-8');
          UI.toast('Arquivo baixado ✓ Abre em qualquer navegador', 'good');
        } },
        { label: 'Imprimir / PDF', variant: 'primary', icon: 'printer', onClick: () => printDoc() }
      ]
    });
  }

  /* ---------- configuração antes de gerar ---------- */
  function open(prev) {
    const s = ST.settings;
    const p = prev || {};
    const presets = [['30', 'Últimos 30 dias'], ['90', 'Último trimestre'], ['180', 'Último semestre'], ['365', 'Último ano']];
    const sections = [
      ['deliveries', 'Entregas do período', true],
      ['progress', 'Avanços registrados nos projetos', true],
      ['meetings', 'Reuniões e decisões', true],
      ['opportunities', 'Oportunidades identificadas', true],
      ['coverage', 'Cobertura por setor', true],
      ['risks', 'Riscos e bloqueios', true],
      ['next', 'Próximos passos', true],
      ['methodology', 'Nota de metodologia', true]
    ];
    const inc = p.sections || {};

    const body = el('div', { html: `
      <div class="form-grid">
        <div class="field col-2">
          <label class="field__label">Período coberto</label>
          <div class="pill-group" data-presets>
            ${presets.map(x => `<button type="button" data-preset="${x[0]}" class="${(p.presetId || '90') === x[0] ? 'is-active' : ''}">${x[1]}</button>`).join('')}
          </div>
        </div>
        <div class="field"><label class="field__label">De</label>
          <input class="input" type="date" name="from" value="${esc(p.from || U.addDays(U.today(), -90))}"></div>
        <div class="field"><label class="field__label">Até</label>
          <input class="input" type="date" name="to" value="${esc(p.to || U.today())}"></div>
        <div class="field col-2"><label class="field__label">Destinatário</label>
          <input class="input" name="audience" value="${esc(p.audience || ('Direção · ' + (s.school || App.brand.school)))}"></div>
        <div class="field col-2"><label class="field__label">Mensagem de abertura</label>
          <textarea class="textarea" name="message" rows="3" placeholder="Opcional. Uma ou duas frases suas para contextualizar o período — o que você quer que a gestão perceba neste relatório.">${esc(p.message || '')}</textarea></div>
        <div class="field col-2">
          <label class="field__label">Seções a incluir</label>
          <div class="grid grid--2" style="gap:6px 16px;margin-top:2px">
            ${sections.map(x => `<label class="check"><input type="checkbox" data-sec="${x[0]}" ${inc[x[0]] === false ? '' : 'checked'}> ${x[1]}</label>`).join('')}
          </div>
          <span class="field__hint">Seções sem dados no período são omitidas automaticamente.</span>
        </div>
      </div>` });

    U.on(body, 'click', '[data-preset]', (ev, btn) => {
      U.$$('[data-presets] button', body).forEach(b => b.classList.toggle('is-active', b === btn));
      U.$('[name=from]', body).value = U.addDays(U.today(), -Number(btn.dataset.preset));
      U.$('[name=to]', body).value = U.today();
    });

    UI.modal({
      title: 'Gerar relatório para a gestão',
      subtitle: 'O documento é montado a partir do que já está registrado no sistema',
      body,
      footer: ['spacer',
        { label: 'Cancelar', onClick: ({ close }) => close() },
        { label: 'Gerar relatório', variant: 'primary', icon: 'arrowRight', onClick: ({ close }) => {
          const v = App.forms.helpers.readForm(body);
          const secs = {};
          U.$$('[data-sec]', body).forEach(cb => { secs[cb.dataset.sec] = cb.checked; });
          const active = U.$('[data-presets] button.is-active', body);
          const opts = {
            from: v.from || U.addDays(U.today(), -90),
            to: v.to || U.today(),
            audience: v.audience,
            message: v.message,
            sections: secs,
            presetId: active ? active.dataset.preset : ''
          };
          if (opts.from > opts.to) { UI.toast('A data inicial precisa ser anterior à final', 'bad'); return; }
          close();
          preview(opts);
        } }]
    });
  }

  App.report = { open, preview, buildHtml, buildText, standalone, styles, collect };
})(window.App);
