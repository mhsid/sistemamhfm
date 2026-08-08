/* ============================================================
   store.js — estado, persistência, catálogos e seletores
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util;
  const KEY = 'nucleo-ia:state:v1';
  const BACKUP_KEY = 'nucleo-ia:backups:v1';
  const SCHEMA = 1;

  /* ---------- CATÁLOGOS ---------- */
  /* `color` = leitura semântica nas colunas do quadro.
     `series` = cor de gráfico; a ordem foi validada para daltonismo e
     contraste nos dois temas — não troque sem revalidar. */
  const TASK_STATUS = [
    { id: 'backlog', label: 'Backlog',    short: 'Backlog',   color: 'var(--ink-3)',   series: 'var(--s5)', hint: 'Ideias e pedidos ainda não priorizados' },
    { id: 'todo',    label: 'A fazer',    short: 'A fazer',   color: 'var(--s1)',      series: 'var(--s1)', hint: 'Priorizado e pronto para começar' },
    { id: 'doing',   label: 'Em andamento', short: 'Fazendo', color: 'var(--warning)', series: 'var(--s4)', hint: 'Você está trabalhando nisso agora' },
    { id: 'waiting', label: 'Aguardando',  short: 'Aguardando', color: 'var(--serious)', series: 'var(--s7)', hint: 'Depende de terceiros, aprovação ou informação' },
    { id: 'done',    label: 'Concluído',   short: 'Concluído', color: 'var(--good)',    series: 'var(--s2)', hint: 'Entregue e validado' }
  ];
  const PRIORITY = [
    { id: 'baixa',   label: 'Baixa',   weight: 1, color: 'var(--axis)' },
    { id: 'media',   label: 'Média',   weight: 2, color: 'var(--s1)' },
    { id: 'alta',    label: 'Alta',    weight: 3, color: 'var(--warning)' },
    { id: 'critica', label: 'Crítica', weight: 4, color: 'var(--critical)' }
  ];
  const PROJECT_STAGE = [
    { id: 'descoberta',      label: 'Descoberta',      hint: 'Entendendo o problema com o setor' },
    { id: 'desenho',         label: 'Desenho',         hint: 'Definindo a solução e o escopo' },
    { id: 'desenvolvimento', label: 'Desenvolvimento', hint: 'Construindo' },
    { id: 'piloto',          label: 'Piloto',          hint: 'Testando com usuários reais' },
    { id: 'producao',        label: 'Em produção',     hint: 'Rodando e gerando valor' }
  ];
  const PROJECT_STATUS = [
    { id: 'ativo',     label: 'Ativo',     tone: 'accent' },
    { id: 'pausado',   label: 'Pausado',   tone: 'warning' },
    { id: 'concluido', label: 'Concluído', tone: 'good' },
    { id: 'cancelado', label: 'Cancelado', tone: '' }
  ];
  const INSIGHT_STATUS = [
    { id: 'novo',       label: 'Novo',        tone: 'accent' },
    { id: 'avaliando',  label: 'Em avaliação', tone: 'warning' },
    { id: 'aprovado',   label: 'Aprovado',    tone: 'good' },
    { id: 'convertido', label: 'Virou entrega', tone: 'good' },
    { id: 'arquivado',  label: 'Arquivado',   tone: '' }
  ];
  const EVENT_TYPE = [
    { id: 'reuniao',  label: 'Reunião',  color: 'var(--s1)', emoji: '👥' },
    { id: 'prazo',    label: 'Prazo',    color: 'var(--critical)', emoji: '🎯' },
    { id: 'foco',     label: 'Bloco de foco', color: 'var(--s7)', emoji: '🎧' },
    { id: 'evento',   label: 'Evento do colégio', color: 'var(--s2)', emoji: '🏫' },
    { id: 'lembrete', label: 'Lembrete', color: 'var(--s4)', emoji: '🔔' },
    { id: 'formacao', label: 'Formação/estudo', color: 'var(--s5)', emoji: '📚' }
  ];
  const MEETING_TYPE = [
    { id: 'levantamento', label: 'Levantamento de demanda' },
    { id: 'alinhamento',  label: 'Alinhamento' },
    { id: 'apresentacao', label: 'Apresentação / demo' },
    { id: 'treinamento',  label: 'Treinamento' },
    { id: 'acompanhamento', label: 'Acompanhamento' },
    { id: 'diretoria',    label: 'Reunião de diretoria' },
    { id: 'outro',        label: 'Outro' }
  ];
  const MOODS = [
    { id: 1, emoji: '😞', label: 'Difícil' },
    { id: 2, emoji: '😕', label: 'Abaixo' },
    { id: 3, emoji: '😐', label: 'Normal' },
    { id: 4, emoji: '🙂', label: 'Bom' },
    { id: 5, emoji: '🤩', label: 'Excelente' }
  ];
  const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];

  const COLLECTIONS = ['sectors', 'tasks', 'projects', 'meetings', 'insights', 'notes', 'events', 'journal', 'timeLogs'];

  /* ---------- ESTADO PADRÃO ---------- */
  function defaultState() {
    return {
      meta: { schema: SCHEMA, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastExport: null },
      settings: {
        userName: '', role: 'Engenheiro de IA', school: 'Colégio Fazer Crescer',
        theme: 'auto',
        weekStart: 1,
        workdayStart: '07:30', workdayEnd: '17:00',
        wipLimit: 3,
        goals: { tasksPerWeek: 8, hoursSavedMonth: 40, meetingsPerWeek: 4 },
        companion: { name: 'Sabiá', persona: 'parceiro', enabled: true, notifications: false, briefingHour: 8 },
        onboarded: false
      },
      sectors: [], tasks: [], projects: [], meetings: [], insights: [],
      notes: [], events: [], journal: [], timeLogs: [],
      companionState: { lastBriefing: null, dismissed: {}, chat: [], lastSeen: null }
    };
  }

  /* ---------- PERSISTÊNCIA ---------- */
  let state = defaultState();
  const listeners = [];
  let lastSnapshot = null;

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { console.warn('localStorage indisponível', e); }
    if (!raw) { state = App.seed.build(defaultState()); persist(); return; }
    try {
      const parsed = JSON.parse(raw);
      state = migrate(parsed);
    } catch (e) {
      console.error('Falha ao ler dados salvos', e);
      state = App.seed.build(defaultState());
    }
  }

  function migrate(data) {
    const base = defaultState();
    const out = Object.assign(base, data);
    out.meta = Object.assign(base.meta, data.meta || {});
    out.settings = Object.assign(base.settings, data.settings || {});
    out.settings.goals = Object.assign(base.settings.goals, (data.settings || {}).goals || {});
    out.settings.companion = Object.assign(base.settings.companion, (data.settings || {}).companion || {});
    out.companionState = Object.assign(base.companionState, data.companionState || {});
    COLLECTIONS.forEach(c => { if (!Array.isArray(out[c])) out[c] = []; });
    out.meta.schema = SCHEMA;
    return out;
  }

  const persist = U.debounce(function () {
    state.meta.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Não foi possível salvar', e);
      if (App.ui) App.ui.toast('Não consegui salvar localmente. Exporte um backup!', 'bad');
    }
  }, 250);

  function emit(reason) {
    persist();
    listeners.forEach(fn => { try { fn(state, reason); } catch (e) { console.error(e); } });
  }
  const subscribe = fn => { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); };

  /* ---------- CRUD GENÉRICO ---------- */
  function add(collection, obj) {
    const now = new Date().toISOString();
    const item = Object.assign({ id: U.uid(collection.slice(0, 3)), createdAt: now, updatedAt: now }, obj);
    state[collection].unshift(item);
    emit(collection);
    return item;
  }
  function update(collection, id, patch) {
    const item = state[collection].find(x => x.id === id);
    if (!item) return null;
    Object.assign(item, patch, { updatedAt: new Date().toISOString() });
    emit(collection);
    return item;
  }
  function remove(collection, id) {
    const idx = state[collection].findIndex(x => x.id === id);
    if (idx < 0) return null;
    const [item] = state[collection].splice(idx, 1);
    lastSnapshot = { collection, item, idx };
    emit(collection);
    return item;
  }
  function undoRemove() {
    if (!lastSnapshot) return false;
    state[lastSnapshot.collection].splice(lastSnapshot.idx, 0, lastSnapshot.item);
    lastSnapshot = null;
    emit('undo');
    return true;
  }
  const get = (collection, id) => state[collection].find(x => x.id === id) || null;

  /* ---------- SELETORES ---------- */
  const sectorOf = id => state.sectors.find(s => s.id === id) || null;
  const sectorName = id => (sectorOf(id) || {}).name || 'Sem setor';
  const sectorColor = id => (sectorOf(id) || {}).color || 'var(--ink-3)';

  const openTasks = () => state.tasks.filter(t => t.status !== 'done');
  const tasksByStatus = status => state.tasks.filter(t => t.status === status);
  const overdueTasks = () => openTasks().filter(t => t.due && t.due < U.today());
  const dueTodayTasks = () => openTasks().filter(t => t.due === U.today());
  const dueSoonTasks = (days) => {
    const limit = U.addDays(U.today(), days === undefined ? 7 : days);
    return openTasks().filter(t => t.due && t.due >= U.today() && t.due <= limit);
  };
  const doneBetween = (from, to) => state.tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt.slice(0, 10) >= from && t.completedAt.slice(0, 10) <= to);
  const activeProjects = () => state.projects.filter(p => p.status === 'ativo');
  const tasksOfProject = pid => state.tasks.filter(t => t.projectId === pid);
  const meetingsBetween = (from, to) => state.meetings.filter(m => m.date >= from && m.date <= to);
  const journalOf = date => state.journal.find(j => j.date === date) || null;

  /** Eventos do dia: eventos próprios + reuniões + prazos de demandas. */
  function dayAgenda(date) {
    const items = [];
    state.events.filter(e => e.date === date).forEach(e => items.push({
      kind: 'event', id: e.id, time: e.time || '', title: e.title, type: e.type,
      color: (EVENT_TYPE.find(t => t.id === e.type) || {}).color || 'var(--s1)',
      sectorId: e.sectorId, done: !!e.done, ref: e
    }));
    state.meetings.filter(m => m.date === date).forEach(m => items.push({
      kind: 'meeting', id: m.id, time: m.time || '', title: m.title, type: 'reuniao',
      color: 'var(--s1)', sectorId: m.sectorId, done: false, ref: m
    }));
    state.tasks.filter(t => t.due === date && t.status !== 'done').forEach(t => items.push({
      kind: 'task', id: t.id, time: '', title: t.title, type: 'prazo',
      color: 'var(--critical)', sectorId: t.sectorId, done: false, ref: t
    }));
    return items.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  }

  /** Score de prioridade — usado pelo companheiro para sugerir o próximo passo. */
  function taskScore(task) {
    if (task.status === 'done') return -1;
    const pri = (PRIORITY.find(p => p.id === task.priority) || { weight: 2 }).weight;
    let score = pri * 10;
    if (task.due) {
      const d = U.daysBetween(U.today(), task.due);
      if (d < 0) score += 40 + Math.min(Math.abs(d), 20) * 2;   // atrasada
      else if (d === 0) score += 32;
      else if (d <= 2) score += 20;
      else if (d <= 7) score += 10;
    }
    if (task.status === 'doing') score += 14;
    if (task.status === 'waiting') score -= 8;
    if (task.status === 'backlog') score -= 10;
    const proj = task.projectId ? get('projects', task.projectId) : null;
    if (proj && proj.status === 'ativo') score += 5;
    if (proj && (proj.stage === 'piloto' || proj.stage === 'producao')) score += 4;
    const age = U.daysBetween(String(task.createdAt || '').slice(0, 10), U.today());
    score += Math.min(age / 7, 6); // envelhecimento suave
    return score;
  }
  const prioritized = (limit) => openTasks().slice().sort((a, b) => taskScore(b) - taskScore(a)).slice(0, limit || 5);

  /** Horas/mês economizadas somando projetos em piloto/produção. */
  function impactHoursMonth() {
    return U.sum(state.projects
      .filter(p => (p.stage === 'piloto' || p.stage === 'producao') && p.status !== 'cancelado')
      .map(p => (p.impact || {}).hoursSavedMonth));
  }
  function peopleImpacted() {
    return U.sum(state.projects.filter(p => p.status !== 'cancelado').map(p => (p.impact || {}).peopleImpacted));
  }

  /** Sequência de dias consecutivos com registro no diário (até hoje/ontem). */
  function streak() {
    const dates = new Set(state.journal.map(j => j.date));
    let cursor = U.today(), n = 0;
    if (!dates.has(cursor)) cursor = U.addDays(cursor, -1);
    while (dates.has(cursor)) { n++; cursor = U.addDays(cursor, -1); }
    return n;
  }

  /* ---------- EXPORT / IMPORT / BACKUP ---------- */
  function exportData() {
    state.meta.lastExport = new Date().toISOString();
    emit('export');
    return JSON.stringify(state, null, 2);
  }
  function importData(json, mode) {
    const incoming = typeof json === 'string' ? JSON.parse(json) : json;
    if (!incoming || typeof incoming !== 'object') throw new Error('Arquivo inválido');
    snapshotBackup('antes-da-importacao');
    if (mode === 'merge') {
      COLLECTIONS.forEach(c => {
        const existing = new Set(state[c].map(x => x.id));
        (incoming[c] || []).forEach(item => { if (!existing.has(item.id)) state[c].push(item); });
      });
    } else {
      state = migrate(incoming);
    }
    emit('import');
  }
  function snapshotBackup(label) {
    try {
      const list = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
      list.unshift({ at: new Date().toISOString(), label: label || 'automático', data: JSON.stringify(state) });
      localStorage.setItem(BACKUP_KEY, JSON.stringify(list.slice(0, 5)));
    } catch (e) { console.warn('backup falhou', e); }
  }
  function listBackups() {
    try { return JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]').map((b, i) => ({ i, at: b.at, label: b.label })); }
    catch (e) { return []; }
  }
  function restoreBackup(index) {
    const list = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
    if (!list[index]) return false;
    state = migrate(JSON.parse(list[index].data));
    emit('restore');
    return true;
  }
  function resetAll(withSeed) {
    snapshotBackup('antes-do-reset');
    state = withSeed ? App.seed.build(defaultState()) : defaultState();
    if (!withSeed) state.sectors = App.seed.sectors();
    emit('reset');
  }

  App.store = {
    SCHEMA, TASK_STATUS, PRIORITY, PROJECT_STAGE, PROJECT_STATUS, INSIGHT_STATUS,
    EVENT_TYPE, MEETING_TYPE, MOODS, SERIES, COLLECTIONS,
    get state() { return state; },
    get settings() { return state.settings; },
    load, subscribe, emit, defaultState,
    add, update, remove, undoRemove, get,
    sectorOf, sectorName, sectorColor,
    openTasks, tasksByStatus, overdueTasks, dueTodayTasks, dueSoonTasks, doneBetween,
    activeProjects, tasksOfProject, meetingsBetween, journalOf, dayAgenda,
    taskScore, prioritized, impactHoursMonth, peopleImpacted, streak,
    exportData, importData, snapshotBackup, listBackups, restoreBackup, resetAll,
    label: {
      status: id => (TASK_STATUS.find(s => s.id === id) || {}).label || id,
      priority: id => (PRIORITY.find(p => p.id === id) || {}).label || id,
      stage: id => (PROJECT_STAGE.find(s => s.id === id) || {}).label || id,
      insight: id => (INSIGHT_STATUS.find(s => s.id === id) || {}).label || id,
      eventType: id => (EVENT_TYPE.find(t => t.id === id) || {}).label || id,
      meetingType: id => (MEETING_TYPE.find(t => t.id === id) || {}).label || id
    }
  };
})(window.App);
