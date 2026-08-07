/* ============================================================
   forms.js — modais de criação/edição de todas as entidades
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util, ST = App.store, UI = App.ui;
  const { el, esc } = U;

  /* ---------- helpers de campo ---------- */
  const opt = (list, selected, blank) =>
    (blank ? `<option value="">${esc(blank)}</option>` : '') +
    list.map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(selected) ? 'selected' : ''}>${esc(o.label)}</option>`).join('');

  const sectorOptions = () => ST.state.sectors.map(s => ({ value: s.id, label: s.name }));
  const projectOptions = () => ST.state.projects.filter(p => p.status !== 'cancelado').map(p => ({ value: p.id, label: p.name }));
  const catOptions = list => list.map(x => ({ value: x.id, label: x.label }));

  function field(label, inner, opts) {
    opts = opts || {};
    return `<div class="field ${opts.col2 ? 'col-2' : ''}">
      <label class="field__label" for="${opts.id || ''}">${esc(label)}</label>${inner}
      ${opts.hint ? `<span class="field__hint">${esc(opts.hint)}</span>` : ''}</div>`;
  }
  const text = (name, label, value, o) => { o = o || {};
    return field(label, `<input class="input" type="${o.type || 'text'}" name="${name}" value="${esc(value || '')}" placeholder="${esc(o.placeholder || '')}" ${o.required ? 'required' : ''} ${o.attrs || ''}>`, o); };
  const area = (name, label, value, o) => { o = o || {};
    return field(label, `<textarea class="textarea" name="${name}" rows="${o.rows || 4}" placeholder="${esc(o.placeholder || '')}" style="${o.minHeight ? 'min-height:' + o.minHeight : ''}">${esc(value || '')}</textarea>`, o); };
  const select = (name, label, list, value, o) => { o = o || {};
    return field(label, `<select class="select" name="${name}">${opt(list, value, o.blank)}</select>`, o); };

  /** Lê todos os campos [name] de um container. */
  function readForm(root) {
    const out = {};
    U.$$('[name]', root).forEach(inp => {
      if (inp.type === 'checkbox') out[inp.name] = inp.checked;
      else if (inp.type === 'number') out[inp.name] = inp.value === '' ? 0 : Number(inp.value);
      else out[inp.name] = inp.value.trim ? inp.value.trim() : inp.value;
    });
    return out;
  }
  const tagsFrom = str => String(str || '').split(',').map(s => s.trim()).filter(Boolean);
  const tagsTo = arr => (arr || []).join(', ');

  /** Seletor 1–5 com emojis/números. */
  function ratingHtml(name, value, labels) {
    return `<div class="rating" data-rating="${name}">
      ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="${Number(value) === n ? 'is-on' : ''}" data-val="${n}" title="${esc((labels && labels[n - 1]) || n)}">${esc((labels && labels[n - 1]) || n)}</button>`).join('')}
      <input type="hidden" name="${name}" value="${value || ''}"></div>`;
  }
  function wireRatings(root) {
    U.on(root, 'click', '[data-rating] button', (ev, btn) => {
      const box = btn.closest('[data-rating]');
      U.$$('button', box).forEach(b => b.classList.toggle('is-on', b === btn));
      U.$('input', box).value = btn.dataset.val;
    });
  }

  /* ---------- checklist dinâmica ---------- */
  function checklistHtml(items) {
    return `<div class="field col-2">
      <label class="field__label">Checklist</label>
      <div data-checklist style="display:grid;gap:6px">
        ${(items || []).map(c => checkRow(c)).join('')}
      </div>
      <button type="button" class="link-btn" data-add-check style="justify-self:start;margin-top:4px">+ adicionar item</button>
    </div>`;
  }
  const checkRow = c => `<div class="row" data-check-row style="gap:7px;flex-wrap:nowrap">
      <input type="checkbox" ${c.done ? 'checked' : ''} data-check-done style="width:16px;height:16px;accent-color:var(--accent);flex:none">
      <input class="input" type="text" value="${esc(c.text || '')}" data-check-text placeholder="O que precisa ser feito?">
      <button type="button" class="icon-btn" data-del-check title="Remover" style="width:30px;height:30px;flex:none">${U.icon('x', 'i--sm')}</button>
    </div>`;
  function wireChecklist(root) {
    U.on(root, 'click', '[data-add-check]', () => {
      const box = U.$('[data-checklist]', root);
      box.insertAdjacentHTML('beforeend', checkRow({ text: '', done: false }));
      U.hydrateIcons(box);
      const inputs = U.$$('[data-check-text]', box);
      inputs[inputs.length - 1].focus();
    });
    U.on(root, 'click', '[data-del-check]', (ev, btn) => btn.closest('[data-check-row]').remove());
  }
  const readChecklist = root => U.$$('[data-check-row]', root)
    .map(row => ({ id: U.uid('chk'), text: U.$('[data-check-text]', row).value.trim(), done: U.$('[data-check-done]', row).checked }))
    .filter(c => c.text);

  /* ---------- lista simples (participantes, decisões, stakeholders) ---------- */
  function linesHtml(name, label, items, placeholder, col2) {
    return field(label, `<textarea class="textarea" name="${name}" rows="3" placeholder="${esc(placeholder)}" style="min-height:70px">${esc((items || []).join('\n'))}</textarea>`,
      { hint: 'Um por linha', col2: col2 !== false });
  }
  const readLines = v => String(v || '').split('\n').map(s => s.trim()).filter(Boolean);

  /* ============================================================
     DEMANDA (task)
     ============================================================ */
  function task(id, presets) {
    const t = id ? ST.get('tasks', id) : null;
    const d = Object.assign({
      title: '', description: '', sectorId: '', projectId: '', status: 'todo', priority: 'media',
      due: '', estimateH: 0, tags: [], checklist: []
    }, t || {}, presets || {});

    const body = el('div', { html: `
      <div class="form-grid">
        ${text('title', 'O que precisa ser feito?', d.title, { col2: true, required: true, placeholder: 'Ex.: Ajustar o gerador de pareceres com o feedback da coordenação' })}
        ${area('description', 'Contexto e detalhes', d.description, { col2: true, rows: 3, placeholder: 'Por que isso importa? O que já se sabe? Quem pediu?' })}
        ${select('sectorId', 'Setor', sectorOptions(), d.sectorId, { blank: '— sem setor —' })}
        ${select('projectId', 'Projeto', projectOptions(), d.projectId, { blank: '— avulsa —' })}
        ${select('status', 'Situação', catOptions(ST.TASK_STATUS), d.status)}
        ${select('priority', 'Prioridade', catOptions(ST.PRIORITY), d.priority)}
        ${text('due', 'Prazo', d.due, { type: 'date' })}
        ${text('estimateH', 'Estimativa (horas)', d.estimateH || '', { type: 'number', attrs: 'min="0" step="0.5"' })}
        ${text('tags', 'Etiquetas', tagsTo(d.tags), { col2: true, placeholder: 'lgpd, documento, piloto', hint: 'Separe por vírgula' })}
        ${checklistHtml(d.checklist)}
      </div>` });
    wireChecklist(body);

    const m = UI.modal({
      title: id ? 'Editar demanda' : 'Nova demanda',
      subtitle: id ? 'Criada em ' + U.fmtDate(String(t.createdAt).slice(0, 10)) : 'Registre o que precisa ser feito',
      body,
      footer: [
        id ? { label: 'Excluir', variant: 'danger', icon: 'trash', onClick: async ({ close }) => {
          if (await UI.confirm({ title: 'Excluir demanda?', message: '“' + t.title + '” será removida.', danger: true, confirmText: 'Excluir' })) {
            ST.remove('tasks', id); close();
            UI.toast('Demanda excluída', '', { label: 'Desfazer', onClick: () => ST.undoRemove() });
          }
        } } : null,
        'spacer',
        { label: 'Cancelar', onClick: ({ close }) => close() },
        { label: 'Salvar', variant: 'primary', icon: 'check', onClick: ({ close }) => {
          const v = readForm(body);
          if (!v.title) { UI.toast('Dê um título para a demanda', 'bad'); return; }
          const patch = {
            title: v.title, description: v.description, sectorId: v.sectorId || null, projectId: v.projectId || null,
            status: v.status, priority: v.priority, due: v.due || '', estimateH: Number(v.estimateH) || 0,
            tags: tagsFrom(v.tags), checklist: readChecklist(body)
          };
          if (patch.status === 'done' && (!t || t.status !== 'done')) patch.completedAt = new Date().toISOString();
          if (patch.status !== 'done') patch.completedAt = null;
          if (id) ST.update('tasks', id, patch);
          else ST.add('tasks', Object.assign({ timeSpentMin: 0, sourceType: (presets || {}).sourceType || 'manual', sourceId: (presets || {}).sourceId || null }, patch));
          UI.toast(id ? 'Demanda atualizada' : 'Demanda criada ✓', 'good');
          close();
        } }
      ].filter(Boolean)
    });
    return m;
  }

  /* ============================================================
     PROJETO
     ============================================================ */
  function project(id) {
    const p = id ? ST.get('projects', id) : null;
    const d = Object.assign({
      name: '', sectorId: '', problem: '', solution: '', stage: 'descoberta', status: 'ativo',
      startDate: U.today(), targetDate: '', progress: 0, stakeholders: [], tags: [],
      impact: { hoursSavedMonth: 0, peopleImpacted: 0, costSaved: 0 }, milestones: [], updates: []
    }, p || {});
    d.impact = Object.assign({ hoursSavedMonth: 0, peopleImpacted: 0, costSaved: 0 }, d.impact || {});

    const body = el('div', { html: `
      <div class="form-grid">
        ${text('name', 'Nome do projeto', d.name, { col2: true, placeholder: 'Ex.: Gerador de relatórios pedagógicos' })}
        ${area('problem', 'Qual o problema?', d.problem, { col2: true, rows: 3, placeholder: 'Descreva a dor do setor — não a solução. Quanto custa hoje em tempo ou dinheiro?' })}
        ${area('solution', 'Qual a solução proposta?', d.solution, { col2: true, rows: 3, placeholder: 'O que será construído e como resolve o problema.' })}
        ${select('sectorId', 'Setor atendido', sectorOptions(), d.sectorId, { blank: '— transversal —' })}
        ${select('stage', 'Etapa', catOptions(ST.PROJECT_STAGE), d.stage)}
        ${select('status', 'Situação', catOptions(ST.PROJECT_STATUS), d.status)}
        ${text('progress', 'Progresso (%)', d.progress, { type: 'number', attrs: 'min="0" max="100" step="5"' })}
        ${text('startDate', 'Início', d.startDate, { type: 'date' })}
        ${text('targetDate', 'Entrega prevista', d.targetDate, { type: 'date' })}
        <div class="col-2 divider" style="margin:2px 0"></div>
        <div class="col-2 section-title" style="margin:0">Impacto esperado — é isso que a direção pergunta</div>
        ${text('hoursSavedMonth', 'Horas economizadas/mês', d.impact.hoursSavedMonth, { type: 'number', attrs: 'min="0" step="1"' })}
        ${text('peopleImpacted', 'Pessoas impactadas', d.impact.peopleImpacted, { type: 'number', attrs: 'min="0" step="1"' })}
        ${text('costSaved', 'Economia estimada (R$/ano)', d.impact.costSaved, { type: 'number', attrs: 'min="0" step="100"' })}
        ${text('tags', 'Etiquetas', tagsTo(d.tags), { placeholder: 'automação, dados' })}
        ${linesHtml('stakeholders', 'Pessoas envolvidas', d.stakeholders, 'Coordenação pedagógica\nProfessores do Fundamental II')}
      </div>` });

    UI.modal({
      title: id ? 'Editar projeto' : 'Novo projeto', size: 'wide',
      subtitle: 'Um projeto nasce quando existe problema claro e métrica combinada',
      body,
      footer: [
        id ? { label: 'Excluir', variant: 'danger', icon: 'trash', onClick: async ({ close }) => {
          if (await UI.confirm({ title: 'Excluir projeto?', message: 'As demandas ligadas a ele continuarão existindo, mas ficarão sem projeto.', danger: true, confirmText: 'Excluir' })) {
            ST.tasksOfProject(id).forEach(t => ST.update('tasks', t.id, { projectId: null }));
            ST.remove('projects', id); close();
            UI.toast('Projeto excluído', '', { label: 'Desfazer', onClick: () => ST.undoRemove() });
          }
        } } : null,
        'spacer',
        { label: 'Cancelar', onClick: ({ close }) => close() },
        { label: 'Salvar', variant: 'primary', icon: 'check', onClick: ({ close }) => {
          const v = readForm(body);
          if (!v.name) { UI.toast('Dê um nome ao projeto', 'bad'); return; }
          const patch = {
            name: v.name, sectorId: v.sectorId || null, problem: v.problem, solution: v.solution,
            stage: v.stage, status: v.status, progress: U.clamp(Number(v.progress) || 0, 0, 100),
            startDate: v.startDate || '', targetDate: v.targetDate || '',
            stakeholders: readLines(v.stakeholders), tags: tagsFrom(v.tags),
            impact: { hoursSavedMonth: Number(v.hoursSavedMonth) || 0, peopleImpacted: Number(v.peopleImpacted) || 0, costSaved: Number(v.costSaved) || 0 }
          };
          if (id) ST.update('projects', id, patch);
          else ST.add('projects', Object.assign({ milestones: [], updates: [] }, patch));
          UI.toast(id ? 'Projeto atualizado' : 'Projeto criado ✓', 'good');
          close();
        } }
      ].filter(Boolean)
    });
  }

  /* ============================================================
     REUNIÃO
     ============================================================ */
  function meeting(id, presets) {
    const m = id ? ST.get('meetings', id) : null;
    const d = Object.assign({
      title: '', date: U.today(), time: U.nowTime(), durationMin: 60, sectorId: '', type: 'alinhamento',
      participants: [], agenda: '', notes: '', decisions: [], followUpDate: '', mood: 4, taskIds: [], insightIds: []
    }, m || {}, presets || {});

    const body = el('div', { html: `
      <div class="form-grid">
        ${text('title', 'Assunto da reunião', d.title, { col2: true, placeholder: 'Ex.: Levantamento de demanda — Psicologia' })}
        ${text('date', 'Data', d.date, { type: 'date' })}
        ${text('time', 'Horário', d.time, { type: 'time' })}
        ${select('sectorId', 'Setor', sectorOptions(), d.sectorId, { blank: '— vários setores —' })}
        ${select('type', 'Tipo', catOptions(ST.MEETING_TYPE), d.type)}
        ${text('durationMin', 'Duração (min)', d.durationMin, { type: 'number', attrs: 'min="0" step="15"' })}
        ${text('followUpDate', 'Retorno combinado', d.followUpDate, { type: 'date', hint: 'Vira lembrete na agenda' })}
        ${linesHtml('participants', 'Quem participou', d.participants, 'Coordenação pedagógica\nProfessora Ana')}
        ${area('agenda', 'Pauta', d.agenda, { col2: true, rows: 3, placeholder: 'Tópicos que serão tratados' })}
        ${area('notes', 'Anotações da reunião', d.notes, { col2: true, rows: 8, placeholder: 'O que foi dito, o que doeu, o que surpreendeu. Escreva solto — depois vira insight.' })}
        ${linesHtml('decisions', 'Decisões tomadas', d.decisions, 'O que ficou decidido, uma por linha')}
        <div class="field col-2">
          <label class="field__label">Como foi a reunião?</label>
          ${ratingHtml('mood', d.mood, ['😞', '😕', '😐', '🙂', '🤩'])}
        </div>
      </div>` });
    wireRatings(body);

    UI.modal({
      title: id ? 'Editar reunião' : 'Registrar reunião', size: 'wide',
      subtitle: 'Depois de salvar você pode transformar trechos em demandas e insights',
      body,
      footer: [
        id ? { label: 'Excluir', variant: 'danger', icon: 'trash', onClick: async ({ close }) => {
          if (await UI.confirm({ title: 'Excluir reunião?', message: 'O registro será removido.', danger: true, confirmText: 'Excluir' })) {
            ST.remove('meetings', id); close();
            UI.toast('Reunião excluída', '', { label: 'Desfazer', onClick: () => ST.undoRemove() });
          }
        } } : null,
        'spacer',
        { label: 'Cancelar', onClick: ({ close }) => close() },
        { label: 'Salvar', variant: 'primary', icon: 'check', onClick: ({ close }) => {
          const v = readForm(body);
          if (!v.title) { UI.toast('Dê um assunto para a reunião', 'bad'); return; }
          const patch = {
            title: v.title, date: v.date || U.today(), time: v.time || '', durationMin: Number(v.durationMin) || 0,
            sectorId: v.sectorId || null, type: v.type, participants: readLines(v.participants),
            agenda: v.agenda, notes: v.notes, decisions: readLines(v.decisions),
            followUpDate: v.followUpDate || '', mood: Number(v.mood) || 3
          };
          let saved;
          if (id) saved = ST.update('meetings', id, patch);
          else saved = ST.add('meetings', Object.assign({ taskIds: [], insightIds: [] }, patch));
          // retorno combinado vira lembrete na agenda
          if (patch.followUpDate && (!id || !m.followUpDate || m.followUpDate !== patch.followUpDate)) {
            ST.add('events', {
              title: 'Retorno: ' + patch.title, date: patch.followUpDate, time: '', endTime: '',
              type: 'lembrete', sectorId: patch.sectorId, location: '', notes: 'Follow-up combinado na reunião de ' + U.fmtDate(patch.date),
              remindMinBefore: 0, done: false, meetingId: saved.id
            });
          }
          UI.toast(id ? 'Reunião atualizada' : 'Reunião registrada ✓', 'good');
          close();
          if (!id && App.views.meetings && App.views.meetings.detail) App.views.meetings.detail(saved.id);
        } }
      ].filter(Boolean)
    });
  }

  /* ============================================================
     INSIGHT
     ============================================================ */
  function insight(id, presets) {
    const it = id ? ST.get('insights', id) : null;
    const d = Object.assign({
      title: '', description: '', sectorId: '', source: '', tags: [], impact: 3, effort: 3, status: 'novo'
    }, it || {}, presets || {});

    const body = el('div', { html: `
      <div class="form-grid">
        ${text('title', 'O insight em uma frase', d.title, { col2: true, placeholder: 'Ex.: Professores querem reutilizar frases próprias' })}
        ${area('description', 'Desenvolva', d.description, { col2: true, rows: 4, placeholder: 'O que você percebeu, onde percebeu e por que isso muda alguma coisa.' })}
        ${select('sectorId', 'Setor', sectorOptions(), d.sectorId, { blank: '— geral —' })}
        ${text('source', 'De onde veio', d.source, { placeholder: 'Reunião, conversa de corredor, observação…' })}
        <div class="field"><label class="field__label">Impacto se aplicarmos</label>${ratingHtml('impact', d.impact)}<span class="field__hint">1 = pequeno · 5 = transforma o setor</span></div>
        <div class="field"><label class="field__label">Esforço para aplicar</label>${ratingHtml('effort', d.effort)}<span class="field__hint">1 = uma tarde · 5 = projeto longo</span></div>
        ${select('status', 'Situação', catOptions(ST.INSIGHT_STATUS), d.status)}
        ${text('tags', 'Etiquetas', tagsTo(d.tags), { placeholder: 'método, adoção' })}
      </div>` });
    wireRatings(body);

    UI.modal({
      title: id ? 'Editar insight' : 'Novo insight',
      subtitle: 'Percepções que ainda não são projeto — mas podem virar',
      body,
      footer: [
        id ? { label: 'Excluir', variant: 'danger', icon: 'trash', onClick: async ({ close }) => {
          if (await UI.confirm({ title: 'Excluir insight?', message: 'Essa percepção será removida.', danger: true, confirmText: 'Excluir' })) {
            ST.remove('insights', id); close();
            UI.toast('Insight excluído', '', { label: 'Desfazer', onClick: () => ST.undoRemove() });
          }
        } } : null,
        'spacer',
        { label: 'Cancelar', onClick: ({ close }) => close() },
        { label: 'Salvar', variant: 'primary', icon: 'check', onClick: ({ close }) => {
          const v = readForm(body);
          if (!v.title) { UI.toast('Escreva o insight em uma frase', 'bad'); return; }
          const patch = {
            title: v.title, description: v.description, sectorId: v.sectorId || null, source: v.source,
            tags: tagsFrom(v.tags), impact: Number(v.impact) || 3, effort: Number(v.effort) || 3, status: v.status
          };
          if (id) ST.update('insights', id, patch);
          else ST.add('insights', Object.assign({ convertedTo: null }, patch));
          UI.toast(id ? 'Insight atualizado' : 'Insight registrado ✓', 'good');
          close();
        } }
      ].filter(Boolean)
    });
  }

  /* ============================================================
     NOTA
     ============================================================ */
  function note(id, presets) {
    const n = id ? ST.get('notes', id) : null;
    const d = Object.assign({ title: '', body: '', tags: [], sectorId: '', pinned: false, color: '' }, n || {}, presets || {});
    const colors = [['', 'Padrão'], ['amarelo', 'Amarelo'], ['azul', 'Azul'], ['verde', 'Verde'], ['rosa', 'Rosa'], ['roxo', 'Roxo']];

    const body = el('div', { html: `
      <div class="form-grid">
        ${text('title', 'Título', d.title, { col2: true, placeholder: 'Ex.: Método — como recebo uma demanda' })}
        ${area('body', 'Conteúdo', d.body, { col2: true, rows: 12, placeholder: 'Aceita markdown: ## título, **negrito**, - lista, > citação', minHeight: '240px' })}
        ${select('sectorId', 'Setor', sectorOptions(), d.sectorId, { blank: '— geral —' })}
        ${select('color', 'Cor', colors.map(c => ({ value: c[0], label: c[1] })), d.color)}
        ${text('tags', 'Etiquetas', tagsTo(d.tags), { col2: true, placeholder: 'método, princípios' })}
        <div class="field col-2"><label class="check"><input type="checkbox" name="pinned" ${d.pinned ? 'checked' : ''}> Fixar no topo</label></div>
      </div>` });

    UI.modal({
      title: id ? 'Editar anotação' : 'Nova anotação', size: 'wide', body,
      footer: [
        id ? { label: 'Excluir', variant: 'danger', icon: 'trash', onClick: async ({ close }) => {
          if (await UI.confirm({ title: 'Excluir anotação?', message: '“' + n.title + '” será removida.', danger: true, confirmText: 'Excluir' })) {
            ST.remove('notes', id); close();
            UI.toast('Anotação excluída', '', { label: 'Desfazer', onClick: () => ST.undoRemove() });
          }
        } } : null,
        'spacer',
        { label: 'Cancelar', onClick: ({ close }) => close() },
        { label: 'Salvar', variant: 'primary', icon: 'check', onClick: ({ close }) => {
          const v = readForm(body);
          if (!v.title && !v.body) { UI.toast('Escreva algo antes de salvar', 'bad'); return; }
          const patch = { title: v.title || 'Sem título', body: v.body, sectorId: v.sectorId || null, color: v.color, tags: tagsFrom(v.tags), pinned: !!v.pinned };
          if (id) ST.update('notes', id, patch); else ST.add('notes', patch);
          UI.toast(id ? 'Anotação atualizada' : 'Anotação criada ✓', 'good');
          close();
        } }
      ].filter(Boolean)
    });
  }

  /* ============================================================
     EVENTO DE AGENDA
     ============================================================ */
  function event(id, presets) {
    const e = id ? ST.get('events', id) : null;
    const d = Object.assign({
      title: '', date: U.today(), time: '', endTime: '', type: 'evento', sectorId: '',
      location: '', notes: '', remindMinBefore: 15, done: false, repeat: 'none', repeatCount: 4
    }, e || {}, presets || {});

    const body = el('div', { html: `
      <div class="form-grid">
        ${text('title', 'Título', d.title, { col2: true, placeholder: 'Ex.: Bloco de foco — política de dados' })}
        ${text('date', 'Data', d.date, { type: 'date' })}
        ${select('type', 'Tipo', catOptions(ST.EVENT_TYPE), d.type)}
        ${text('time', 'Início', d.time, { type: 'time' })}
        ${text('endTime', 'Fim', d.endTime, { type: 'time' })}
        ${select('sectorId', 'Setor', sectorOptions(), d.sectorId, { blank: '— nenhum —' })}
        ${text('location', 'Local', d.location, { placeholder: 'Sala, link…' })}
        ${!id ? select('repeat', 'Repetir', [
            { value: 'none', label: 'Não repetir' }, { value: 'daily', label: 'Todo dia útil' },
            { value: 'weekly', label: 'Toda semana' }, { value: 'biweekly', label: 'A cada 15 dias' }, { value: 'monthly', label: 'Todo mês' }
          ], d.repeat) : ''}
        ${!id ? text('repeatCount', 'Quantas vezes', d.repeatCount, { type: 'number', attrs: 'min="1" max="52"' }) : ''}
        ${area('notes', 'Observações', d.notes, { col2: true, rows: 3 })}
      </div>` });

    UI.modal({
      title: id ? 'Editar evento' : 'Novo evento na agenda', body,
      footer: [
        id ? { label: 'Excluir', variant: 'danger', icon: 'trash', onClick: async ({ close }) => {
          if (await UI.confirm({ title: 'Excluir evento?', message: '“' + e.title + '” sairá da agenda.', danger: true, confirmText: 'Excluir' })) {
            ST.remove('events', id); close();
            UI.toast('Evento excluído', '', { label: 'Desfazer', onClick: () => ST.undoRemove() });
          }
        } } : null,
        'spacer',
        { label: 'Cancelar', onClick: ({ close }) => close() },
        { label: 'Salvar', variant: 'primary', icon: 'check', onClick: ({ close }) => {
          const v = readForm(body);
          if (!v.title) { UI.toast('Dê um título ao evento', 'bad'); return; }
          const base = {
            title: v.title, date: v.date || U.today(), time: v.time || '', endTime: v.endTime || '',
            type: v.type, sectorId: v.sectorId || null, location: v.location, notes: v.notes,
            remindMinBefore: 15, done: id ? d.done : false
          };
          if (id) { ST.update('events', id, base); UI.toast('Evento atualizado', 'good'); close(); return; }
          const repeat = v.repeat || 'none';
          const times = repeat === 'none' ? 1 : U.clamp(Number(v.repeatCount) || 1, 1, 52);
          let cursor = base.date;
          for (let i = 0; i < times; i++) {
            ST.add('events', Object.assign({}, base, { date: cursor }));
            if (repeat === 'daily') { do { cursor = U.addDays(cursor, 1); } while (U.isWeekend(cursor)); }
            else if (repeat === 'weekly') cursor = U.addDays(cursor, 7);
            else if (repeat === 'biweekly') cursor = U.addDays(cursor, 14);
            else if (repeat === 'monthly') cursor = U.addMonths(cursor, 1);
            else break;
          }
          UI.toast(times > 1 ? times + ' eventos criados ✓' : 'Evento criado ✓', 'good');
          close();
        } }
      ].filter(Boolean)
    });
  }

  /* ============================================================
     DIÁRIO (check-in do dia)
     ============================================================ */
  function journal(date) {
    const day = date || U.today();
    const j = ST.journalOf(day);
    const d = Object.assign({ date: day, energy: 3, mood: 3, focus: '', wins: '', blockers: '', learned: '', tomorrow: '' }, j || {});
    const doneToday = ST.state.tasks.filter(t => t.status === 'done' && String(t.completedAt || '').slice(0, 10) === day);
    const meetingsToday = ST.state.meetings.filter(m => m.date === day);

    const resume = (doneToday.length || meetingsToday.length) ? `
      <div class="col-2" style="background:var(--sunken);border-radius:var(--r-sm);padding:11px 13px">
        <div class="section-title" style="margin-bottom:6px">O que o sistema registrou hoje</div>
        <div class="small muted">
          ${doneToday.length ? `✓ ${doneToday.length} demanda${doneToday.length > 1 ? 's' : ''} concluída${doneToday.length > 1 ? 's' : ''}: ${esc(doneToday.map(t => t.title).join(' · '))}<br>` : ''}
          ${meetingsToday.length ? `👥 ${meetingsToday.length} reunião${meetingsToday.length > 1 ? 'ões' : ''}: ${esc(meetingsToday.map(m => m.title).join(' · '))}` : ''}
        </div>
      </div>` : '';

    const body = el('div', { html: `
      <div class="form-grid">
        ${resume}
        <div class="field"><label class="field__label">Energia do dia</label>${ratingHtml('energy', d.energy)}</div>
        <div class="field"><label class="field__label">Como você se sentiu</label>${ratingHtml('mood', d.mood, ['😞', '😕', '😐', '🙂', '🤩'])}</div>
        ${text('focus', 'Foco principal do dia', d.focus, { col2: true, placeholder: 'A única coisa que, se feita, faz o dia valer' })}
        ${area('wins', 'O que deu certo', d.wins, { rows: 3, placeholder: 'Vitórias, por menores que sejam' })}
        ${area('blockers', 'O que travou', d.blockers, { rows: 3, placeholder: 'Bloqueios, esperas, frustrações' })}
        ${area('learned', 'O que aprendi', d.learned, { rows: 3, placeholder: 'Uma lição que quero lembrar daqui a um ano' })}
        ${area('tomorrow', 'Amanhã eu começo por…', d.tomorrow, { rows: 3, placeholder: 'Deixe o próximo passo pronto para o seu eu de amanhã' })}
      </div>` });
    wireRatings(body);

    UI.modal({
      title: 'Diário · ' + U.fmtDate(day, 'full'), size: 'wide',
      subtitle: 'Cinco minutos hoje valem uma hora de memória daqui a seis meses',
      body,
      footer: ['spacer',
        { label: 'Cancelar', onClick: ({ close }) => close() },
        { label: j ? 'Atualizar registro' : 'Registrar o dia', variant: 'primary', icon: 'check', onClick: ({ close }) => {
          const v = readForm(body);
          const patch = {
            date: day, energy: Number(v.energy) || 3, mood: Number(v.mood) || 3,
            focus: v.focus, wins: v.wins, blockers: v.blockers, learned: v.learned, tomorrow: v.tomorrow
          };
          if (j) ST.update('journal', j.id, patch); else ST.add('journal', patch);
          const s = ST.streak();
          UI.toast(j ? 'Diário atualizado' : `Dia registrado ✓  ${s > 1 ? '🔥 ' + s + ' dias seguidos' : ''}`, 'good');
          close();
        } }]
    });
  }

  /* ============================================================
     SETOR
     ============================================================ */
  function sector(id) {
    const s = id ? ST.get('sectors', id) : null;
    const d = Object.assign({ name: '', color: 'var(--s1)', lead: '', description: '' }, s || {});
    const colors = ST.SERIES.map((c, i) => ({ value: c, label: ['Azul', 'Laranja', 'Água', 'Amarelo', 'Magenta', 'Verde', 'Violeta', 'Vermelho'][i] }));

    const body = el('div', { html: `
      <div class="form-grid">
        ${text('name', 'Nome do setor', d.name, { col2: true, placeholder: 'Ex.: Coordenação do Fundamental I' })}
        ${select('color', 'Cor', colors, d.color)}
        ${text('lead', 'Pessoa de referência', d.lead, { placeholder: 'Quem responde por esse setor' })}
        ${area('description', 'Descrição', d.description, { col2: true, rows: 2 })}
      </div>` });

    UI.modal({
      title: id ? 'Editar setor' : 'Novo setor', size: 'sm', body,
      footer: [
        id ? { label: 'Excluir', variant: 'danger', onClick: async ({ close }) => {
          const used = ST.state.tasks.filter(t => t.sectorId === id).length + ST.state.projects.filter(p => p.sectorId === id).length;
          if (await UI.confirm({ title: 'Excluir setor?', message: used ? `${used} registro(s) ficarão sem setor.` : 'O setor será removido.', danger: true, confirmText: 'Excluir' })) {
            ST.remove('sectors', id); close(); UI.toast('Setor excluído');
          }
        } } : null,
        'spacer',
        { label: 'Cancelar', onClick: ({ close }) => close() },
        { label: 'Salvar', variant: 'primary', onClick: ({ close }) => {
          const v = readForm(body);
          if (!v.name) { UI.toast('Dê um nome ao setor', 'bad'); return; }
          if (id) ST.update('sectors', id, v); else ST.add('sectors', v);
          UI.toast('Setor salvo', 'good'); close();
        } }
      ].filter(Boolean)
    });
  }

  /* ============================================================
     REGISTRO DE TEMPO
     ============================================================ */
  function timeLog(taskId) {
    const t = ST.get('tasks', taskId);
    const body = el('div', { html: `<div class="form-grid">
      ${text('minutes', 'Minutos dedicados', 30, { type: 'number', attrs: 'min="1" step="5"' })}
      ${text('date', 'Data', U.today(), { type: 'date' })}
      ${text('note', 'O que foi feito', '', { col2: true, placeholder: 'Opcional' })}
    </div>` });
    UI.modal({
      title: 'Registrar tempo', size: 'sm', subtitle: t ? t.title : '', body,
      footer: ['spacer', { label: 'Cancelar', onClick: ({ close }) => close() },
        { label: 'Registrar', variant: 'primary', onClick: ({ close }) => {
          const v = readForm(body);
          const min = Number(v.minutes) || 0;
          if (min <= 0) { UI.toast('Informe os minutos', 'bad'); return; }
          ST.add('timeLogs', { taskId: taskId, projectId: t ? t.projectId : null, date: v.date || U.today(), minutes: min, note: v.note });
          if (t) ST.update('tasks', taskId, { timeSpentMin: (t.timeSpentMin || 0) + min });
          UI.toast(U.fmtDuration(min) + ' registrados ✓', 'good');
          close();
        } }]
    });
  }

  /* ============================================================
     ADIÇÃO RÁPIDA (tecla N)
     ============================================================ */
  function quickAdd() {
    const items = [
      { icon: 'kanban', label: 'Demanda', hint: 'Algo para fazer', run: () => task() },
      { icon: 'users', label: 'Reunião', hint: 'Registrar o que foi conversado', run: () => meeting() },
      { icon: 'bulb', label: 'Insight', hint: 'Uma percepção que não pode se perder', run: () => insight() },
      { icon: 'note', label: 'Anotação', hint: 'Texto livre, método, referência', run: () => note() },
      { icon: 'calendar', label: 'Evento na agenda', hint: 'Compromisso ou bloco de foco', run: () => event() },
      { icon: 'rocket', label: 'Projeto', hint: 'Uma solução para um setor', run: () => project() },
      { icon: 'book', label: 'Registro do diário', hint: 'Como foi o seu dia', run: () => journal() }
    ];
    const body = el('div', { class: 'grid grid--3', style: { gap: '10px' } });
    items.forEach(it => body.appendChild(el('button', {
      class: 'card', style: { padding: '14px', textAlign: 'left', display: 'grid', gap: '4px', cursor: 'pointer' },
      html: `<span style="color:var(--accent)">${U.icon(it.icon)}</span>
             <strong style="font-size:13.5px">${esc(it.label)}</strong>
             <span class="small muted">${esc(it.hint)}</span>`,
      onclick: () => { m.close(); it.run(); }
    })));
    U.hydrateIcons(body);
    const m = UI.modal({ title: 'O que você quer registrar?', size: 'sm', body, autofocus: false });
  }

  App.forms = {
    task, project, meeting, insight, note, event, journal, sector, timeLog, quickAdd,
    helpers: { readForm, tagsFrom, tagsTo, readLines, sectorOptions, projectOptions, catOptions, text, area, select, field, opt, ratingHtml, wireRatings }
  };
})(window.App);
