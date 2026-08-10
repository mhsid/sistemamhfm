/* ============================================================
   views/settings.js — perfil, companheiro, metas, setores e dados
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util, ST = App.store, UI = App.ui;
  const { esc, el } = U;
  App.views = App.views || {};

  function exportNow() {
    const json = ST.exportData();
    UI.download('nucleo-ia-backup-' + U.today() + '.json', json);
    UI.toast('Backup exportado ✓ Guarde em um lugar seguro', 'good');
  }

  function importFlow() {
    const input = el('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const data = JSON.parse(reader.result);
          const counts = ST.COLLECTIONS.map(c => `${(data[c] || []).length} ${c}`).join(' · ');
          const merge = await UI.confirm({
            title: 'Importar dados',
            message: `O arquivo contém: ${counts}.\n\nEscolha "Substituir" para trocar tudo pelo backup, ou "Cancelar" e use o botão de mesclar.`,
            confirmText: 'Substituir tudo', danger: true
          });
          if (!merge) return;
          ST.importData(data, 'replace');
          UI.toast('Dados importados ✓', 'good');
          App.render();
        } catch (e) {
          console.error(e);
          UI.toast('Arquivo inválido: ' + e.message, 'bad');
        }
      };
      reader.readAsText(file);
      input.remove();
    });
    input.click();
  }

  function mergeFlow() {
    const input = el('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          ST.importData(JSON.parse(reader.result), 'merge');
          UI.toast('Registros novos adicionados ✓', 'good');
          App.render();
        } catch (e) { UI.toast('Arquivo inválido', 'bad'); }
      };
      reader.readAsText(file);
      input.remove();
    });
    input.click();
  }

  App.views.settings = {
    title: 'Configurações',
    subtitle: () => 'Ajuste o sistema ao seu jeito de trabalhar',
    exportNow,
    render(root) {
      const s = ST.settings, c = s.companion;
      const backups = ST.listBackups();
      const counts = {
        tasks: ST.state.tasks.length, projects: ST.state.projects.length, meetings: ST.state.meetings.length,
        insights: ST.state.insights.length, notes: ST.state.notes.length, events: ST.state.events.length, journal: ST.state.journal.length
      };
      const demo = ST.COLLECTIONS.reduce((n, col) => n + ST.state[col].filter(x => x.demo).length, 0);

      root.innerHTML = `
      <div class="stack" style="max-width:920px">

        <div class="card">
          <div class="card__head"><div><h3>Seu perfil</h3><p>Aparece nas saudações e nos relatórios</p></div></div>
          <div class="card__body"><div class="form-grid">
            <div class="field"><label class="field__label">Nome</label><input class="input" data-s="userName" value="${esc(s.userName)}" placeholder="Como você quer ser chamado"></div>
            <div class="field"><label class="field__label">Função</label><input class="input" data-s="role" value="${esc(s.role)}"></div>
            <div class="field col-2"><label class="field__label">Instituição</label><input class="input" data-s="school" value="${esc(s.school)}" placeholder="Nome da instituição"></div>
            <div class="field"><label class="field__label">Início do expediente</label><input class="input" type="time" data-s="workdayStart" value="${esc(s.workdayStart)}"></div>
            <div class="field"><label class="field__label">Fim do expediente</label><input class="input" type="time" data-s="workdayEnd" value="${esc(s.workdayEnd)}"></div>
          </div></div>
        </div>

        <div class="card">
          <div class="card__head"><div><h3>Seu companheiro digital</h3><p>Ele observa seus dados e te cutuca quando algo precisa de atenção</p></div></div>
          <div class="card__body"><div class="form-grid">
            <div class="field"><label class="field__label">Nome do companheiro</label><input class="input" data-c="name" value="${esc(c.name)}" placeholder="ARIA"></div>
            <div class="field"><label class="field__label">Jeito de falar</label>
              <select class="select" data-c="persona">
                <option value="parceiro" ${c.persona === 'parceiro' ? 'selected' : ''}>Parceiro — caloroso e motivador</option>
                <option value="direto" ${c.persona === 'direto' ? 'selected' : ''}>Direto — objetivo, sem rodeios</option>
                <option value="zen" ${c.persona === 'zen' ? 'selected' : ''}>Zen — calmo e reflexivo</option>
              </select></div>
            <div class="field col-2"><label class="check"><input type="checkbox" data-c="enabled" ${c.enabled ? 'checked' : ''}> Manter o companheiro ativo</label></div>
            <div class="field col-2">
              <label class="check"><input type="checkbox" data-notif ${c.notifications ? 'checked' : ''}> Avisar no navegador 15 min antes dos compromissos</label>
              <span class="field__hint">Requer permissão do navegador e a aba aberta. ${typeof Notification !== 'undefined' ? 'Estado atual: ' + Notification.permission : 'Navegador sem suporte.'}</span>
            </div>
            <div class="col-2">${App.companion.bubble({ title: 'Prévia', text: App.companion.briefingText() }, { dismissable: false }).outerHTML}</div>
          </div></div>
        </div>

        <div class="card">
          <div class="card__head"><div><h3>Metas e limites</h3><p>O companheiro usa esses números para saber quando te elogiar e quando te alertar</p></div></div>
          <div class="card__body"><div class="form-grid">
            <div class="field"><label class="field__label">Entregas por semana</label><input class="input" type="number" min="1" data-g="tasksPerWeek" value="${s.goals.tasksPerWeek}"></div>
            <div class="field"><label class="field__label">Reuniões por semana</label><input class="input" type="number" min="0" data-g="meetingsPerWeek" value="${s.goals.meetingsPerWeek}"></div>
            <div class="field"><label class="field__label">Horas/mês devolvidas ao colégio</label><input class="input" type="number" min="0" data-g="hoursSavedMonth" value="${s.goals.hoursSavedMonth}"></div>
            <div class="field"><label class="field__label">Limite de demandas simultâneas</label><input class="input" type="number" min="1" max="10" data-s="wipLimit" value="${s.wipLimit}">
              <span class="field__hint">Acima disso, o companheiro avisa que você está se dispersando</span></div>
          </div></div>
        </div>

        <div class="card">
          <div class="card__head"><div><h3>Identidade visual</h3><p>As cores do sistema vêm do logo do colégio</p></div></div>
          <div class="card__body" style="display:grid;gap:16px">
            <div class="row" style="gap:16px;align-items:center">
              ${App.brand.logo(64)}
              <div style="flex:1;min-width:200px">
                <strong style="font-size:14px">${esc(s.school || App.brand.school)}</strong>
                <p class="small muted" style="line-height:1.6;margin-top:3px">
                  Cores extraídas do arquivo oficial do logo. Para trocar a imagem,
                  salve a imagem como <code>assets/img/logo.svg</code> (ou <code>logo.png</code>)
                  na pasta do sistema e clique em procurar — ele passa a aparecer aqui,
                  na barra lateral e na tela de abertura.
                </p>
                <div class="row" style="gap:8px;margin-top:10px">
                  <button class="btn btn--sm" data-rescan-logo>${U.icon('refresh', 'i--sm')}<span>Procurar logo do colégio</span></button>
                  <span class="small muted">${App.brand.hasCustom() ? 'usando o arquivo oficial ✓' : 'usando o desenho de reserva'}</span>
                </div>
              </div>
            </div>
            <div>
              <div class="section-title">Cores da marca</div>
              <div class="row" style="gap:10px">
                ${[['Azul-marinho', '#133880', 'pássaro e traço · cor de ação do sistema'],
                   ['Verde-limão', '#afca08', 'copa entrelaçada · destaques'],
                   ['Verde de gráfico', '#95ae00', 'versão legível do verde em barras']].map(c => `
                  <div class="row" style="gap:8px;padding:7px 11px;border:1px solid var(--border);border-radius:var(--r-sm)">
                    <span style="width:22px;height:22px;border-radius:6px;background:${c[1]};flex:none"></span>
                    <div><div style="font-size:12.5px;font-weight:600">${esc(c[0])}</div>
                    <div class="small muted tnum">${c[1]}</div></div>
                  </div>`).join('')}
              </div>
              <p class="small muted" style="margin-top:10px;line-height:1.6">
                As cores dos gráficos foram testadas para daltonismo e contraste nos temas claro e escuro.
                Se você tiver o manual de marca do colégio com os códigos exatos, é só trocar os valores
                no topo de <code>assets/css/app.css</code>.
              </p>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card__head"><div><h3>Setores do colégio</h3><p>Cada setor tem uma cor usada em todo o sistema</p></div>
            <div class="card__actions"><button class="btn btn--sm" data-new-sector>${U.icon('plus', 'i--sm')}<span>Novo setor</span></button></div></div>
          <div class="card__body"><div class="list">
            ${ST.state.sectors.map(sec => `
              <div class="list__row" data-sector="${sec.id}">
                <span class="chip__dot" style="background:${sec.color};width:11px;height:11px"></span>
                <div class="list__main">
                  <span class="list__title">${esc(sec.name)}</span>
                  <span class="list__sub">${esc(sec.description || 'Sem descrição')}${sec.lead ? ' · ' + esc(sec.lead) : ''}</span>
                </div>
                <div class="list__side">
                  <span class="chip">${ST.openTasks().filter(t => t.sectorId === sec.id).length} abertas</span>
                  ${U.icon('edit', 'i--sm')}
                </div>
              </div>`).join('') || '<p class="small muted">Nenhum setor cadastrado.</p>'}
          </div></div>
        </div>

        <div class="card">
          <div class="card__head"><div><h3>Seus dados</h3><p>Tudo fica salvo neste navegador, neste computador. Nada sai daqui.</p></div></div>
          <div class="card__body" style="display:grid;gap:14px">
            <div class="row" style="gap:9px">
              ${Object.keys(counts).map(k => `<span class="chip">${counts[k]} ${esc({ tasks: 'demandas', projects: 'projetos', meetings: 'reuniões', insights: 'insights', notes: 'notas', events: 'eventos', journal: 'registros' }[k])}</span>`).join('')}
            </div>
            <p class="small muted">Último backup exportado: <strong style="color:var(--ink)">${ST.state.meta.lastExport ? esc(U.fmtDate(String(ST.state.meta.lastExport).slice(0, 10)) + ' (' + U.fmtRelative(String(ST.state.meta.lastExport).slice(0, 10)) + ')') : 'nunca'}</strong>. Exporte com frequência: limpar os dados do navegador apaga tudo.</p>
            <div class="row" style="gap:8px">
              <button class="btn btn--primary btn--sm" data-export>${U.icon('download', 'i--sm')}<span>Exportar backup</span></button>
              <button class="btn btn--sm" data-import>${U.icon('upload', 'i--sm')}<span>Restaurar backup</span></button>
              <button class="btn btn--sm" data-merge>${U.icon('plus', 'i--sm')}<span>Mesclar arquivo</span></button>
              <button class="btn btn--sm" data-snapshot>${U.icon('save', 'i--sm')}<span>Salvar ponto de restauração</span></button>
            </div>
            ${backups.length ? `<div>
              <div class="section-title">Pontos de restauração automáticos</div>
              <div class="list">${backups.map(b => `
                <div class="list__row" style="cursor:default">
                  <div class="list__main"><span class="list__title">${esc(b.label)}</span>
                    <span class="list__sub">${esc(U.fmtDate(String(b.at).slice(0, 10)))} · ${esc(String(b.at).slice(11, 16))}</span></div>
                  <div class="list__side"><button class="btn btn--sm" data-restore="${b.i}">restaurar</button></div>
                </div>`).join('')}</div></div>` : ''}
            <div class="divider"></div>
            <div class="row" style="gap:8px">
              ${demo ? `<button class="btn btn--sm btn--danger" data-clear-demo>Remover os ${demo} registros de exemplo</button>` : ''}
              <button class="btn btn--sm btn--danger" data-reset>Apagar tudo e recomeçar</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card__head"><div><h3>Atalhos de teclado</h3></div></div>
          <div class="card__body"><div class="grid grid--3" style="gap:10px">
            ${[['Ctrl K', 'Buscar / comandos'], ['N', 'Novo registro'], ['C', 'Abrir companheiro'], ['D', 'Ir para o painel'],
               ['T', 'Ir para demandas'], ['A', 'Ir para agenda'], ['J', 'Registrar o dia'], ['Esc', 'Fechar janela']].map(k =>
              `<div class="row" style="gap:9px"><kbd>${k[0]}</kbd><span class="small muted">${k[1]}</span></div>`).join('')}
          </div></div>
        </div>

        <p class="small muted" style="text-align:center;padding:8px 0 20px">
          Núcleo de IA · ${esc(s.school || App.brand.school)} · versão do formato de dados ${ST.SCHEMA}
        </p>
      </div>`;

      U.hydrateIcons(root);

      const save = U.debounce(() => { ST.emit('settings'); App.refreshChrome(); }, 400);
      U.on(root, 'input', '[data-s]', (ev, n) => { ST.settings[n.dataset.s] = n.type === 'number' ? Number(n.value) : n.value; save(); });
      U.on(root, 'input', '[data-c]', (ev, n) => { ST.settings.companion[n.dataset.c] = n.type === 'checkbox' ? n.checked : n.value; save(); App.companion.render(); });
      U.on(root, 'change', 'select[data-c]', (ev, n) => { ST.settings.companion[n.dataset.c] = n.value; save(); App.companion.render(); });
      U.on(root, 'change', '[data-c][type=checkbox]', (ev, n) => { ST.settings.companion[n.dataset.c] = n.checked; save(); App.companion.render(); });
      U.on(root, 'input', '[data-g]', (ev, n) => { ST.settings.goals[n.dataset.g] = Number(n.value) || 0; save(); });
      U.on(root, 'change', '[data-notif]', (ev, n) => {
        if (n.checked) App.companion.requestNotifications().then(ok => { if (!ok) n.checked = false; });
        else { ST.settings.companion.notifications = false; ST.emit('settings'); }
      });

      U.on(root, 'click', '[data-rescan-logo]', () => {
        App.brand.rescan(() => {
          UI.toast(App.brand.hasCustom() ? 'Logo oficial encontrado ✓' : 'Nenhum arquivo em assets/img/ — seguimos com o desenho', App.brand.hasCustom() ? 'good' : '');
          App.refreshChrome();
          U.$('#brandMark').innerHTML = App.brand.logo(38);
          App.render();
        });
      });
      U.on(root, 'click', '[data-new-sector]', () => App.forms.sector());
      U.on(root, 'click', '[data-sector]', (ev, n) => App.forms.sector(n.dataset.sector));
      U.on(root, 'click', '[data-export]', exportNow);
      U.on(root, 'click', '[data-import]', importFlow);
      U.on(root, 'click', '[data-merge]', mergeFlow);
      U.on(root, 'click', '[data-snapshot]', () => { ST.snapshotBackup('manual'); UI.toast('Ponto de restauração salvo ✓', 'good'); App.render(); });
      U.on(root, 'click', '[data-restore]', async (ev, n) => {
        if (await UI.confirm({ title: 'Restaurar este ponto?', message: 'Os dados atuais serão substituídos. Um backup do estado atual é guardado antes.', danger: true, confirmText: 'Restaurar' })) {
          ST.snapshotBackup('antes-da-restauracao');
          ST.restoreBackup(Number(n.dataset.restore));
          UI.toast('Dados restaurados ✓', 'good');
          App.render();
        }
      });
      U.on(root, 'click', '[data-clear-demo]', async () => {
        if (await UI.confirm({ title: 'Remover dados de exemplo?', message: 'Apenas os registros marcados como exemplo serão apagados. O que você criou permanece.', danger: true, confirmText: 'Remover' })) {
          ST.snapshotBackup('antes-de-limpar-exemplos');
          ST.COLLECTIONS.forEach(col => {
            if (col === 'sectors') return;
            ST.state[col] = ST.state[col].filter(x => !x.demo);
          });
          ST.emit('clear-demo');
          UI.toast('Exemplos removidos — o espaço é todo seu', 'good');
          App.render();
        }
      });
      U.on(root, 'click', '[data-reset]', async () => {
        if (await UI.confirm({ title: 'Apagar tudo?', message: 'Todos os registros serão apagados deste navegador. Um ponto de restauração é guardado antes, mas exporte um backup se tiver dúvida.', danger: true, confirmText: 'Apagar tudo' })) {
          ST.resetAll(false);
          UI.toast('Sistema zerado');
          App.go('dashboard');
        }
      });
    }
  };
})(window.App);
