/* ============================================================
   charts.js — gráficos em SVG/HTML puro, sem bibliotecas.
   Regras: marcas finas, ponta arredondada 4px na extremidade de dado,
   linha 2px, respiro de 2px entre marcas, rótulos seletivos,
   texto sempre em token de tinta (nunca na cor da série).
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util;
  const S = () => App.store.SERIES;

  /* ---------- tooltip ---------- */
  const tip = (title, rows) => 'data-tip="' + encodeURIComponent(
    '<strong>' + U.esc(title) + '</strong>' +
    (rows || []).map(r => `<div class="tip-row">${r.color ? `<span class="tip-dot" style="background:${r.color}"></span>` : ''}<span>${U.esc(r.label)}</span>${r.value !== undefined ? `<span style="margin-left:auto;font-weight:600">${U.esc(r.value)}</span>` : ''}</div>`).join('')
  ) + '"';

  /* ---------- slots responsivos ----------
     Gráficos com eixo são desenhados só depois de medir a largura real do
     container: escalar um SVG de largura fixa encolheria junto o texto. */
  const BUILDERS = {};
  function slot(kind, payload, height) {
    return `<div class="chart-slot" data-chart="${kind}" data-payload="${U.esc(JSON.stringify(payload))}" style="min-height:${height}px"></div>`;
  }
  function hydrate(root) {
    U.$$('.chart-slot', root || document).forEach(node => {
      const w = Math.max(260, Math.round(node.clientWidth || node.parentNode.clientWidth || 460));
      let payload;
      try { payload = JSON.parse(node.dataset.payload); } catch (e) { return; }
      const build = BUILDERS[node.dataset.chart];
      if (!build) return;
      payload.opts = payload.opts || {};
      payload.opts.width = w;
      node.innerHTML = build(payload);
      node.style.minHeight = '';
    });
  }

  const niceMax = v => {
    if (v <= 0) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  };

  /* ============================================================
     1. BARRAS HORIZONTAIS (magnitude por categoria) — HTML
     items: [{label, value, color?, meta?}]
     ============================================================ */
  function barsH(items, opts) {
    opts = opts || {};
    if (!items.length) return `<p class="muted small" style="padding:12px 0">Sem dados no período.</p>`;
    const max = Math.max.apply(null, items.map(i => i.value).concat([1]));
    const fmt = opts.format || (v => U.fmtNumber(v));
    return `<div class="bars-h" style="display:grid;gap:11px">` + items.map((it, i) => {
      const w = Math.max((it.value / max) * 100, it.value > 0 ? 1.5 : 0);
      const color = it.color || S()[i % 8];
      return `<div class="bar-row" style="display:grid;grid-template-columns:minmax(72px,${opts.labelWidth || '34%'}) 1fr auto;gap:10px;align-items:center"
                ${tip(it.label, [{ label: opts.valueLabel || 'Total', value: fmt(it.value), color }].concat(it.meta ? [{ label: it.meta }] : []))}>
        <span class="truncate" style="font-size:12.5px;color:var(--ink-2)" title="${U.esc(it.label)}">${U.esc(it.label)}</span>
        <span style="display:block;height:14px;background:var(--sunken);border-radius:0 4px 4px 0;position:relative">
          <span style="position:absolute;inset:0 auto 0 0;width:${w}%;background:${color};border-radius:0 4px 4px 0;transition:width .5s cubic-bezier(.2,.8,.3,1)"></span>
        </span>
        <span class="tnum" style="font-size:12.5px;font-weight:620;color:var(--ink-2);min-width:30px;text-align:right">${fmt(it.value)}</span>
      </div>`;
    }).join('') + `</div>`;
  }

  /* ============================================================
     2. BARRAS EMPILHADAS POR CATEGORIA — HTML
     items: [{label, parts:[{key,value,color}]}]
     ============================================================ */
  function barsStacked(items, legend, opts) {
    opts = opts || {};
    if (!items.length) return `<p class="muted small" style="padding:12px 0">Sem dados.</p>`;
    const totals = items.map(i => U.sum(i.parts.map(p => p.value)));
    const max = Math.max.apply(null, totals.concat([1]));
    const body = items.map((it, idx) => {
      const total = totals[idx];
      const segs = it.parts.filter(p => p.value > 0).map(p => {
        const w = (p.value / max) * 100;
        return `<span ${tip(it.label, [{ label: p.key, value: U.fmtNumber(p.value), color: p.color }, { label: 'Total', value: U.fmtNumber(total) }])}
          style="width:${w}%;background:${p.color};border-radius:0;flex:none;cursor:pointer"></span>`;
      }).join('');
      return `<div style="display:grid;grid-template-columns:minmax(72px,32%) 1fr auto;gap:10px;align-items:center">
        <span class="truncate" style="font-size:12.5px;color:var(--ink-2)" title="${U.esc(it.label)}">${U.esc(it.label)}</span>
        <span style="display:flex;height:14px;gap:2px;background:var(--sunken);border-radius:0 4px 4px 0;overflow:hidden">${segs}</span>
        <span class="tnum" style="font-size:12.5px;font-weight:620;color:var(--ink-2);min-width:24px;text-align:right">${U.fmtNumber(total)}</span>
      </div>`;
    }).join('');
    return `<div style="display:grid;gap:11px">${body}</div>` + (legend ? legendHtml(legend) : '');
  }

  /* ============================================================
     3. ROSCA (composição de um todo) — SVG
     ============================================================ */
  function donut(items, opts) {
    opts = opts || {};
    const data = items.filter(i => i.value > 0);
    const total = U.sum(items.map(i => i.value));
    const size = opts.size || 176, stroke = opts.stroke || 20;
    const r = (size - stroke) / 2 - 2, cx = size / 2, cy = size / 2;
    const circ = 2 * Math.PI * r;
    const gap = 2; // respiro de 2px na cor da superfície

    let offset = 0;
    const segs = data.map((it, i) => {
      const frac = it.value / total;
      const len = Math.max(frac * circ - (data.length > 1 ? gap : 0), 1);
      const seg = `<circle class="mark" cx="${cx}" cy="${cy}" r="${r}" fill="none"
        stroke="${it.color || S()[i % 8]}" stroke-width="${stroke}"
        stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${cx} ${cy})" style="cursor:pointer;transition:opacity .15s"
        ${tip(it.label, [{ label: opts.valueLabel || 'Quantidade', value: U.fmtNumber(it.value) + ' · ' + U.pct(it.value, total) + '%', color: it.color || S()[i % 8] }])}></circle>`;
      offset += frac * circ;
      return seg;
    }).join('');

    const center = opts.centerValue !== undefined ? `
      <text x="${cx}" y="${cy - 2}" text-anchor="middle" style="font-size:27px;font-weight:660;fill:var(--ink)">${U.esc(opts.centerValue)}</text>
      <text x="${cx}" y="${cy + 17}" text-anchor="middle" style="font-size:11px;fill:var(--ink-3)">${U.esc(opts.centerLabel || '')}</text>` : '';

    const svg = `<svg class="chart" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${U.esc(opts.aria || 'Distribuição')}">
      ${total ? segs : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--sunken)" stroke-width="${stroke}"></circle>`}
      ${center}</svg>`;

    if (opts.legend === false) return svg;
    return `<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;justify-content:center">
      ${svg}<div style="flex:1;min-width:130px">${legendHtml(items.map((i, ix) => ({
        label: i.label, color: i.color || S()[ix % 8], value: U.fmtNumber(i.value) + (total ? ` · ${U.pct(i.value, total)}%` : '')
      })), true)}</div></div>`;
  }

  /* ============================================================
     4. LINHA / ÁREA (evolução no tempo) — SVG
     series: [{name,color,points:[{x,y,label}]}]
     ============================================================ */
  function lineArea(series, opts) {
    opts = opts || {};
    if (!series.length || !(series[0].points || []).length) return `<p class="muted small" style="padding:12px 0">Sem dados no período.</p>`;
    return slot('line', { series, opts }, opts.height || 220);
  }
  BUILDERS.line = p => lineAreaSVG(p.series, p.opts);

  function lineAreaSVG(series, opts) {
    opts = opts || {};
    const W = opts.width || 640, H = opts.height || 220;
    const pad = { t: 14, r: 16, b: 26, l: 34 };
    const first = series[0] || { points: [] };
    const n = first.points.length;
    if (!n) return `<p class="muted small" style="padding:12px 0">Sem dados no período.</p>`;

    const allY = series.reduce((acc, s) => acc.concat(s.points.map(p => p.y)), []);
    const maxY = niceMax(Math.max.apply(null, allY.concat([1])));
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const X = i => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    const Y = v => pad.t + ih - (v / maxY) * ih;

    const ticks = [0, maxY / 2, maxY];
    const grid = ticks.map(t => `
      <line class="grid-line" x1="${pad.l}" y1="${Y(t)}" x2="${W - pad.r}" y2="${Y(t)}"></line>
      <text class="axis-label" x="${pad.l - 7}" y="${Y(t) + 3.5}" text-anchor="end">${U.fmtCompact(t)}</text>`).join('');

    const step = Math.max(1, Math.ceil(n / 7));
    const xLabels = first.points.map((p, i) =>
      (i % step === 0 || i === n - 1) ? `<text class="axis-label" x="${X(i)}" y="${H - 7}" text-anchor="middle">${U.esc(p.label || '')}</text>` : ''
    ).join('');

    const body = series.map((s, si) => {
      const color = s.color || S()[si % 8];
      const line = s.points.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.y).toFixed(1)).join(' ');
      const area = opts.area === false || series.length > 1 ? '' :
        `<path d="${line} L${X(n - 1).toFixed(1)} ${Y(0)} L${X(0).toFixed(1)} ${Y(0)} Z" fill="${color}" opacity=".10"></path>`;
      const last = s.points[n - 1];
      const endDot = `<circle cx="${X(n - 1)}" cy="${Y(last.y)}" r="4.5" fill="${color}" stroke="var(--surface)" stroke-width="2"></circle>`;
      const endLabel = opts.endLabel === false ? '' :
        `<text class="val-label" x="${X(n - 1) - 8}" y="${Y(last.y) - 11}" text-anchor="end">${U.fmtNumber(last.y)}</text>`;
      return area + `<path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>` + endDot + endLabel;
    }).join('');

    // camada de interação: uma faixa por ponto no eixo x
    const hits = first.points.map((p, i) => {
      const bw = iw / Math.max(n - 1, 1);
      const rows = series.map((s, si) => ({
        label: s.name, value: U.fmtNumber(s.points[i] ? s.points[i].y : 0), color: s.color || S()[si % 8]
      }));
      return `<g><rect class="hit" x="${X(i) - bw / 2}" y="${pad.t}" width="${bw}" height="${ih}" ${tip(p.tipLabel || p.label || '', rows)}></rect>
        <line x1="${X(i)}" y1="${pad.t}" x2="${X(i)}" y2="${pad.t + ih}" stroke="var(--axis)" stroke-width="1" opacity="0" class="crosshair"></line></g>`;
    }).join('');

    const legend = series.length > 1 ? legendHtml(series.map((s, i) => ({ label: s.name, color: s.color || S()[i % 8] }))) : '';
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${U.esc(opts.aria || 'Evolução no tempo')}">
      ${grid}${xLabels}${body}
      <line class="base-line" x1="${pad.l}" y1="${Y(0)}" x2="${W - pad.r}" y2="${Y(0)}"></line>
      ${hits}</svg>${legend}`;
  }

  /* ============================================================
     5. COLUNAS (comparação por período) — SVG
     ============================================================ */
  function columns(items, opts) {
    opts = opts || {};
    if (!items.length) return `<p class="muted small" style="padding:12px 0">Sem dados.</p>`;
    return slot('columns', { items, opts }, opts.height || 200);
  }
  BUILDERS.columns = p => columnsSVG(p.items, p.opts);

  function columnsSVG(items, opts) {
    opts = opts || {};
    const W = opts.width || 640, H = opts.height || 200;
    const pad = { t: 20, r: 10, b: 26, l: 34 };
    if (!items.length) return `<p class="muted small">Sem dados.</p>`;
    const maxY = niceMax(Math.max.apply(null, items.map(i => i.value).concat([1])));
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const band = iw / items.length;
    const bw = Math.min(24, band - 8);
    const Y = v => pad.t + ih - (v / maxY) * ih;

    const grid = [0, maxY / 2, maxY].map(t => `
      <line class="grid-line" x1="${pad.l}" y1="${Y(t)}" x2="${W - pad.r}" y2="${Y(t)}"></line>
      <text class="axis-label" x="${pad.l - 7}" y="${Y(t) + 3.5}" text-anchor="end">${U.fmtCompact(t)}</text>`).join('');

    const bars = items.map((it, i) => {
      const x = pad.l + band * i + (band - bw) / 2;
      const h = Math.max(it.value > 0 ? 3 : 0, ih - (Y(it.value) - pad.t));
      const y = pad.t + ih - h;
      const color = it.color || S()[0];
      const label = opts.labelAll || i === items.length - 1 || it.value === maxY
        ? `<text class="val-label" x="${x + bw / 2}" y="${y - 6}" text-anchor="middle">${U.fmtNumber(it.value)}</text>` : '';
      return `<g class="hoverable" ${tip(it.label, [{ label: opts.valueLabel || 'Total', value: U.fmtNumber(it.value), color }].concat(it.meta ? [{ label: it.meta }] : []))}>
        <rect class="hit" x="${pad.l + band * i}" y="${pad.t}" width="${band}" height="${ih}"></rect>
        <path class="mark" d="M${x} ${y + h} L${x} ${y + 4} Q${x} ${y} ${x + 4} ${y} L${x + bw - 4} ${y} Q${x + bw} ${y} ${x + bw} ${y + 4} L${x + bw} ${y + h} Z" fill="${color}"></path>
        ${label}
        <text class="axis-label" x="${pad.l + band * i + band / 2}" y="${H - 7}" text-anchor="middle">${U.esc(it.short || it.label)}</text>
      </g>`;
    }).join('');

    return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${U.esc(opts.aria || 'Comparação por período')}">
      ${grid}${bars}<line class="base-line" x1="${pad.l}" y1="${Y(0)}" x2="${W - pad.r}" y2="${Y(0)}"></line></svg>`;
  }

  /* ============================================================
     6. MAPA DE CALOR (constância) — SVG
     data: {'YYYY-MM-DD': valor}
     ============================================================ */
  function heatmap(data, opts) {
    opts = opts || {};
    const weeks = opts.weeks || 15;
    const cell = 13, gap = 3;
    const end = U.startOfWeek(U.today(), 1);
    const start = U.addDays(end, -7 * (weeks - 1));
    const values = Object.values(data).filter(v => v > 0);
    const max = Math.max.apply(null, values.concat([1]));
    const ramp = ['var(--q1)', 'var(--q2)', 'var(--q3)', 'var(--q4)', 'var(--q5)', 'var(--q6)'];
    const level = v => v <= 0 ? -1 : Math.min(ramp.length - 1, Math.floor((v / max) * ramp.length * 0.999));

    const W = 30 + weeks * (cell + gap), H = 22 + 7 * (cell + gap);
    let cells = '', monthLabels = '', lastMonth = '', lastLabelWeek = -3;
    for (let w = 0; w < weeks; w++) {
      const weekStart = U.addDays(start, w * 7);
      const m = U.MONTHS_SHORT[U.parseISO(weekStart).getMonth()];
      // rótulo só quando muda o mês e há espaço desde o anterior (evita sobreposição)
      if (m !== lastMonth) {
        if (w - lastLabelWeek >= 3) {
          monthLabels += `<text class="axis-label" x="${30 + w * (cell + gap)}" y="10">${m}</text>`;
          lastLabelWeek = w;
        }
        lastMonth = m;
      }
      for (let dow = 0; dow < 7; dow++) {
        const date = U.addDays(weekStart, dow);
        if (date > U.today()) continue;
        const v = data[date] || 0;
        const lv = level(v);
        cells += `<rect class="heat-cell" x="${30 + w * (cell + gap)}" y="${18 + dow * (cell + gap)}" width="${cell}" height="${cell}"
          fill="${lv < 0 ? 'var(--sunken)' : ramp[lv]}" style="cursor:pointer"
          ${tip(U.fmtDate(date, 'full'), [{ label: opts.valueLabel || 'Registros', value: U.fmtNumber(v) }])}></rect>`;
      }
    }
    const dowLabels = [0, 2, 4].map(i => `<text class="axis-label" x="0" y="${18 + i * (cell + gap) + 10}">${U.DAYS_SHORT[(i + 1) % 7]}</text>`).join('');
    const scale = `<div class="legend" style="justify-content:flex-end"><span class="legend__item"><span class="legend__val">menos</span>
      ${ramp.map(c => `<span class="legend__swatch" style="background:${c};width:11px;height:11px"></span>`).join('')}
      <span class="legend__val">mais</span></span></div>`;
    return `<div style="overflow-x:auto"><svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Mapa de constância">${monthLabels}${dowLabels}${cells}</svg></div>${scale}`;
  }

  /* ============================================================
     7. FUNIL (pipeline ordinal) — HTML
     ============================================================ */
  function funnel(stages, opts) {
    opts = opts || {};
    const max = Math.max.apply(null, stages.map(s => s.value).concat([1]));
    const ramp = ['var(--f1)', 'var(--f2)', 'var(--f3)', 'var(--f4)', 'var(--f5)'];
    return `<div style="display:grid;gap:9px">` + stages.map((s, i) => {
      const w = Math.max((s.value / max) * 100, s.value > 0 ? 4 : 1.5);
      const color = ramp[Math.min(i, ramp.length - 1)];
      return `<div ${tip(s.label, [{ label: opts.valueLabel || 'Projetos', value: U.fmtNumber(s.value), color }].concat(s.hint ? [{ label: s.hint }] : []))}
        style="display:grid;grid-template-columns:minmax(90px,30%) 1fr auto;gap:10px;align-items:center;cursor:${s.onClick ? 'pointer' : 'default'}">
        <span class="truncate" style="font-size:12.5px;color:var(--ink-2)">${U.esc(s.label)}</span>
        <span style="display:block;height:16px;background:var(--sunken);border-radius:0 4px 4px 0;position:relative">
          <span style="position:absolute;inset:0 auto 0 0;width:${w}%;background:${color};border-radius:0 4px 4px 0"></span>
        </span>
        <span class="tnum" style="font-size:12.5px;font-weight:620;color:var(--ink-2);min-width:22px;text-align:right">${U.fmtNumber(s.value)}</span>
      </div>`;
    }).join('') + `</div>`;
  }

  /* ============================================================
     8. MATRIZ IMPACTO × ESFORÇO — SVG
     points: [{x:esforço 1-5, y:impacto 1-5, label, color, id}]
     ============================================================ */
  function matrix(points, opts) {
    opts = opts || {};
    if (!points.length) return `<p class="muted small" style="padding:12px 0">Sem dados.</p>`;
    return slot('matrix', { points, opts }, 320);
  }
  BUILDERS.matrix = p => matrixSVG(p.points, p.opts);

  function matrixSVG(points, opts) {
    opts = opts || {};
    const W = U.clamp(opts.width || 420, 300, 620);
    const H = Math.round(U.clamp(W * 0.74, 260, 380));
    const pad = { t: 30, r: 18, b: 42, l: 42 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const inset = 10; // mantém as marcas longe das bordas do gráfico
    const X = v => pad.l + inset + ((U.clamp(v, 1, 5) - 1) / 4) * (iw - inset * 2);
    const Y = v => pad.t + ih - inset - ((U.clamp(v, 1, 5) - 1) / 4) * (ih - inset * 2);
    const midX = pad.l + iw / 2, midY = pad.t + ih / 2;

    // agrupa pontos idênticos para evitar sobreposição total
    const seen = {};
    const dots = points.map((p, i) => {
      const key = p.x + ':' + p.y;
      seen[key] = (seen[key] || 0) + 1;
      const k = seen[key] - 1;
      const angle = k * 2.4, radius = k ? 7 + k * 1.5 : 0;
      const cx = X(p.x) + Math.cos(angle) * radius, cy = Y(p.y) + Math.sin(angle) * radius;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="${p.color || S()[0]}" stroke="var(--surface)" stroke-width="2"
        style="cursor:pointer" data-matrix-id="${U.esc(p.id || '')}"
        ${tip(p.label, [{ label: 'Impacto', value: p.y + '/5' }, { label: 'Esforço', value: p.x + '/5' }].concat(p.meta ? [{ label: p.meta }] : []))}></circle>`;
    }).join('');

    return `<div class="matrix-wrap"><svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Matriz de impacto por esforço">
      <rect x="${pad.l}" y="${pad.t}" width="${iw / 2}" height="${ih / 2}" fill="var(--good)" opacity=".07"></rect>
      <line class="grid-line" x1="${midX}" y1="${pad.t}" x2="${midX}" y2="${pad.t + ih}"></line>
      <line class="grid-line" x1="${pad.l}" y1="${midY}" x2="${W - pad.r}" y2="${midY}"></line>
      <text class="axis-label" x="${pad.l}" y="${pad.t - 11}" style="font-weight:700">GANHO RÁPIDO ⚡</text>
      <text class="axis-label" x="${W - pad.r}" y="${pad.t - 11}" text-anchor="end" style="font-weight:700">PROJETO GRANDE</text>
      <text class="axis-label" x="${pad.l}" y="${pad.t + ih + 15}">tarefa miúda</text>
      <text class="axis-label" x="${W - pad.r}" y="${pad.t + ih + 15}" text-anchor="end">evitar</text>
      ${dots}
      <line class="base-line" x1="${pad.l}" y1="${pad.t + ih}" x2="${W - pad.r}" y2="${pad.t + ih}"></line>
      <line class="base-line" x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + ih}"></line>
      <text class="axis-label" x="${pad.l + iw / 2}" y="${H - 8}" text-anchor="middle">esforço →</text>
      <text class="axis-label" x="12" y="${pad.t + ih / 2}" text-anchor="middle" transform="rotate(-90 12 ${pad.t + ih / 2})">impacto →</text>
    </svg></div>`;
  }

  /* ============================================================
     9. SPARKLINE (12 pontos) — SVG
     ============================================================ */
  function sparkline(values, opts) {
    opts = opts || {};
    const W = opts.width || 120, H = opts.height || 30;
    if (!values.length) return '';
    const max = Math.max.apply(null, values.concat([1])), min = Math.min.apply(null, values.concat([0]));
    const span = max - min || 1;
    const X = i => (i / Math.max(values.length - 1, 1)) * (W - 6) + 3;
    const Y = v => H - 3 - ((v - min) / span) * (H - 8);
    const path = values.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    const color = opts.color || 'var(--accent)';
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${path} L${X(values.length - 1)} ${H} L${X(0)} ${H} Z" fill="${color}" opacity=".10"></path>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
      <circle cx="${X(values.length - 1)}" cy="${Y(values[values.length - 1])}" r="3" fill="${color}"></circle></svg>`;
  }

  /* ---------- legenda ---------- */
  function legendHtml(items, stacked) {
    return `<div class="legend" ${stacked ? 'style="flex-direction:column;gap:7px"' : ''}>` + items.map(i =>
      `<span class="legend__item"><span class="legend__swatch" style="background:${i.color}"></span>${U.esc(i.label)}${i.value !== undefined ? `<span class="legend__val">${U.esc(i.value)}</span>` : ''}</span>`
    ).join('') + `</div>`;
  }

  /* ---------- medidor ---------- */
  function meter(value, target, opts) {
    opts = opts || {};
    const p = U.clamp(target ? (value / target) * 100 : 0, 0, 100);
    const tone = p >= 100 ? 'good' : p >= 60 ? '' : p >= 30 ? 'warning' : 'critical';
    return `<div>
      <div class="row" style="justify-content:space-between;margin-bottom:5px">
        <span class="small muted">${U.esc(opts.label || '')}</span>
        <span class="small tnum" style="font-weight:620">${U.esc(opts.valueText || (U.fmtNumber(value) + ' / ' + U.fmtNumber(target)))}</span>
      </div>
      <div class="meter ${tone ? 'meter--' + tone : ''}"><span style="width:${p}%"></span></div>
    </div>`;
  }

  App.charts = { barsH, barsStacked, donut, lineArea, columns, heatmap, funnel, matrix, sparkline, legendHtml, meter, tip, hydrate };
})(window.App);
