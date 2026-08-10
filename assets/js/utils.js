/* ============================================================
   utils.js — helpers de DOM, datas, formatação e ícones
   ============================================================ */
window.App = window.App || {};

(function (App) {
  'use strict';

  /* ---------- DOM ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    (Array.isArray(children) ? children : children ? [children] : []).forEach(c => {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  /** Escapa HTML para interpolação segura em templates. */
  const esc = s => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /** Delegação de eventos: on(root,'click','.sel', handler) */
  function on(root, type, selector, handler) {
    root.addEventListener(type, ev => {
      const target = ev.target.closest(selector);
      if (target && root.contains(target)) handler(ev, target);
    });
  }

  /* ---------- IDs & misc ---------- */
  const uid = (prefix) => (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const sum = arr => arr.reduce((a, b) => a + (Number(b) || 0), 0);
  const uniq = arr => Array.from(new Set(arr));
  const clone = obj => JSON.parse(JSON.stringify(obj));

  function groupBy(arr, keyFn) {
    const out = {};
    arr.forEach(item => {
      const k = keyFn(item);
      (out[k] = out[k] || []).push(item);
    });
    return out;
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms || 200); };
  }

  /** Normaliza texto para busca (remove acentos e caixa). */
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* ---------- DATAS (todas em ISO local YYYY-MM-DD) ---------- */
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const DAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const DAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  /** Data local -> 'YYYY-MM-DD' (sem escorregar de fuso, ao contrário de toISOString). */
  function iso(date) {
    const d = date instanceof Date ? date : new Date(date);
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  /** 'YYYY-MM-DD' -> Date local à meia-noite. */
  function parseISO(s) {
    if (!s) return null;
    const parts = String(s).slice(0, 10).split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const today = () => iso(new Date());
  const nowTime = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

  function addDays(isoStr, n) {
    const d = parseISO(isoStr) || new Date();
    d.setDate(d.getDate() + n);
    return iso(d);
  }
  function addMonths(isoStr, n) {
    const d = parseISO(isoStr) || new Date();
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    return iso(d);
  }
  /** Diferença em dias (b - a), positiva se b for depois. */
  function daysBetween(a, b) {
    const da = parseISO(a), db = parseISO(b);
    if (!da || !db) return 0;
    return Math.round((db - da) / 86400000);
  }
  /** Segunda-feira da semana da data. */
  function startOfWeek(isoStr, weekStart) {
    const d = parseISO(isoStr) || new Date();
    const ws = weekStart === undefined ? 1 : weekStart;
    const diff = (d.getDay() - ws + 7) % 7;
    d.setDate(d.getDate() - diff);
    return iso(d);
  }
  const startOfMonth = isoStr => (isoStr || today()).slice(0, 7) + '-01';
  function endOfMonth(isoStr) {
    const d = parseISO(isoStr) || new Date();
    return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  }
  const isWeekend = isoStr => { const d = parseISO(isoStr); return !d || d.getDay() === 0 || d.getDay() === 6; };

  function fmtDate(isoStr, style) {
    const d = parseISO(isoStr);
    if (!d) return '—';
    if (style === 'short') return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
    if (style === 'medium') return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()];
    if (style === 'full') return DAYS[d.getDay()] + ', ' + d.getDate() + ' de ' + MONTHS[d.getMonth()] + ' de ' + d.getFullYear();
    if (style === 'monthYear') return MONTHS[d.getMonth()] + ' de ' + d.getFullYear();
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  /** "hoje", "amanhã", "há 3 dias", "em 5 dias" */
  function fmtRelative(isoStr) {
    const diff = daysBetween(today(), isoStr);
    if (diff === 0) return 'hoje';
    if (diff === 1) return 'amanhã';
    if (diff === -1) return 'ontem';
    if (diff === 2) return 'depois de amanhã';
    /* o plural segue o número já arredondado, não a quantidade de dias */
    const semanas = n => { const w = Math.max(1, Math.round(n / 7)); return w + (w > 1 ? ' semanas' : ' semana'); };
    const meses = n => { const m = Math.max(1, Math.round(n / 30)); return m + (m > 1 ? ' meses' : ' mês'); };
    if (diff < 0) {
      const n = Math.abs(diff);
      if (n < 7) return 'há ' + n + ' dias';
      if (n < 30) return 'há ' + semanas(n);
      return 'há ' + meses(n);
    }
    if (diff < 7) return 'em ' + diff + ' dias';
    if (diff < 30) return 'em ' + semanas(diff);
    return 'em ' + meses(diff);
  }

  function fmtDuration(minutes) {
    const m = Math.round(Number(minutes) || 0);
    if (m < 60) return m + 'min';
    const h = Math.floor(m / 60), r = m % 60;
    return r ? h + 'h' + String(r).padStart(2, '0') : h + 'h';
  }

  function fmtNumber(n, decimals) {
    const v = Number(n) || 0;
    return v.toLocaleString('pt-BR', { minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals === undefined ? 0 : decimals });
  }
  function fmtCompact(n) {
    const v = Number(n) || 0;
    if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(1).replace('.0', '').replace('.', ',') + 'M';
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1).replace('.0', '').replace('.', ',') + 'k';
    return fmtNumber(v);
  }
  const fmtMoney = n => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const pct = (part, total) => (!total ? 0 : Math.round((part / total) * 100));

  /** Saudação conforme a hora do dia. */
  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Boa madrugada';
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  /* ---------- MARKDOWN LEVE ---------- */
  function markdown(src) {
    if (!src) return '';
    const lines = String(src).split('\n');
    let html = '', listType = null, inCode = false;
    const closeList = () => { if (listType) { html += `</${listType}>`; listType = null; } };
    const inline = t => esc(t)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|\W)\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');

    lines.forEach(raw => {
      const line = raw.replace(/\s+$/, '');
      if (/^```/.test(line)) {
        closeList();
        html += inCode ? '</code></pre>' : '<pre><code>';
        inCode = !inCode; return;
      }
      if (inCode) { html += esc(raw) + '\n'; return; }
      if (!line.trim()) { closeList(); return; }
      let m;
      if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { closeList(); html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; return; }
      if (/^\s*[-*]\s+\[[ xX]\]\s+/.test(line)) {
        if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul'; }
        const done = /\[[xX]\]/.test(line);
        html += `<li>${done ? '☑' : '☐'} ${inline(line.replace(/^\s*[-*]\s+\[[ xX]\]\s+/, ''))}</li>`; return;
      }
      if (/^\s*[-*]\s+/.test(line)) {
        if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul'; }
        html += `<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>`; return;
      }
      if (/^\s*\d+[.)]\s+/.test(line)) {
        if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol'; }
        html += `<li>${inline(line.replace(/^\s*\d+[.)]\s+/, ''))}</li>`; return;
      }
      if (/^>\s?/.test(line)) { closeList(); html += `<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`; return; }
      if (/^(-{3,}|\*{3,})$/.test(line.trim())) { closeList(); html += '<hr>'; return; }
      closeList();
      html += `<p>${inline(line)}</p>`;
    });
    closeList();
    if (inCode) html += '</code></pre>';
    return html;
  }

  /** Texto puro a partir de markdown (para prévias). */
  const stripMd = s => String(s || '').replace(/[#*`>_]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();

  /* ---------- ÍCONES (traçado, 24x24) ---------- */
  const ICONS = {
    dashboard: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    kanban: '<rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="4" height="8" rx="1"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>',
    note: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9l7-7V5a2 2 0 0 0-2-2z"/><path d="M14 21v-5a2 2 0 0 1 2-2h5"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 4 3 5-7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.4L22 18l-2.1.6L19 21l-.9-2.4L16 18l2.1-.6z"/>',
    sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
    chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
    chevronRight: '<path d="M9 18l6-6-6-6"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
    play: '<path d="M6 3l14 9-14 9z"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    zap: '<path d="M13 2L3 14h8l-1 8 10-12h-8z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    pin: '<path d="M12 17v5M9 4h6l-1 6 3 3H7l3-3z"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>',
    printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21.2l7.7-7.8 1.1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    trending: '<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'
  };

  function icon(name, cls) {
    const path = ICONS[name] || ICONS.dashboard;
    return `<span class="i ${cls || ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg></span>`;
  }
  /** Preenche <span class="i" data-icon="x"> presentes no HTML estático. */
  function hydrateIcons(root) {
    $$('[data-icon]', root || document).forEach(node => {
      const name = node.dataset.icon;
      if (!name || node.dataset.iconDone) return;
      node.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
      node.dataset.iconDone = '1';
    });
  }

  App.util = {
    $, $$, el, esc, on, uid, clamp, sum, uniq, clone, groupBy, debounce, norm,
    MONTHS, MONTHS_SHORT, DAYS, DAYS_SHORT,
    iso, parseISO, today, nowTime, addDays, addMonths, daysBetween, startOfWeek, startOfMonth, endOfMonth, isWeekend,
    fmtDate, fmtRelative, fmtDuration, fmtNumber, fmtCompact, fmtMoney, pct, greeting,
    markdown, stripMd, icon, hydrateIcons, ICONS
  };
})(window.App);
