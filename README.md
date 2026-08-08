# Núcleo de IA — Colégio Fazer Crescer

Diário de bordo, painel de acompanhamento e companheiro digital do Engenheiro de IA do
colégio, atendendo as demandas dos setores (pedagógico, psicologia, financeiro,
administrativo, secretaria, direção, TI, marketing).

Roda inteiramente no navegador. Sem instalação, sem servidor, sem conta, sem mensalidade —
e **seus dados nunca saem do seu computador**.

---

## Como usar

### Opção 1 — publicar no GitHub Pages (recomendado)

Assim você acessa de qualquer dispositivo pelo link, e o navegador guarda os dados de cada
aparelho separadamente.

1. No GitHub, entre em **Settings → Pages**
2. Em *Source*, escolha **Deploy from a branch**
3. Selecione a branch (`main` ou a branch deste sistema) e a pasta `/ (root)` → **Save**
4. Em um ou dois minutos o endereço aparece na própria página. Salve nos favoritos.

### Opção 2 — rodar localmente

```bash
# na pasta do projeto
python3 -m http.server 8000
# depois abra http://localhost:8000
```

> Abrir o `index.html` com dois cliques também funciona na maioria dos navegadores, mas alguns
> restringem o armazenamento local em arquivos abertos diretamente do disco. Se o sistema não
> estiver guardando seus registros, use uma das opções acima.

---

## O que tem dentro

| Área | Para que serve |
|---|---|
| **Painel** | Prioridades do dia, agenda de hoje, ritmo de entregas, demanda por setor, pipeline de projetos, constância e metas |
| **Agenda** | Calendário em mês, semana e lista. Reúne eventos, reuniões e prazos de demandas. Suporta eventos recorrentes |
| **Demandas** | Quadro kanban com arrastar e soltar (Backlog → A fazer → Em andamento → Aguardando → Concluído), checklists, prazos, prioridades e registro de tempo |
| **Projetos** | Cada solução por setor: problema, solução, etapa, marcos, diário do projeto e impacto (horas devolvidas, pessoas atingidas, economia) |
| **Reuniões** | Memória das conversas: pauta, anotações, decisões, participantes. Cada decisão vira demanda com um clique; o retorno combinado vira lembrete na agenda |
| **Insights** | Percepções que ainda não são projeto, na matriz impacto × esforço. Todo insight termina virando demanda, virando projeto ou arquivado |
| **Anotações** | Texto livre com markdown: seu método, princípios, roteiros, referências e ideias |
| **Diário** | Check-in diário (energia, humor, foco, o que deu certo, o que travou, o que aprendi) e revisão semanal guiada |
| **Relatórios** | Indicadores por período, cobertura dos setores e um **relatório pronto para a direção**, em texto, para copiar ou baixar |

### Sabiá, o companheiro digital

O painel lateral direito é um agente que lê seus dados e conversa com você. O nome padrão é
**Sabiá** — o pássaro que voa no logo do colégio — e pode ser trocado nas Configurações. Ele:

- monta o briefing do dia e diz por onde começar;
- avisa sobre atrasos, prazos de hoje e reuniões marcadas;
- reclama quando você tem coisas demais em andamento ao mesmo tempo;
- cobra retorno de quem está te fazendo esperar há mais de uma semana;
- aponta projetos parados há duas semanas e insights sem decisão;
- lembra do check-in do diário e da revisão de sexta-feira;
- comemora quando a meta da semana é batida;
- responde a perguntas rápidas: *o que faço agora?*, *como está a semana?*, *o que está travado?*, *como estão os setores?*

Nome, personalidade (parceiro, direto ou zen) e metas ficam em **Configurações**.

---

## Atalhos de teclado

| Tecla | Ação |
|---|---|
| `Ctrl/Cmd + K` | Busca global e paleta de comandos |
| `N` | Novo registro (demanda, reunião, insight…) |
| `C` | Abrir/fechar o companheiro |
| `D` `T` `A` `R` | Painel · Demandas · Agenda · Relatórios |
| `J` | Registrar o dia no diário |
| `Esc` | Fechar janela aberta |

---

## Seus dados

Tudo é gravado no `localStorage` do navegador. Isso significa:

- **nada é enviado para lugar nenhum** — nenhum servidor, nenhuma nuvem, nenhuma análise externa;
- os dados ficam **por navegador e por dispositivo** — o que você registra no computador do colégio
  não aparece no celular;
- **limpar os dados de navegação apaga tudo.**

Por isso o sistema insiste em backup:

- **Configurações → Exportar backup** gera um arquivo `.json` com absolutamente tudo. Guarde no
  Drive, no e-mail, onde preferir. O companheiro te lembra quando passam 14 dias sem exportar.
- **Restaurar backup** substitui os dados atuais pelo arquivo; **Mesclar** acrescenta só o que falta
  (útil para juntar o que você registrou em dois dispositivos).
- O sistema também guarda **pontos de restauração automáticos** antes de operações arriscadas.

O sistema já vem com demandas, projetos e reuniões de exemplo para você não começar com telas vazias.
Quando quiser o espaço só seu: **Configurações → Remover os registros de exemplo**.

---

## Identidade visual

As cores vêm do logo do colégio:

| Cor | Código | Onde aparece |
|---|---|---|
| Azul-marinho | `#1e3a79` | pássaro e traço do logo · cor de ação do sistema (botões, links, destaques) |
| Verde-limão | `#a8cf38` | copa entrelaçada · marca, avatar do companheiro |
| Verde de gráfico | `#8ab023` | versão escurecida do verde, legível como barra e fatia |

A marca que acompanha o sistema é um **desenho vetorial inspirado no logo**, feito para
funcionar de 20px (favicon) a 144px. Para usar o arquivo oficial no lugar dele:

1. salve a imagem em `assets/img/logo.svg` (ou `logo.png`);
2. abra **Configurações → Identidade visual → Procurar logo do colégio**.

Ele passa a aparecer na barra lateral, na tela de abertura e nas Configurações. Se o arquivo
não existir, o desenho de reserva continua no lugar — nada quebra.

As cores de gráfico não foram escolhidas no olho: a ordem das séries foi testada com um
validador para **daltonismo** (protanopia, deuteranopia, tritanopia) e **contraste** nos temas
claro e escuro. Se você mudar as cores, revalide — trocar a ordem das séries pode tornar duas
fatias vizinhas indistinguíveis para parte das pessoas. Os códigos ficam no topo de
`assets/css/app.css`.

## Estrutura do código

Sem dependências, sem build, sem framework. É só abrir e usar.

```
index.html                  casca da aplicação
assets/css/app.css          design system (tokens, componentes, tema claro/escuro)
assets/js/
  utils.js                  datas, formatação, markdown, ícones
  brand.js                  marca do colégio (logo, cores, favicon)
  store.js                  estado, persistência, catálogos e seletores
  seed.js                   setores padrão e dados de exemplo
  ui.js                     modais, toasts, menus, confirmação
  charts.js                 gráficos em SVG puro (linha, colunas, rosca, funil, matriz, mapa de calor)
  forms.js                  formulários de todas as entidades
  companion.js              motor de regras do companheiro digital
  app.js                    navegação, atalhos, busca global
  views/                    uma tela por arquivo
```

Os gráficos seguem regras fixas de leitura: paleta validada para daltonismo, marcas finas,
respiro de 2px entre marcas, rótulos seletivos e texto sempre em tom de tinta — nunca na cor da série.

### Adicionar um setor novo

**Configurações → Setores do colégio → Novo setor.** Cor, responsável e descrição. O setor passa a
aparecer em todos os filtros, gráficos e relatórios automaticamente.

---

## Perguntas que este sistema ajuda a responder

- O que eu preciso fazer agora?
- O que eu entreguei nos últimos três meses?
- Quantas horas por mês as soluções devolveram para o colégio?
- Qual setor eu estou deixando de atender?
- O que foi decidido naquela reunião de abril?
- Por que aquele projeto parou?
- Como eu estava me sentindo na semana em que tudo deu certo?
