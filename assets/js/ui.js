/* ============================================================
   ui.js — modais, toasts, confirmação, menus e tooltip de gráfico
   ============================================================ */
(function (App) {
  'use strict';
  const U = App.util;
  const { el, $ } = U;

  /* ---------- TOASTS ---------- */
  function toast(message, tone, action) {
    const host = $('#toasts');
    const node = el('div', { class: 'toast' + (tone ? ' toast--' + tone : '') }, [
      el('span', { text: message }),
      action ? el('button', { text: action.label, onclick: () => { action.onClick(); dismiss(); } }) : null
    ]);
    host.appendChild(node);
    const timer = setTimeout(dismiss, action ? 7000 : 3600);
    function dismiss() {
      clearTimeout(timer);
      node.style.transition = 'opacity .18s, transform .18s';
      node.style.opacity = '0';
      node.style.transform = 'translateY(8px)';
      setTimeout(() => node.remove(), 190);
    }
    return dismiss;
  }

  /* ---------- MODAIS (empilháveis) ---------- */
  const stack = [];

  /**
   * Mantém a camada de modais coerente com o DOM.
   * O `hidden` é decidido pelo que existe na tela, não por um array em
   * memória: assim nunca sobra um fundo escuro sem janela dentro dele.
   */
  function syncRoot() {
    const root = $('#modalRoot');
    if (!root) return;
    for (let i = stack.length - 1; i >= 0; i--) {
      if (!stack[i].layer.isConnected) stack.splice(i, 1);
    }
    root.hidden = root.children.length === 0;
  }

  /** Fecha tudo e limpa a camada — usado em falhas e ao trocar de tela. */
  function closeAll() {
    const root = $('#modalRoot');
    stack.length = 0;
    if (root) { root.innerHTML = ''; root.hidden = true; }
  }

  function modal(opts) {
    const root = $('#modalRoot');
    const layer = el('div', { class: 'modal-layer' });
    const box = el('div', { class: 'modal' + (opts.size ? ' modal--' + opts.size : '') });

    const head = el('div', { class: 'modal__head' }, [
      el('div', { style: { flex: '1', minWidth: '0' } }, [
        el('h3', { text: opts.title || '' }),
        opts.subtitle ? el('p', { text: opts.subtitle }) : null
      ]),
      opts.headExtra || null,
      opts.dismissable === false ? null
        : el('button', { class: 'icon-btn', title: 'Fechar', html: U.icon('x'), onclick: () => close() })
    ]);

    const body = el('div', { class: 'modal__body' });
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);

    box.append(head, body);

    if (opts.footer && opts.footer.length) {
      const foot = el('div', { class: 'modal__foot' });
      opts.footer.forEach(btn => {
        if (btn === 'spacer') { foot.appendChild(el('div', { class: 'spacer' })); return; }
        if (btn instanceof Node) { foot.appendChild(btn); return; }
        foot.appendChild(el('button', {
          class: 'btn ' + (btn.variant ? 'btn--' + btn.variant : ''),
          html: (btn.icon ? U.icon(btn.icon, 'i--sm') : '') + '<span>' + U.esc(btn.label) + '</span>',
          onclick: () => btn.onClick && btn.onClick({ close })
        }));
      });
      box.appendChild(foot);
    }

    layer.appendChild(box);
    /* clique no escuro (fora da caixa) fecha — a camada cobre a tela toda */
    layer.addEventListener('mousedown', ev => {
      if (ev.target !== layer || opts.dismissable === false) return;
      ev.preventDefault();
      close();
    });
    root.appendChild(layer);
    stack.push({ layer, opts });
    syncRoot();
    U.hydrateIcons(box);
    if (App.charts) App.charts.hydrate(box);

    const firstInput = box.querySelector('input:not([type=hidden]), textarea, select');
    if (firstInput && opts.autofocus !== false) setTimeout(() => firstInput.focus(), 40);

    function close(result) {
      const idx = stack.findIndex(s => s.layer === layer);
      if (idx >= 0) stack.splice(idx, 1);
      layer.remove();
      syncRoot();
      if (opts.onClose) opts.onClose(result);
    }
    return { close, box, body, layer };
  }

  function closeTopModal() {
    syncRoot();
    if (!stack.length) return false;
    const top = stack[stack.length - 1];
    if (top.opts.dismissable === false) return false;
    stack.pop();
    top.layer.remove();
    syncRoot();
    if (top.opts.onClose) top.opts.onClose();
    return true;
  }
  const hasModal = () => { syncRoot(); return stack.length > 0; };

  /* ---------- FALHAS VISÍVEIS ----------
     Um erro nunca deve virar tela escura sem explicação: limpamos a camada
     presa e mostramos o que aconteceu, com os detalhes copiáveis. */
  let lastCrash = 0;
  function crash(err, context) {
    try { console.error(context || 'falha', err); } catch (e) { /* console indisponível */ }
    try { closeAll(); } catch (e) { /* nada a fazer */ }
    const now = Date.now();
    if (now - lastCrash < 1200) return;   // evita enxurrada de avisos iguais
    lastCrash = now;
    const msg = (err && err.message) || String(err || 'erro desconhecido');
    const detalhe = [
      context ? 'Ação: ' + context : '',
      'Erro: ' + msg,
      err && err.stack ? '\n' + err.stack : '',
      '\nNavegador: ' + navigator.userAgent
    ].filter(Boolean).join('\n');

    try {
    toast('Algo falhou aqui', 'bad', {
      label: 'Ver detalhes',
      onClick: () => modal({
        title: 'Não consegui completar essa ação', size: 'sm',
        subtitle: context || '',
        body: el('div', {}, [
          el('p', { class: 'small muted', style: { lineHeight: '1.6', marginBottom: '12px' },
            text: 'A tela foi liberada e seus dados estão salvos. Se isso se repetir, copie os detalhes abaixo e me envie — eles dizem exatamente onde quebrou.' }),
          el('textarea', { class: 'textarea', readonly: true, style: { minHeight: '150px', fontFamily: 'var(--mono)', fontSize: '11.5px' }, text: detalhe })
        ]),
        footer: ['spacer',
          { label: 'Copiar detalhes', icon: 'copy', onClick: () => {
            if (navigator.clipboard) navigator.clipboard.writeText(detalhe).then(() => toast('Detalhes copiados ✓', 'good'));
          } },
          { label: 'Fechar', variant: 'primary', onClick: ({ close }) => close() }]
      })
    });
    } catch (e) { console.error('falha ao reportar a falha', e); }
  }

  /** Embrulha um handler para que uma exceção vire aviso, não tela travada. */
  const guard = (fn, context) => function () {
    try { return fn.apply(this, arguments); }
    catch (e) { crash(e, context); }
  };

  /* ---------- CONFIRMAÇÃO ---------- */
  function confirm(opts) {
    return new Promise(resolve => {
      let settled = false;
      const done = v => { if (!settled) { settled = true; resolve(v); } };
      const m = modal({
        size: 'sm',
        title: opts.title || 'Confirmar',
        body: el('p', { class: 'small muted', style: { lineHeight: '1.6' }, text: opts.message || '' }),
        footer: [
          'spacer',
          { label: opts.cancelText || 'Cancelar', onClick: ({ close }) => { done(false); close(); } },
          { label: opts.confirmText || 'Confirmar', variant: opts.danger ? 'danger' : 'primary', onClick: ({ close }) => { done(true); close(); } }
        ],
        onClose: () => done(false)
      });
      return m;
    });
  }

  /* ---------- MENU CONTEXTUAL ---------- */
  function menu(anchor, items) {
    document.querySelectorAll('.ctx-menu').forEach(n => n.remove());
    const box = el('div', { class: 'ctx-menu card', style: {
      position: 'fixed', zIndex: '350', minWidth: '190px', padding: '5px',
      boxShadow: 'var(--shadow-2)', display: 'grid', gap: '1px'
    } });
    items.forEach(it => {
      if (it === 'sep') { box.appendChild(el('div', { class: 'divider', style: { margin: '4px 0' } })); return; }
      box.appendChild(el('button', {
        class: 'nav__item',
        style: { fontSize: '13px', padding: '7px 9px', color: it.danger ? 'var(--critical)' : '' },
        html: (it.icon ? U.icon(it.icon, 'i--sm') : '') + '<span>' + U.esc(it.label) + '</span>',
        onclick: () => { box.remove(); it.onClick && it.onClick(); }
      }));
    });
    document.body.appendChild(box);
    U.hydrateIcons(box);
    const r = anchor.getBoundingClientRect();
    const bw = box.offsetWidth, bh = box.offsetHeight;
    box.style.left = Math.max(8, Math.min(r.left, window.innerWidth - bw - 8)) + 'px';
    box.style.top = (r.bottom + bh + 8 > window.innerHeight ? Math.max(8, r.top - bh - 4) : r.bottom + 4) + 'px';
    setTimeout(() => {
      const off = ev => { if (!box.contains(ev.target)) { box.remove(); document.removeEventListener('mousedown', off); } };
      document.addEventListener('mousedown', off);
    }, 0);
    return box;
  }

  /* ---------- TOOLTIP DE GRÁFICO ---------- */
  let tipNode = null;
  function showTip(html, x, y) {
    if (!tipNode) { tipNode = el('div', { class: 'chart-tip' }); document.body.appendChild(tipNode); }
    tipNode.innerHTML = html;
    tipNode.hidden = false;
    const rect = tipNode.getBoundingClientRect();
    let left = x + 14, top = y - rect.height - 10;
    if (left + rect.width > window.innerWidth - 8) left = x - rect.width - 14;
    if (top < 8) top = y + 18;
    tipNode.style.left = Math.max(8, left) + 'px';
    tipNode.style.top = top + 'px';
  }
  const hideTip = () => { if (tipNode) tipNode.hidden = true; };

  /* ---------- CHIPS / BADGES REUTILIZÁVEIS ---------- */
  function statusChip(statusId) {
    const s = App.store.TASK_STATUS.find(x => x.id === statusId);
    if (!s) return '';
    const tone = statusId === 'done' ? 'good' : statusId === 'waiting' ? 'serious' : statusId === 'doing' ? 'warning' : '';
    return `<span class="chip ${tone ? 'chip--' + tone : ''}"><span class="chip__dot" style="background:${s.color}"></span>${U.esc(s.label)}</span>`;
  }
  function sectorChip(sectorId) {
    const s = App.store.sectorOf(sectorId);
    if (!s) return '';
    return `<span class="chip"><span class="chip__dot" style="background:${s.color}"></span>${U.esc(s.name)}</span>`;
  }
  function priorityChip(priorityId) {
    const p = App.store.PRIORITY.find(x => x.id === priorityId);
    if (!p) return '';
    const tone = p.id === 'critica' ? 'critical' : p.id === 'alta' ? 'warning' : '';
    return `<span class="chip ${tone ? 'chip--' + tone : ''}">${U.esc(p.label)}</span>`;
  }
  function dueChip(due, status) {
    if (!due) return '';
    const diff = U.daysBetween(U.today(), due);
    const late = diff < 0 && status !== 'done';
    const todayDue = diff === 0 && status !== 'done';
    const cls = late ? 'chip--critical' : todayDue ? 'chip--serious' : '';
    return `<span class="chip ${cls}">${U.icon('clock', 'i--sm')}${U.esc(U.fmtRelative(due))}</span>`;
  }
  function emptyState(icon, title, text, actionHtml) {
    return `<div class="empty"><div class="empty__icon">${icon}</div><h4>${U.esc(title)}</h4><p>${U.esc(text)}</p>${actionHtml || ''}</div>`;
  }

  /* ---------- DOWNLOAD ---------- */
  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  App.ui = {
    toast, modal, confirm, menu, closeTopModal, hasModal, syncRoot, closeAll, crash, guard,
    showTip, hideTip, statusChip, sectorChip, priorityChip, dueChip, emptyState, download
  };
})(window.App);
