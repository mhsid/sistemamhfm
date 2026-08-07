/* ============================================================
   views/journal.js — o diário de bordo do trabalho
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util, ST = App.store, UI = App.ui, C = App.charts;
  const { esc } = U;
  App.views = App.views || {};

  const state = { q: '', period: '90' };

  function filtered() {
    let list = ST.state.journal.slice();
    if (state.q) {
      const q = U.norm(state.q);
      list = list.filter(j => U.norm([j.focus, j.wins, j.blockers, j.learned, j.tomorrow].join(' ')).includes(q));
    }
    if (state.period !== 'all') list = list.filter(j => j.date >= U.addDays(U.today(), -Number(state.period)));
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }

  function entry(j) {
    const mood = ST.MOODS.find(m => m.id === j.mood) || ST.MOODS[2];
    const doneThatDay = ST.state.tasks.filter(t => String(t.completedAt || '').slice(0, 10) === j.date);
    const meetsThatDay = ST.state.meetings.filter(m => m.date === j.date);
    const block = (label, value, color) => value ? `
      <div style="display:grid;gap:2px">
        <span class="section-title" style="margin:0;color:${color || 'var(--ink-3)'}">${esc(label)}</span>
        <p class="small" style="white-space:pre-wrap;line-height:1.6">${esc(value)}</p>
      </div>` : '';

    return `<article class="card" data-journal="${j.date}" style="cursor:pointer">
      <div class="card__body" style="display:grid;gap:12px">
        <div class="row" style="gap:9px">
          <div style="text-align:center;min-width:46px">
            <div style="font-size:21px;font-weight:660;line-height:1">${U.parseISO(j.date).getDate()}</div>
            <div class="small muted">${esc(U.MONTHS_SHORT[U.parseISO(j.date).getMonth()])}</div>
          </div>
          <div style="flex:1;min-width:0">
            <strong style="font-size:13.5px">${esc(j.focus || 'Sem foco definido')}</strong>
            <div class="small muted">${esc(U.DAYS[U.parseISO(j.date).getDay()])} · ${esc(U.fmtRelative(j.date))}</div>
          </div>
          <span class="chip" title="Humor">${mood.emoji}</span>
          <span class="chip" title="Energia">⚡ ${j.energy}/5</span>
        </div>

        ${(doneThatDay.length || meetsThatDay.length) ? `<div class="row small muted" style="gap:12px;padding:7px 10px;background:var(--sunken);border-radius:var(--r-sm)">
          ${doneThatDay.length ? `<span>${U.icon('check', 'i--sm')} ${doneThatDay.length} entrega(s)</span>` : ''}
          ${meetsThatDay.length ? `<span>${U.icon('users', 'i--sm')} ${meetsThatDay.length} reunião(ões)</span>` : ''}
        </div>` : ''}

        ${block('O que deu certo', j.wins, 'var(--good-text)')}
        ${block('O que travou', j.blockers, 'var(--critical)')}
        ${block('O que aprendi', j.learned, 'var(--accent)')}
        ${block('Próximo passo', j.tomorrow)}
      </div>
    </article>`;
  }

  App.views.journal = {
    title: 'Diário',
    subtitle: () => {
      const s = ST.streak();
      return `${ST.state.journal.length} registros · sequência atual de ${s} dia${s === 1 ? '' : 's'}`;
    },
    render(root) {
      const list = filtered();
      const hoje = ST.journalOf(U.today());

      /* energia e humor — últimos 21 dias com registro */
      const recent = ST.state.journal.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-21);
      const series = [
        { name: 'Energia', color: 'var(--s1)', points: recent.map(j => ({ y: j.energy, label: U.fmtDate(j.date, 'short') })) },
        { name: 'Humor', color: 'var(--s2)', points: recent.map(j => ({ y: j.mood, label: U.fmtDate(j.date, 'short') })) }
      ];
      const heat = {};
      ST.state.journal.forEach(j => { heat[j.date] = (j.energy || 1); });

      const mediaEnergia = recent.length ? (U.sum(recent.map(j => j.energy)) / recent.length) : 0;
      const mediaHumor = recent.length ? (U.sum(recent.map(j => j.mood)) / recent.length) : 0;

      root.innerHTML = `
        <div class="card" style="margin-bottom:16px;${hoje ? '' : 'border-color:var(--accent-line);background:linear-gradient(140deg,var(--accent-soft),transparent 60%)'}">
          <div class="card__body row" style="gap:14px">
            <span style="font-size:30px">${hoje ? '📓' : '✍️'}</span>
            <div style="flex:1;min-width:180px">
              <h3 style="font-size:15px">${hoje ? 'Você já registrou hoje' : 'Como está sendo o seu dia?'}</h3>
              <p class="small muted">${hoje ? esc(hoje.focus || 'Registro salvo — pode complementar quando quiser.')
                : 'Escrever cinco minutos hoje é o que transforma "trabalhei muito" em "eis o que eu construí".'}</p>
            </div>
            <button class="btn ${hoje ? '' : 'btn--primary'}" data-today>${hoje ? 'Complementar registro' : 'Registrar o dia'}</button>
            <button class="btn" data-review>${U.icon('refresh', 'i--sm')}<span>Revisão semanal</span></button>
          </div>
        </div>

        <div class="grid grid--2" style="margin-bottom:16px">
          <div class="card">
            <div class="card__head"><div><h3>Energia e humor</h3><p>Últimos ${recent.length} registros · média ⚡ ${mediaEnergia.toFixed(1)} · 🙂 ${mediaHumor.toFixed(1)}</p></div></div>
            <div class="card__body">${recent.length > 1 ? C.lineArea(series, { height: 190, endLabel: false })
              : '<p class="small muted">Registre alguns dias para ver a evolução — padrões de energia dizem muito sobre onde você deve colocar as tarefas difíceis.</p>'}</div>
          </div>
          <div class="card">
            <div class="card__head"><div><h3>Constância do diário</h3><p>Dias em que você parou para escrever</p></div>
              <div class="card__actions"><span class="chip chip--accent">🔥 ${ST.streak()} dias</span></div></div>
            <div class="card__body">${C.heatmap(heat, { valueLabel: 'Energia' })}</div>
          </div>
        </div>

        <div class="toolbar">
          <div class="search-input">${U.icon('search', 'i--sm')}
            <input class="input" type="search" placeholder="Buscar no diário… (ex.: o que aprendi sobre reuniões)" value="${esc(state.q)}" data-f="q"></div>
          <select class="select" data-f="period">
            <option value="30" ${state.period === '30' ? 'selected' : ''}>Últimos 30 dias</option>
            <option value="90" ${state.period === '90' ? 'selected' : ''}>Últimos 90 dias</option>
            <option value="365" ${state.period === '365' ? 'selected' : ''}>Último ano</option>
            <option value="all" ${state.period === 'all' ? 'selected' : ''}>Tudo</option>
          </select>
        </div>

        ${list.length ? `<div class="grid grid--2">${list.map(entry).join('')}</div>`
          : `<div class="card"><div class="card__body">${UI.emptyState('📓', 'Diário em branco', 'Cada registro é uma foto do seu dia. Daqui a seis meses, essa é a única prova real do que você construiu.')}</div></div>`}`;

      U.hydrateIcons(root);
      U.on(root, 'input', 'input[data-f]', U.debounce((ev, n) => { state[n.dataset.f] = n.value; App.render(); }, 220));
      U.on(root, 'change', 'select[data-f]', (ev, n) => { state[n.dataset.f] = n.value; App.render(); });
      U.on(root, 'click', '[data-today]', () => App.forms.journal());
      U.on(root, 'click', '[data-review]', () => App.companion.review());
      U.on(root, 'click', '[data-journal]', (ev, n) => App.forms.journal(n.dataset.journal));
    }
  };
})(window.App);
