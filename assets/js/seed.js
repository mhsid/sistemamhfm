/* ============================================================
   seed.js — setores padrão + dados de exemplo (marcados com demo:true)
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util;
  const d = n => U.addDays(U.today(), n);
  const stamp = n => new Date(U.parseISO(d(n)).getTime() + 10 * 3600000).toISOString();

  function sectors() {
    return [
      { id: 'sec_pedag',  name: 'Pedagógico',     color: 'var(--s1)', lead: '', description: 'Coordenação pedagógica, professores e currículo' },
      { id: 'sec_psico',  name: 'Psicologia',     color: 'var(--s5)', lead: '', description: 'Acompanhamento socioemocional e orientação' },
      { id: 'sec_finan',  name: 'Financeiro',     color: 'var(--s3)', lead: '', description: 'Mensalidades, inadimplência e orçamento' },
      { id: 'sec_admin',  name: 'Administrativo', color: 'var(--s4)', lead: '', description: 'Compras, contratos e infraestrutura' },
      { id: 'sec_secre',  name: 'Secretaria',     color: 'var(--s2)', lead: '', description: 'Matrículas, documentos e registros acadêmicos' },
      { id: 'sec_direc',  name: 'Direção',        color: 'var(--s7)', lead: '', description: 'Direção e planejamento estratégico' },
      { id: 'sec_ti',     name: 'TI',             color: 'var(--s6)', lead: '', description: 'Infraestrutura, sistemas e suporte' },
      { id: 'sec_market', name: 'Marketing',      color: 'var(--s8)', lead: '', description: 'Captação, comunicação e relacionamento' }
    ];
  }

  function build(state) {
    state.sectors = sectors();

    /* ---- Projetos ---- */
    state.projects = [
      {
        id: 'prj_boletim', demo: true, name: 'Gerador de relatórios pedagógicos', sectorId: 'sec_pedag',
        problem: 'Professores gastam ~6h por bimestre escrevendo pareceres descritivos, com padrão inconsistente entre turmas.',
        solution: 'Assistente que transforma anotações do professor em parecer estruturado, mantendo o tom do colégio e permitindo edição antes do envio.',
        stage: 'piloto', status: 'ativo', startDate: d(-52), targetDate: d(21), progress: 65,
        stakeholders: ['Coordenação pedagógica', 'Professores do Fundamental II'],
        impact: { hoursSavedMonth: 24, peopleImpacted: 18, costSaved: 0 },
        milestones: [
          { id: 'ms1', title: 'Mapear formato atual dos pareceres', due: d(-40), done: true },
          { id: 'ms2', title: 'Protótipo com 3 professores', due: d(-14), done: true },
          { id: 'ms3', title: 'Piloto com uma série completa', due: d(7), done: false },
          { id: 'ms4', title: 'Liberar para todo o colégio', due: d(30), done: false }
        ],
        updates: [
          { id: 'up1', date: d(-7), text: 'Piloto rodando com o 7º ano. Feedback: querem poder salvar frases favoritas para reutilizar.' },
          { id: 'up2', date: d(-21), text: 'Protótipo aprovado pela coordenação. Ajustado o tom para ficar mais próximo da linguagem do colégio.' }
        ],
        tags: ['pedagógico', 'automação', 'texto'], createdAt: stamp(-52), updatedAt: stamp(-7)
      },
      {
        id: 'prj_inadim', demo: true, name: 'Painel preditivo de inadimplência', sectorId: 'sec_finan',
        problem: 'O financeiro só descobre a inadimplência depois do vencimento, quando a cobrança já é constrangedora.',
        solution: 'Painel que sinaliza famílias com risco de atraso a partir do histórico de pagamento, permitindo contato preventivo e acolhedor.',
        stage: 'desenvolvimento', status: 'ativo', startDate: d(-28), targetDate: d(35), progress: 40,
        stakeholders: ['Financeiro', 'Direção'],
        impact: { hoursSavedMonth: 10, peopleImpacted: 4, costSaved: 12000 },
        milestones: [
          { id: 'ms1', title: 'Extrair histórico de pagamentos (anonimizado)', due: d(-14), done: true },
          { id: 'ms2', title: 'Definir régua de risco com o financeiro', due: d(-3), done: true },
          { id: 'ms3', title: 'Primeira versão do painel', due: d(12), done: false }
        ],
        updates: [{ id: 'up1', date: d(-3), text: 'Régua definida: 3 faixas de risco. Combinamos que o painel nunca mostra nome de aluno, só código da família.' }],
        tags: ['financeiro', 'dados', 'previsão'], createdAt: stamp(-28), updatedAt: stamp(-3)
      },
      {
        id: 'prj_triagem', demo: true, name: 'Triagem de encaminhamentos — Psicologia', sectorId: 'sec_psico',
        problem: 'Os encaminhamentos chegam por WhatsApp, e-mail e papel; nada é rastreado e casos urgentes se perdem na fila.',
        solution: 'Formulário único + fila priorizada, com registro de atendimento e histórico por aluno. Zero uso de IA em dado sensível sem consentimento.',
        stage: 'desenho', status: 'ativo', startDate: d(-12), targetDate: d(45), progress: 20,
        stakeholders: ['Psicologia', 'Coordenação', 'Orientação'],
        impact: { hoursSavedMonth: 8, peopleImpacted: 3, costSaved: 0 },
        milestones: [
          { id: 'ms1', title: 'Mapear fluxo atual de encaminhamento', due: d(-5), done: true },
          { id: 'ms2', title: 'Validar política de privacidade com a direção', due: d(9), done: false }
        ],
        updates: [{ id: 'up1', date: d(-5), text: 'Ponto crítico levantado: dado sensível de menor. Antes de qualquer automação, precisamos de política escrita e aval da direção.' }],
        tags: ['psicologia', 'privacidade', 'processo'], createdAt: stamp(-12), updatedAt: stamp(-5)
      },
      {
        id: 'prj_matricula', demo: true, name: 'Assistente de matrículas', sectorId: 'sec_secre',
        problem: 'A secretaria responde as mesmas 20 perguntas sobre matrícula dezenas de vezes por dia no período de rematrícula.',
        solution: 'Assistente de dúvidas frequentes no site, com escalonamento para atendente humano quando o caso é específico.',
        stage: 'descoberta', status: 'ativo', startDate: d(-5), targetDate: d(60), progress: 8,
        stakeholders: ['Secretaria', 'Marketing'],
        impact: { hoursSavedMonth: 16, peopleImpacted: 5, costSaved: 0 },
        milestones: [{ id: 'ms1', title: 'Levantar as perguntas mais frequentes', due: d(10), done: false }],
        updates: [], tags: ['secretaria', 'atendimento'], createdAt: stamp(-5), updatedAt: stamp(-5)
      },
      {
        id: 'prj_agenda', demo: true, name: 'Automação da agenda de salas', sectorId: 'sec_admin',
        problem: 'Reserva de laboratório e auditório em planilha compartilhada gerava conflito quase toda semana.',
        solution: 'Calendário único com confirmação automática e aviso de conflito.',
        stage: 'producao', status: 'concluido', startDate: d(-90), targetDate: d(-30), progress: 100,
        stakeholders: ['Administrativo', 'Professores'],
        impact: { hoursSavedMonth: 6, peopleImpacted: 40, costSaved: 0 },
        milestones: [{ id: 'ms1', title: 'Migrar reservas da planilha', due: d(-45), done: true }, { id: 'ms2', title: 'Treinar professores', due: d(-33), done: true }],
        updates: [{ id: 'up1', date: d(-30), text: 'Em produção há um mês, zero conflitos de reserva desde a virada.' }],
        tags: ['administrativo', 'automação'], createdAt: stamp(-90), updatedAt: stamp(-30)
      }
    ];

    /* ---- Demandas ---- */
    const T = (o) => Object.assign({
      id: U.uid('tsk'), demo: true, description: '', tags: [], checklist: [], estimateH: 0, timeSpentMin: 0,
      sourceType: 'manual', sourceId: null, createdAt: stamp(-10), updatedAt: stamp(-1)
    }, o);

    state.tasks = [
      T({ id: 'tsk_1', title: 'Ajustar prompt do parecer para linguagem do colégio', sectorId: 'sec_pedag', projectId: 'prj_boletim', status: 'doing', priority: 'alta', due: d(1), estimateH: 3, timeSpentMin: 95, createdAt: stamp(-9),
          description: 'A coordenação apontou que o texto ficou formal demais. Aproximar do vocabulário usado nos relatórios anteriores.',
          checklist: [{ id: 'c1', text: 'Coletar 10 pareceres antigos como referência', done: true }, { id: 'c2', text: 'Reescrever instruções de tom', done: true }, { id: 'c3', text: 'Validar com 2 professoras', done: false }], tags: ['prompt', 'piloto'] }),
      T({ id: 'tsk_2', title: 'Reunião de validação com o financeiro sobre a régua de risco', sectorId: 'sec_finan', projectId: 'prj_inadim', status: 'waiting', priority: 'media', due: d(3), estimateH: 1, createdAt: stamp(-6),
          description: 'Aguardando a Ana confirmar a agenda da semana.' }),
      T({ id: 'tsk_3', title: 'Escrever política de uso de dados sensíveis (psicologia)', sectorId: 'sec_psico', projectId: 'prj_triagem', status: 'todo', priority: 'critica', due: d(-2), estimateH: 5, createdAt: stamp(-11),
          description: 'Documento base para qualquer automação envolvendo dados de alunos atendidos. Precisa de aval da direção antes do desenvolvimento continuar.',
          checklist: [{ id: 'c1', text: 'Levantar exigências da LGPD para menores', done: true }, { id: 'c2', text: 'Rascunhar política', done: false }, { id: 'c3', text: 'Revisar com a direção', done: false }], tags: ['lgpd', 'documento'] }),
      T({ id: 'tsk_4', title: 'Mapear as 20 perguntas mais frequentes da rematrícula', sectorId: 'sec_secre', projectId: 'prj_matricula', status: 'todo', priority: 'media', due: d(5), estimateH: 4, createdAt: stamp(-4), tags: ['descoberta'] }),
      T({ id: 'tsk_5', title: 'Treinar secretaria no novo fluxo de agendamento de salas', sectorId: 'sec_admin', projectId: 'prj_agenda', status: 'done', priority: 'media', due: d(-12), completedAt: stamp(-12), estimateH: 2, timeSpentMin: 120, createdAt: stamp(-20) }),
      T({ id: 'tsk_6', title: 'Consolidar histórico de pagamentos anonimizado', sectorId: 'sec_finan', projectId: 'prj_inadim', status: 'done', priority: 'alta', due: d(-14), completedAt: stamp(-13), estimateH: 6, timeSpentMin: 340, createdAt: stamp(-24) }),
      T({ id: 'tsk_7', title: 'Demo do gerador de pareceres na reunião pedagógica', sectorId: 'sec_pedag', projectId: 'prj_boletim', status: 'done', priority: 'alta', due: d(-8), completedAt: stamp(-8), estimateH: 2, timeSpentMin: 150, createdAt: stamp(-18) }),
      T({ id: 'tsk_8', title: 'Levantar custo das ferramentas de IA para o orçamento 2027', sectorId: 'sec_direc', status: 'backlog', priority: 'media', due: d(25), estimateH: 3, createdAt: stamp(-3), tags: ['orçamento'] }),
      T({ id: 'tsk_9', title: 'Criar guia de uso responsável de IA para professores', sectorId: 'sec_pedag', status: 'backlog', priority: 'alta', estimateH: 8, createdAt: stamp(-15), tags: ['formação', 'documento'],
          description: 'Material curto (2 páginas) sobre o que pode e o que não pode, com exemplos práticos do dia a dia da sala de aula.' }),
      T({ id: 'tsk_10', title: 'Corrigir erro de acentuação na exportação do painel', sectorId: 'sec_finan', projectId: 'prj_inadim', status: 'doing', priority: 'baixa', estimateH: 1, timeSpentMin: 25, createdAt: stamp(-2) }),
      T({ id: 'tsk_11', title: 'Responder e-mail da direção sobre cronograma do semestre', sectorId: 'sec_direc', status: 'todo', priority: 'alta', due: d(0), estimateH: 1, createdAt: stamp(-1) }),
      T({ id: 'tsk_12', title: 'Testar integração do calendário com o sistema acadêmico', sectorId: 'sec_ti', status: 'waiting', priority: 'media', due: d(8), estimateH: 4, createdAt: stamp(-8), description: 'TI precisa liberar credencial de teste.' }),
      T({ id: 'tsk_13', title: 'Preparar apresentação do balanço trimestral de IA', sectorId: 'sec_direc', status: 'todo', priority: 'alta', due: d(11), estimateH: 5, createdAt: stamp(-2), tags: ['apresentação'] }),
      T({ id: 'tsk_14', title: 'Documentar arquitetura do gerador de pareceres', sectorId: 'sec_pedag', projectId: 'prj_boletim', status: 'done', priority: 'baixa', completedAt: stamp(-4), estimateH: 2, timeSpentMin: 110, createdAt: stamp(-10) }),
      T({ id: 'tsk_15', title: 'Entrevistar 3 professores sobre uso atual de IA em sala', sectorId: 'sec_pedag', status: 'done', priority: 'media', completedAt: stamp(-19), estimateH: 3, timeSpentMin: 180, createdAt: stamp(-26) }),
      T({ id: 'tsk_16', title: 'Revisar contrato da ferramenta de transcrição', sectorId: 'sec_admin', status: 'done', priority: 'media', completedAt: stamp(-25), estimateH: 2, timeSpentMin: 90, createdAt: stamp(-30) })
    ];

    /* ---- Reuniões ---- */
    state.meetings = [
      {
        id: 'mtg_1', demo: true, title: 'Alinhamento do piloto de pareceres', date: d(-7), time: '09:00', durationMin: 60,
        sectorId: 'sec_pedag', type: 'acompanhamento', participants: ['Coordenação pedagógica', '3 professores do 7º ano'],
        agenda: 'Feedback da primeira semana de piloto\nAjustes de tom\nPróximos passos',
        notes: 'Os professores gostaram da estrutura, mas acham o texto "engessado". Duas professoras pediram um jeito de salvar frases que usam sempre.\n\nA coordenação lembrou que o parecer vai para a família — o tom importa mais que a velocidade.',
        decisions: ['Ajustar o tom antes de ampliar o piloto', 'Adicionar biblioteca de frases favoritas na próxima versão'],
        taskIds: ['tsk_1'], insightIds: ['ins_1'], followUpDate: d(7), mood: 4,
        createdAt: stamp(-7), updatedAt: stamp(-7)
      },
      {
        id: 'mtg_2', demo: true, title: 'Levantamento de demanda — Psicologia', date: d(-12), time: '14:30', durationMin: 90,
        sectorId: 'sec_psico', type: 'levantamento', participants: ['Psicóloga escolar', 'Orientadora'],
        agenda: 'Entender o fluxo de encaminhamentos\nIdentificar gargalos',
        notes: 'Hoje o encaminhamento chega por 4 canais diferentes. Não existe fila nem histórico — a psicóloga guarda tudo em um caderno.\n\nCaso relatado: um encaminhamento urgente ficou 9 dias parado porque a mensagem se perdeu no WhatsApp.\n\nAlerta importante: são dados sensíveis de menores. Nada de IA sobre esse conteúdo sem política escrita.',
        decisions: ['Começar pelo processo, não pela tecnologia', 'Política de privacidade é pré-requisito, não etapa final'],
        taskIds: ['tsk_3'], insightIds: ['ins_2'], followUpDate: d(2), mood: 3,
        createdAt: stamp(-12), updatedAt: stamp(-12)
      },
      {
        id: 'mtg_3', demo: true, title: 'Reunião mensal com a direção', date: d(-3), time: '10:00', durationMin: 45,
        sectorId: 'sec_direc', type: 'diretoria', participants: ['Direção', 'Coordenação geral'],
        agenda: 'Status dos projetos\nOrçamento de ferramentas\nPróximo trimestre',
        notes: 'Apresentei o andamento dos 4 projetos ativos. A direção pediu números: quanto tempo estamos economizando de fato.\n\nPediram também um balanço trimestral com indicadores — vai virar apresentação recorrente.',
        decisions: ['Passar a reportar horas economizadas por mês', 'Balanço trimestral no calendário fixo'],
        taskIds: ['tsk_13', 'tsk_8'], insightIds: ['ins_3'], followUpDate: d(11), mood: 4,
        createdAt: stamp(-3), updatedAt: stamp(-3)
      },
      {
        id: 'mtg_4', demo: true, title: 'Financeiro — régua de risco de inadimplência', date: d(-3), time: '15:00', durationMin: 60,
        sectorId: 'sec_finan', type: 'alinhamento', participants: ['Coordenação financeira'],
        agenda: 'Definir faixas de risco\nCombinar privacidade dos dados',
        notes: 'Definimos 3 faixas (baixo, atenção, alto). O painel não mostra nome de aluno — apenas código da família, para o contato ser feito por quem já tem a relação.',
        decisions: ['3 faixas de risco', 'Painel sem nome de aluno'],
        taskIds: ['tsk_2'], insightIds: [], followUpDate: d(3), mood: 5,
        createdAt: stamp(-3), updatedAt: stamp(-3)
      }
    ];

    /* ---- Insights ---- */
    state.insights = [
      { id: 'ins_1', demo: true, title: 'Professores querem reutilizar frases próprias', description: 'Cada professor tem um repertório de frases que já usa. Uma biblioteca pessoal de trechos aumentaria a adoção mais do que qualquer melhoria no modelo.', sectorId: 'sec_pedag', source: 'Reunião de piloto', tags: ['adoção', 'produto'], impact: 4, effort: 2, status: 'aprovado', createdAt: stamp(-7), updatedAt: stamp(-6), convertedTo: null },
      { id: 'ins_2', demo: true, title: 'Processo antes de tecnologia', description: 'Metade das demandas que chegam como "preciso de uma IA" são, na verdade, processo mal desenhado. Vale ter uma etapa fixa de diagnóstico antes de prometer solução.', sectorId: 'sec_psico', source: 'Levantamento psicologia', tags: ['método', 'diagnóstico'], impact: 5, effort: 2, status: 'aprovado', createdAt: stamp(-12), updatedAt: stamp(-10), convertedTo: null },
      { id: 'ins_3', demo: true, title: 'A direção decide por números, não por demonstração', description: 'Demos impressionam, mas a decisão de investir veio quando falei em horas economizadas. Todo projeto precisa nascer com uma métrica combinada.', sectorId: 'sec_direc', source: 'Reunião de diretoria', tags: ['gestão', 'métricas'], impact: 5, effort: 1, status: 'convertido', createdAt: stamp(-3), updatedAt: stamp(-2), convertedTo: { type: 'tasks', id: 'tsk_13' } },
      { id: 'ins_4', demo: true, title: 'Secretaria repete as mesmas perguntas o dia todo', description: 'No período de rematrícula, a mesma dúvida sobre documentação aparece dezenas de vezes. É o caso de uso com melhor relação impacto/esforço do colégio.', sectorId: 'sec_secre', source: 'Observação de campo', tags: ['atendimento'], impact: 4, effort: 3, status: 'convertido', createdAt: stamp(-6), updatedAt: stamp(-5), convertedTo: { type: 'projects', id: 'prj_matricula' } },
      { id: 'ins_5', demo: true, title: 'Formação vale mais que ferramenta', description: 'Professores usam IA por conta própria, sem critério. Um guia curto de uso responsável talvez gere mais impacto que o próximo sistema.', sectorId: 'sec_pedag', source: 'Conversa de corredor', tags: ['formação', 'risco'], impact: 5, effort: 2, status: 'novo', createdAt: stamp(-2), updatedAt: stamp(-2), convertedTo: null },
      { id: 'ins_6', demo: true, title: 'Ninguém lê e-mail longo', description: 'Comunicados extensos não são lidos. Resumo de 3 linhas no topo aumentou muito a resposta.', sectorId: 'sec_admin', source: 'Teste próprio', tags: ['comunicação'], impact: 2, effort: 1, status: 'arquivado', createdAt: stamp(-16), updatedAt: stamp(-15), convertedTo: null }
    ];

    /* ---- Notas ---- */
    state.notes = [
      { id: 'not_1', demo: true, title: 'Método: como recebo uma demanda', body: '## Roteiro de 5 perguntas\n\n1. **Qual o problema?** (não a solução que a pessoa imaginou)\n2. **Quantas vezes por semana isso acontece?**\n3. **Quanto tempo custa por vez?**\n4. **O que acontece se ficar como está?**\n5. **Como saberemos que melhorou?**\n\n> Se não houver resposta para a 5, ainda não é projeto — é ideia.\n\nDepois disso: registrar como *insight*, não como projeto. Projeto só nasce quando tem métrica combinada.', tags: ['método', 'diagnóstico'], sectorId: null, pinned: true, color: 'amarelo', createdAt: stamp(-20), updatedAt: stamp(-5) },
      { id: 'not_2', demo: true, title: 'Princípios do trabalho', body: '- Processo antes de tecnologia\n- Nada de dado sensível sem política escrita\n- Toda entrega precisa de um dono no setor\n- Piloto pequeno vale mais que plano grande\n- O sucesso é o setor não precisar mais de mim para aquilo', tags: ['princípios'], sectorId: null, pinned: true, color: 'azul', createdAt: stamp(-30), updatedAt: stamp(-12) },
      { id: 'not_3', demo: true, title: 'Perguntas da direção (para o balanço)', body: 'O que eles sempre perguntam:\n\n- Quantas horas economizamos?\n- Quantas pessoas usam de verdade?\n- Qual o custo mensal das ferramentas?\n- O que deu errado e o que aprendemos?\n\nDeixar esses quatro números sempre prontos no painel.', tags: ['gestão', 'apresentação'], sectorId: 'sec_direc', pinned: false, color: 'verde', createdAt: stamp(-3), updatedAt: stamp(-3) },
      { id: 'not_4', demo: true, title: 'Ideias soltas', body: '- Bot de avisos para o grupo dos professores?\n- Transcrição automática das reuniões de conselho de classe\n- Correção assistida de redação (cuidado: sensível)\n- Painel de frequência com alerta de evasão', tags: ['ideias'], sectorId: null, pinned: false, color: 'roxo', createdAt: stamp(-9), updatedAt: stamp(-1) }
    ];

    /* ---- Eventos ---- */
    state.events = [
      { id: 'evt_1', demo: true, title: 'Bloco de foco — política de dados', date: d(0), time: '08:00', endTime: '10:00', type: 'foco', sectorId: 'sec_psico', location: '', notes: 'Sem reuniões, celular no silencioso.', remindMinBefore: 15, done: false, createdAt: stamp(-1), updatedAt: stamp(-1) },
      { id: 'evt_2', demo: true, title: 'Café com a coordenação pedagógica', date: d(1), time: '10:30', endTime: '11:00', type: 'reuniao', sectorId: 'sec_pedag', location: 'Sala da coordenação', notes: '', remindMinBefore: 15, done: false, createdAt: stamp(-2), updatedAt: stamp(-2) },
      { id: 'evt_3', demo: true, title: 'Formação: IA na educação (webinar)', date: d(4), time: '19:00', endTime: '20:30', type: 'formacao', sectorId: null, location: 'Online', notes: '', remindMinBefore: 30, done: false, createdAt: stamp(-3), updatedAt: stamp(-3) },
      { id: 'evt_4', demo: true, title: 'Conselho de classe do 2º trimestre', date: d(9), time: '13:00', endTime: '17:00', type: 'evento', sectorId: 'sec_pedag', location: 'Auditório', notes: 'Boa oportunidade para observar o processo de perto.', remindMinBefore: 60, done: false, createdAt: stamp(-5), updatedAt: stamp(-5) },
      { id: 'evt_5', demo: true, title: 'Revisão semanal (ritual)', date: U.addDays(U.startOfWeek(U.today(), 1), 4), time: '16:00', endTime: '17:00', type: 'lembrete', sectorId: null, location: '', notes: 'Rever quadro, fechar o que dá, planejar a semana seguinte.', remindMinBefore: 10, done: false, createdAt: stamp(-7), updatedAt: stamp(-7) }
    ];

    /* ---- Diário ---- */
    state.journal = [
      { id: 'jnl_1', demo: true, date: d(-1), energy: 4, mood: 4, focus: 'Fechar o ajuste de tom do gerador de pareceres', wins: 'Consegui duas professoras para validar amanhã. O feedback de ontem virou ajuste concreto.', blockers: 'Ainda travado na política de dados — depende da direção.', learned: 'Mostrar antes de terminar economiza semanas.', tomorrow: 'Rascunhar a política e mandar para a direção.', createdAt: stamp(-1), updatedAt: stamp(-1) },
      { id: 'jnl_2', demo: true, date: d(-2), energy: 3, mood: 3, focus: 'Reunião com a direção', wins: 'Balanço bem recebido, pediram indicadores recorrentes.', blockers: 'Faltou número pronto na hora — improvisei.', learned: 'Ter os 4 números do painel sempre atualizados.', tomorrow: 'Montar o painel de indicadores.', createdAt: stamp(-2), updatedAt: stamp(-2) },
      { id: 'jnl_3', demo: true, date: d(-3), energy: 5, mood: 5, focus: 'Régua de risco com o financeiro', wins: 'Reunião ótima, saímos com decisão fechada.', blockers: '', learned: 'Quando levo uma proposta pronta para criticar, a reunião rende o dobro.', tomorrow: 'Começar o painel.', createdAt: stamp(-3), updatedAt: stamp(-3) }
    ];

    /* ---- Tempo registrado ---- */
    state.timeLogs = [
      { id: 'tl_1', demo: true, taskId: 'tsk_1', projectId: 'prj_boletim', date: d(-1), minutes: 95, note: 'Reescrita das instruções de tom', createdAt: stamp(-1) },
      { id: 'tl_2', demo: true, taskId: 'tsk_10', projectId: 'prj_inadim', date: d(0), minutes: 25, note: '', createdAt: stamp(0) },
      { id: 'tl_3', demo: true, taskId: 'tsk_6', projectId: 'prj_inadim', date: d(-13), minutes: 340, note: 'Extração e limpeza', createdAt: stamp(-13) }
    ];

    return state;
  }

  App.seed = { build, sectors };
})(window.App);
