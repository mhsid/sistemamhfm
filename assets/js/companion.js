/* ============================================================
   companion.js — o companheiro digital.
   Motor de regras que observa os dados e conversa com você.
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util, ST = App.store, UI = App.ui;
  const { el, esc } = U;

  /* ---------- PERSONALIDADE ---------- */
  const VOICE = {
    parceiro: {
      hello: n => `${U.greeting()}, ${n}! Bora fazer o dia render?`,
      empty: 'Quadro limpo por aqui. Aproveita para pensar no que ninguém pediu ainda — costuma ser onde mora o melhor projeto.',
      nudge: 'Ó, olha isso aqui',
      praise: ['Isso!', 'Muito bom.', 'Tá voando.', 'Orgulho.'],
      sign: 'Tô aqui do lado — bora fazer crescer 👊'
    },
    direto: {
      hello: n => `${n}, seu status:`,
      empty: 'Nada pendente. Use o tempo para prospectar demanda nova.',
      nudge: 'Atenção',
      praise: ['Feito.', 'Entregue.', 'Concluído.', 'Ok.'],
      sign: 'Fim do relatório.'
    },
    zen: {
      hello: n => `${U.greeting()}, ${n}. Respira. Vamos por partes.`,
      empty: 'Silêncio no quadro. Silêncio também é trabalho: descanse ou pense.',
      nudge: 'Um lembrete gentil',
      praise: ['Bonito.', 'Um passo de cada vez.', 'Constância é isso.', 'Seguimos.'],
      sign: 'Sem pressa, com direção — é assim que se faz crescer.'
    }
  };
  const voice = () => VOICE[ST.settings.companion.persona] || VOICE.parceiro;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const name = () => (ST.settings.userName || '').split(' ')[0] || 'colega';

  /* ---------- REGRAS ---------- */
  /* Cada regra devolve null ou {id, tone, title, text, items?, actions?} */
  const RULES = [
    function overdue() {
      const list = ST.overdueTasks();
      if (!list.length) return null;
      const worst = list.slice().sort((a, b) => (a.due || '').localeCompare(b.due || ''))[0];
      return {
        id: 'overdue', tone: 'critical', title: `${list.length} demanda${list.length > 1 ? 's' : ''} em atraso`,
        text: `A mais antiga é <strong>${esc(worst.title)}</strong>, vencida ${esc(U.fmtRelative(worst.due))}. Atraso não some sozinho: ou você faz, ou remarca o prazo com honestidade.`,
        items: list.slice(0, 4).map(t => `${esc(t.title)} — ${esc(U.fmtRelative(t.due))}`),
        actions: [
          { label: 'Ver demandas', run: () => App.go('tasks', { filter: 'overdue' }) },
          { label: 'Remarcar a mais antiga', run: () => App.forms.task(worst.id) }
        ]
      };
    },
    function todayAgenda() {
      const items = ST.dayAgenda(U.today()).filter(i => !i.done && i.kind !== 'task');
      if (!items.length) return null;
      return {
        id: 'agenda-hoje', tone: 'accent', title: `Hoje você tem ${items.length} compromisso${items.length > 1 ? 's' : ''}`,
        items: items.map(i => `${i.time ? '<strong>' + esc(i.time) + '</strong> · ' : ''}${esc(i.title)}`),
        actions: [{ label: 'Abrir agenda', run: () => App.go('calendar') }]
      };
    },
    function dueToday() {
      const list = ST.dueTodayTasks();
      if (!list.length) return null;
      return {
        id: 'due-hoje', tone: 'warning', title: `${list.length} demanda${list.length > 1 ? 's vencem' : ' vence'} hoje`,
        items: list.map(t => esc(t.title)),
        actions: [{ label: 'Ver no quadro', run: () => App.go('tasks') }]
      };
    },
    function wipLimit() {
      const doing = ST.tasksByStatus('doing');
      const limit = ST.settings.wipLimit || 3;
      if (doing.length <= limit) return null;
      return {
        id: 'wip', tone: 'warning', title: `${doing.length} coisas em andamento ao mesmo tempo`,
        text: `Seu limite combinado é ${limit}. Trabalho paralelo demais é o jeito mais eficiente de não terminar nada. Escolha uma para fechar hoje e devolva as outras para "A fazer".`,
        actions: [{ label: 'Ver quadro', run: () => App.go('tasks') }]
      };
    },
    function stalledDoing() {
      const stale = ST.tasksByStatus('doing').filter(t => U.daysBetween(String(t.updatedAt || '').slice(0, 10), U.today()) >= 5);
      if (!stale.length) return null;
      const t = stale[0];
      return {
        id: 'parada-' + t.id, tone: 'warning', title: 'Uma demanda parou no meio do caminho',
        text: `<strong>${esc(t.title)}</strong> está "em andamento" há ${U.daysBetween(String(t.updatedAt).slice(0, 10), U.today())} dias sem atualização. Ela travou, ficou grande demais, ou só saiu do radar?`,
        actions: [
          { label: 'Abrir', run: () => App.forms.task(t.id) },
          { label: 'Marcar como aguardando', run: () => { ST.update('tasks', t.id, { status: 'waiting' }); UI.toast('Movida para Aguardando'); } }
        ]
      };
    },
    function waitingTooLong() {
      const stale = ST.tasksByStatus('waiting').filter(t => U.daysBetween(String(t.updatedAt || '').slice(0, 10), U.today()) >= 7);
      if (!stale.length) return null;
      const t = stale[0];
      return {
        id: 'aguardando-' + t.id, tone: 'warning', title: 'Hora de cobrar um retorno',
        text: `<strong>${esc(t.title)}</strong> está aguardando terceiros há ${U.daysBetween(String(t.updatedAt).slice(0, 10), U.today())} dias. Ninguém vai lembrar por você — um lembrete educado hoje evita duas semanas de atraso.`,
        actions: [{ label: 'Abrir demanda', run: () => App.forms.task(t.id) }]
      };
    },
    function projectSilence() {
      const quiet = ST.activeProjects().filter(p => {
        const last = (p.updates || []).length ? p.updates[0].date : String(p.updatedAt || '').slice(0, 10);
        return U.daysBetween(last, U.today()) >= 14;
      });
      if (!quiet.length) return null;
      const p = quiet[0];
      return {
        id: 'projeto-quieto-' + p.id, tone: '', title: 'Um projeto está em silêncio',
        text: `<strong>${esc(p.name)}</strong> (${esc(ST.sectorName(p.sectorId))}) não recebe atualização há mais de duas semanas. Projeto sem notícia é projeto que o setor acha que morreu.`,
        actions: [{ label: 'Ver projeto', run: () => App.go('projects', { open: p.id }) }]
      };
    },
    function insightsParados() {
      const novos = ST.state.insights.filter(i => i.status === 'novo' && U.daysBetween(String(i.createdAt || '').slice(0, 10), U.today()) >= 7);
      if (!novos.length) return null;
      return {
        id: 'insights-parados', tone: '', title: `${novos.length} insight${novos.length > 1 ? 's' : ''} esperando decisão`,
        text: 'Você anotou, mas não decidiu o que fazer. Cada um deles é: vira projeto, vira tarefa, ou vai para o arquivo — sem meio-termo.',
        items: novos.slice(0, 3).map(i => esc(i.title)),
        actions: [{ label: 'Revisar insights', run: () => App.go('insights') }]
      };
    },
    function meetingFollowUp() {
      const recent = ST.state.meetings.filter(m => U.daysBetween(m.date, U.today()) >= 0 && U.daysBetween(m.date, U.today()) <= 3);
      const semAcao = recent.filter(m => !(m.taskIds || []).length);
      if (!semAcao.length) return null;
      const m = semAcao[0];
      return {
        id: 'reuniao-sem-acao-' + m.id, tone: '', title: 'Reunião sem desdobramento',
        text: `<strong>${esc(m.title)}</strong> (${esc(U.fmtRelative(m.date))}) não gerou nenhuma demanda. Ou foi uma conversa que não precisava existir, ou tem algo que você combinou e ainda não registrou.`,
        actions: [{ label: 'Abrir reunião', run: () => App.views.meetings.detail(m.id) }]
      };
    },
    function milestoneSoon() {
      const soon = [];
      ST.activeProjects().forEach(p => (p.milestones || []).forEach(ms => {
        if (!ms.done && ms.due) {
          const d = U.daysBetween(U.today(), ms.due);
          if (d >= 0 && d <= 5) soon.push({ p, ms, d });
        }
      }));
      if (!soon.length) return null;
      const s = soon.sort((a, b) => a.d - b.d)[0];
      return {
        id: 'marco-' + s.ms.id, tone: 'accent', title: 'Marco chegando',
        text: `<strong>${esc(s.ms.title)}</strong>, do projeto ${esc(s.p.name)}, vence ${esc(U.fmtRelative(s.ms.due))}.`,
        actions: [{ label: 'Ver projeto', run: () => App.go('projects', { open: s.p.id }) }]
      };
    },
    function journalCheckin() {
      if (ST.journalOf(U.today())) return null;
      if (new Date().getHours() < 15) return null;
      return {
        id: 'diario-' + U.today(), tone: '', title: 'Fecha o dia comigo?',
        text: 'Cinco minutos de diário hoje é o que te permite responder "o que eu fiz nesses seis meses?" com números e histórias, em vez de com uma sensação vaga.',
        actions: [{ label: 'Registrar o dia', run: () => App.forms.journal() }]
      };
    },
    function weeklyReview() {
      const dow = new Date().getDay();
      if (dow !== 5) return null;                       // sexta-feira
      const from = U.startOfWeek(U.today(), 1);
      const done = ST.doneBetween(from, U.today()).length;
      return {
        id: 'revisao-' + from, tone: 'accent', title: 'Sexta-feira: revisão da semana',
        text: `Você concluiu <strong>${done}</strong> demanda${done === 1 ? '' : 's'} esta semana. Vale meia hora para limpar o quadro, atualizar os projetos e deixar a segunda-feira pronta.`,
        actions: [
          { label: 'Abrir revisão', run: () => review() },
          { label: 'Gerar relatório', run: () => App.report.open() }
        ]
      };
    },
    function celebrate() {
      const from = U.startOfWeek(U.today(), 1);
      const done = ST.doneBetween(from, U.today()).length;
      const goal = ST.settings.goals.tasksPerWeek || 8;
      if (done < goal) return null;
      return {
        id: 'meta-' + from, tone: 'good', title: `Meta da semana batida — ${done} entregas`,
        text: `${pick(voice().praise)} Você combinou ${goal} por semana e já passou disso. Registre no diário o que fez a semana funcionar; isso é o tipo de coisa que se esquece.`,
        actions: [{ label: 'Anotar no diário', run: () => App.forms.journal() }]
      };
    },
    function backupReminder() {
      const last = ST.state.meta.lastExport;
      const days = last ? U.daysBetween(String(last).slice(0, 10), U.today()) : 999;
      if (days < 14) return null;
      return {
        id: 'backup', tone: 'warning', title: 'Faz tempo que você não exporta um backup',
        text: 'Seus dados moram neste navegador. Um arquivo exportado hoje é o que salva meses de registro se algo acontecer com a máquina.',
        actions: [{ label: 'Exportar agora', run: () => App.views.settings.exportNow() }]
      };
    }
  ];

  /** Executa as regras respeitando dispensas do dia. */
  function nudges() {
    const dismissed = ST.state.companionState.dismissed || {};
    const out = [];
    RULES.forEach(rule => {
      let msg = null;
      try { msg = rule(); } catch (e) { console.error('regra falhou', e); }
      if (msg && dismissed[msg.id] !== U.today()) out.push(msg);
    });
    return out;
  }

  /* ---------- BRIEFING ---------- */
  function briefingText() {
    const top = ST.prioritized(3);
    const agenda = ST.dayAgenda(U.today()).filter(i => i.kind !== 'task');
    const parts = [];
    parts.push(voice().hello(name()));
    if (agenda.length) parts.push(`Você tem <strong>${agenda.length}</strong> compromisso${agenda.length > 1 ? 's' : ''} hoje${agenda[0].time ? `, o primeiro às <strong>${esc(agenda[0].time)}</strong>` : ''}.`);
    else parts.push('Sua agenda de hoje está livre — dia bom para trabalho profundo.');
    if (top.length) parts.push(`Se der para fazer só uma coisa, que seja: <strong>${esc(top[0].title)}</strong>.`);
    return parts.join(' ');
  }

  /* ---------- CONVERSA ---------- */
  const QUICK = [
    { id: 'agora', label: 'O que faço agora?' },
    { id: 'semana', label: 'Como está a semana?' },
    { id: 'travado', label: 'O que está travado?' },
    { id: 'setores', label: 'Como estão os setores?' },
    { id: 'revisao', label: 'Revisão semanal' }
  ];

  function answer(intent) {
    const today = U.today();
    if (intent === 'agora') {
      const top = ST.prioritized(5);
      if (!top.length) return { title: 'Nada na fila', text: voice().empty };
      const t = top[0];
      return {
        title: 'Comece por esta',
        text: `<strong>${esc(t.title)}</strong>${t.sectorId ? ' · ' + esc(ST.sectorName(t.sectorId)) : ''}<br>` +
          `${t.due ? 'Prazo ' + esc(U.fmtRelative(t.due)) + '. ' : ''}Prioridade ${esc(ST.label.priority(t.priority))}.` +
          (t.estimateH ? ` Estimativa de ${t.estimateH}h — reserve um bloco de foco.` : ''),
        items: top.slice(1, 4).map((x, i) => `${i + 2}º · ${esc(x.title)}`),
        actions: [
          { label: 'Abrir', run: () => App.forms.task(t.id) },
          t.status !== 'doing' ? { label: 'Começar agora', run: () => { ST.update('tasks', t.id, { status: 'doing' }); UI.toast('Bom trabalho! Movida para Em andamento', 'good'); } } : null
        ].filter(Boolean)
      };
    }
    if (intent === 'semana') {
      const from = U.startOfWeek(today, 1);
      const done = ST.doneBetween(from, today);
      const meets = ST.meetingsBetween(from, today);
      const goal = ST.settings.goals.tasksPerWeek || 8;
      const mins = U.sum(ST.state.timeLogs.filter(l => l.date >= from && l.date <= today).map(l => l.minutes));
      return {
        title: 'Sua semana até aqui',
        text: `<strong>${done.length}</strong> de ${goal} demandas concluídas · <strong>${meets.length}</strong> reuniões · <strong>${U.fmtDuration(mins)}</strong> de trabalho registrado.` +
          (done.length >= goal ? ` ${pick(voice().praise)}` : done.length === 0 ? ' Semana ainda em branco — o que dá para fechar hoje?' : ' Dá para chegar lá.'),
        items: done.slice(0, 4).map(t => '✓ ' + esc(t.title)),
        actions: [{ label: 'Ver relatórios', run: () => App.go('reports') }]
      };
    }
    if (intent === 'travado') {
      const waiting = ST.tasksByStatus('waiting');
      const overdue = ST.overdueTasks();
      if (!waiting.length && !overdue.length) return { title: 'Nada travado', text: 'Nenhuma demanda esperando terceiros nem em atraso. Raro e bom.' };
      return {
        title: 'O que está travado',
        text: `${overdue.length} em atraso e ${waiting.length} aguardando terceiros.`,
        items: waiting.concat(overdue).slice(0, 5).map(t => `${esc(t.title)} — ${t.status === 'waiting' ? 'aguardando' : 'atrasada ' + esc(U.fmtRelative(t.due))}`),
        actions: [{ label: 'Ver quadro', run: () => App.go('tasks') }]
      };
    }
    if (intent === 'setores') {
      const rows = ST.state.sectors.map(s => {
        const open = ST.openTasks().filter(t => t.sectorId === s.id).length;
        const lastMeet = ST.state.meetings.filter(m => m.sectorId === s.id).sort((a, b) => b.date.localeCompare(a.date))[0];
        return { s, open, days: lastMeet ? U.daysBetween(lastMeet.date, today) : null };
      });
      const esquecidos = rows.filter(r => r.days === null || r.days > 30);
      return {
        title: 'Panorama dos setores',
        text: esquecidos.length
          ? `Você não conversa com <strong>${esc(esquecidos.map(r => r.s.name).join(', '))}</strong> há mais de um mês. Engenheiro de IA que só atende quem grita acaba refém da urgência alheia.`
          : 'Todos os setores tiveram contato no último mês. Cobertura boa.',
        items: rows.filter(r => r.open > 0).slice(0, 5).map(r => `${esc(r.s.name)} — ${r.open} demanda(s) aberta(s)`),
        actions: [{ label: 'Ver relatórios', run: () => App.go('reports') }]
      };
    }
    if (intent === 'revisao') { review(); return null; }
    return { title: 'Não entendi', text: 'Tente uma das perguntas rápidas aqui embaixo.' };
  }

  /* ---------- REVISÃO SEMANAL ---------- */
  function review() {
    const from = U.startOfWeek(U.today(), 1);
    const done = ST.doneBetween(from, U.today());
    const meets = ST.meetingsBetween(from, U.today());
    const newInsights = ST.state.insights.filter(i => String(i.createdAt || '').slice(0, 10) >= from);
    const overdue = ST.overdueTasks();
    const waiting = ST.tasksByStatus('waiting');
    const mins = U.sum(ST.state.timeLogs.filter(l => l.date >= from).map(l => l.minutes));

    const box = (label, value, hint) => `<div class="stat"><span class="stat__label">${esc(label)}</span><span class="stat__value">${esc(value)}</span>${hint ? `<span class="stat__meta">${esc(hint)}</span>` : ''}</div>`;
    const listOf = (arr, fn) => arr.length ? `<ul style="display:grid;gap:5px;margin-top:6px">${arr.map(x => `<li class="small" style="display:flex;gap:7px"><span class="muted">•</span><span>${fn(x)}</span></li>`).join('')}</ul>` : `<p class="small muted" style="margin-top:6px">Nada aqui.</p>`;

    const body = el('div', { html: `
      <div class="grid grid--stats" style="margin-bottom:18px">
        ${box('Entregas', done.length, 'meta: ' + (ST.settings.goals.tasksPerWeek || 8))}
        ${box('Reuniões', meets.length, '')}
        ${box('Insights novos', newInsights.length, '')}
        ${box('Tempo registrado', U.fmtDuration(mins), '')}
      </div>
      <div class="section-title">Você entregou</div>
      ${listOf(done, t => esc(t.title))}
      <div class="divider"></div>
      <div class="section-title">Precisa de decisão sua</div>
      ${listOf(overdue.concat(waiting).slice(0, 8), t => `${esc(t.title)} <span class="muted">— ${t.status === 'waiting' ? 'aguardando terceiros' : 'atrasada ' + esc(U.fmtRelative(t.due))}</span>`)}
      <div class="divider"></div>
      <div class="section-title">Três perguntas para fechar a semana</div>
      <div class="form-grid" style="margin-top:8px">
        ${App.forms.helpers.area('wins', 'O que funcionou bem?', '', { col2: true, rows: 2 })}
        ${App.forms.helpers.area('blockers', 'O que travou e por quê?', '', { col2: true, rows: 2 })}
        ${App.forms.helpers.area('tomorrow', 'Qual a prioridade número 1 da próxima semana?', '', { col2: true, rows: 2 })}
      </div>` });

    UI.modal({
      title: 'Revisão da semana', size: 'wide',
      subtitle: U.fmtDate(from) + ' — ' + U.fmtDate(U.today()),
      body,
      footer: ['spacer',
        { label: 'Fechar', onClick: ({ close }) => close() },
        { label: 'Salvar no diário', variant: 'primary', icon: 'check', onClick: ({ close }) => {
          const v = App.forms.helpers.readForm(body);
          const existing = ST.journalOf(U.today());
          const patch = {
            date: U.today(),
            wins: [existing && existing.wins, v.wins].filter(Boolean).join('\n'),
            blockers: [existing && existing.blockers, v.blockers].filter(Boolean).join('\n'),
            tomorrow: [existing && existing.tomorrow, v.tomorrow].filter(Boolean).join('\n'),
            focus: (existing && existing.focus) || 'Revisão semanal',
            energy: (existing && existing.energy) || 3, mood: (existing && existing.mood) || 3,
            learned: (existing && existing.learned) || ''
          };
          if (existing) ST.update('journal', existing.id, patch); else ST.add('journal', patch);
          UI.toast('Revisão salva no diário ✓', 'good');
          close();
        } }]
    });
  }

  /* ---------- RENDER ---------- */
  function bubble(msg, opts) {
    opts = opts || {};
    const node = el('div', { class: 'bubble' + (msg.tone ? ' bubble--' + msg.tone : '') });
    if (msg.title) node.appendChild(el('div', { class: 'bubble__head', html: (opts.icon || U.icon('sparkles', 'i--sm')) + '<span>' + esc(msg.title) + '</span>' }));
    if (msg.text) node.appendChild(el('div', { html: msg.text }));
    if (msg.items && msg.items.length) node.appendChild(el('ul', { html: msg.items.map(i => `<li><span>${i}</span></li>`).join('') }));
    const acts = (msg.actions || []).slice();
    if (opts.dismissable !== false && msg.id) acts.push({ label: 'Depois', ghost: true, run: () => dismiss(msg.id) });
    if (acts.length) {
      const row = el('div', { class: 'bubble__actions' });
      acts.forEach(a => row.appendChild(el('button', {
        class: 'btn btn--sm' + (a.ghost ? ' btn--ghost' : ''), text: a.label,
        onclick: () => a.run()
      })));
      node.appendChild(row);
    }
    U.hydrateIcons(node);
    return node;
  }

  function dismiss(id) {
    ST.state.companionState.dismissed[id] = U.today();
    ST.emit('companion');
    render();
  }

  function render() {
    const body = U.$('#companionBody'), foot = U.$('#companionFoot');
    if (!body) return;
    const cfg = ST.settings.companion;
    U.$('#companionName').textContent = cfg.name || 'Sabiá';
    U.$('#companionAvatar').innerHTML = App.brand.birdSvg('var(--brand-navy)');

    const list = nudges();
    U.$('#companionStatus').textContent = list.length ? `${list.length} ponto${list.length > 1 ? 's' : ''} de atenção` : 'tudo sob controle';
    const dot = U.$('#companionDot');
    if (dot) dot.hidden = !list.some(n => n.tone === 'critical' || n.tone === 'warning');

    body.innerHTML = '';
    body.appendChild(bubble({ text: briefingText() }, { dismissable: false }));

    if (!list.length) {
      body.appendChild(bubble({ tone: 'good', title: 'Nada te cobrando agora', text: voice().empty }, { dismissable: false }));
    } else {
      list.forEach(msg => body.appendChild(bubble(msg)));
    }

    (ST.state.companionState.chat || []).slice(-8).forEach(m => {
      if (m.role === 'me') body.appendChild(el('div', { class: 'bubble bubble--me', text: m.text }));
      else body.appendChild(bubble(m.msg, { dismissable: false }));
    });

    body.appendChild(el('p', { class: 'small muted', style: { textAlign: 'center', padding: '6px 0' }, text: voice().sign }));
    body.scrollTop = body.scrollHeight;

    foot.innerHTML = '';
    QUICK.forEach(q => foot.appendChild(el('button', {
      class: 'btn btn--sm', text: q.label,
      onclick: () => {
        const chat = ST.state.companionState.chat || (ST.state.companionState.chat = []);
        chat.push({ role: 'me', text: q.label });
        const res = answer(q.id);
        if (res) chat.push({ role: 'bot', msg: res });
        ST.state.companionState.chat = chat.slice(-12);
        ST.emit('companion');
        render();
      }
    })));
  }

  /* ---------- NOTIFICAÇÕES DO NAVEGADOR ---------- */
  const notified = {};
  function checkReminders() {
    if (!ST.settings.companion.notifications) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    ST.dayAgenda(U.today()).forEach(item => {
      if (!item.time || item.done || notified[item.id]) return;
      const [h, m] = item.time.split(':').map(Number);
      const delta = (h * 60 + m) - mins;
      if (delta >= 0 && delta <= 15) {
        notified[item.id] = true;
        try {
          new Notification(`${item.time} · ${item.title}`, {
            body: (ST.settings.companion.name || 'Sabiá') + ': começa em ' + delta + ' min',
            tag: item.id
          });
        } catch (e) { /* silencioso */ }
      }
    });
  }
  function requestNotifications() {
    if (typeof Notification === 'undefined') { UI.toast('Este navegador não suporta notificações', 'bad'); return Promise.resolve(false); }
    return Notification.requestPermission().then(p => {
      const ok = p === 'granted';
      ST.settings.companion.notifications = ok;
      ST.emit('settings');
      UI.toast(ok ? 'Notificações ativadas ✓' : 'Permissão negada pelo navegador', ok ? 'good' : 'bad');
      return ok;
    });
  }

  function start() {
    render();
    setInterval(checkReminders, 60000);
    setInterval(() => { if (U.$('#app').classList.contains('companion-open')) render(); }, 300000);
  }

  App.companion = { render, start, nudges, answer, review, briefingText, requestNotifications, bubble, dismiss, QUICK };
})(window.App);
