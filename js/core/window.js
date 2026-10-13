/* ============================================================
 * KevinOS · 窗口管理器 (Window Manager)
 * ============================================================ */
(function () {
  'use strict';

  const K = window.KevinOS = window.KevinOS || {};
  const { el } = K.util;

  /* ---------- 极简事件总线 ---------- */
  const bus = (function () {
    const map = new Map();
    return {
      on(ev, fn) { (map.get(ev) || map.set(ev, []).get(ev)).push(fn); return () => bus.off(ev, fn); },
      off(ev, fn) { const a = map.get(ev); if (a) a.splice(a.indexOf(fn), 1); },
      emit(ev, data) { (map.get(ev) || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }
    };
  })();
  K.bus = bus;

  const MENUBAR_H = 28;
  const DOCK_H = 76;
  const SNAP_EDGE = 10;
  let zCounter = 100;
  const windows = [];
  let layer = null;
  let snapEl = null;

  function workArea() {
    return { x: 0, y: MENUBAR_H, w: window.innerWidth, h: window.innerHeight - MENUBAR_H - DOCK_H };
  }

  function makeBtn(cls, svg, title) {
    return el('button', { class: 'win-btn ' + cls, title, html: `<svg viewBox="0 0 24 24">${svg}</svg>` });
  }

  // macOS 风格交通灯按钮：关闭 / 最小化 / 缩放
  function makeTraffic(cls, title, path) {
    return el('button', { class: 'traffic ' + cls, title, html: `<svg viewBox="0 0 24 24"><path d="${path}"/></svg>` });
  }

  /* ---------- 创建窗口 ---------- */
  function open(appId, args) {
    const app = K.apps.getApp(appId);
    if (!app) { console.warn('未知应用', appId); return null; }

    if (app.single) {
      const exist = windows.find(w => w.appId === appId);
      if (exist) { focus(exist); if (!exist.state.minimized && args && exist.deliver) exist.deliver(args); return exist; }
    }

    const wa = workArea();
    const size = app.size || { w: 900, h: 600 };
    const w = Math.min(size.w, wa.w - 40);
    const h = Math.min(size.h, wa.h - 40);
    const offset = windows.length * 26;
    const x = Math.max(20, Math.round((wa.w - w) / 2) + (offset % 120) - 60);
    const y = Math.max(wa.y + 16, wa.y + Math.round((wa.h - h) / 2) + (offset % 90) - 40);

    const winEl = el('div', { class: 'window anim-open' });
    winEl.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;

    const icoEl = K.apps.appIconEl(app);
    icoEl.className = 'app-ico sm';
    icoEl.style.borderRadius = '7px';

    const titlebar = el('div', { class: 'win-titlebar' }, [
      el('div', { class: 'win-traffic' }, [
        makeTraffic('close', '关闭', 'M6.4 7L12 12.6 17.6 7 19 8.4 13.4 14 19 19.6 17.6 21 12 15.4 6.4 21 5 19.6 10.6 14 5 8.4z'),
        makeTraffic('minimize', '最小化', 'M6 12h12'),
        app.resizable === false ? null : makeTraffic('maximize', '缩放', 'M7 7h10v2H9v8H7V7z')
      ].filter(Boolean)),
      icoEl,
      el('div', { class: 'win-title', text: app.name }),
      el('div', { class: 'win-controls' }, [])
    ]);
    const body = el('div', { class: 'win-body' });
    winEl.append(titlebar, body);

    if (app.resizable !== false) {
      ['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se'].forEach(d =>
        winEl.appendChild(el('div', { class: 'rs rs-' + d, 'data-dir': d })));
    }

    const win = {
      id: 'win-' + Math.random().toString(36).slice(2, 9),
      appId, app, el: winEl, body, titleEl: titlebar.querySelector('.win-title'),
      state: { x, y, w, h, minimized: false, maximized: false, prev: null },
      focused: false, deliver: null, cleanups: [],
      setTitle(t) { win.titleEl.textContent = t; },
      setSub(t) {
        let s = win.titleEl.querySelector('.win-sub');
        if (!s) { s = el('span', { class: 'win-sub' }); win.titleEl.appendChild(s); }
        s.textContent = t;
      },
      close() { close(win); },
      focus() { focus(win); },
      minimize() { minimize(win); }
    };
    windows.push(win);
    layer.appendChild(winEl);

    // 事件
    winEl.addEventListener('mousedown', () => focus(win), true);
    titlebar.addEventListener('dblclick', e => { if (!e.target.closest('.win-btn')) toggleMax(win); });
    titlebar.addEventListener('pointerdown', e => startDrag(win, e));
    winEl.querySelectorAll('.rs').forEach(r => r.addEventListener('pointerdown', e => startResize(win, e, r.dataset.dir)));
    const closeBtn = titlebar.querySelector('.traffic.close');
    const minBtn = titlebar.querySelector('.traffic.minimize');
    const maxBtn = titlebar.querySelector('.traffic.maximize');
    closeBtn.addEventListener('click', e => { e.stopPropagation(); close(win); });
    minBtn.addEventListener('click', e => { e.stopPropagation(); minimize(win); });
    if (maxBtn) maxBtn.addEventListener('click', e => { e.stopPropagation(); toggleMax(win); });

    winEl.addEventListener('animationend', e => { if (e.animationName === 'winOpen') winEl.classList.remove('anim-open'); });
    winEl.addEventListener('animationend', e => { if (e.animationName === 'winMin') winEl.classList.add('minimized'); });

    focus(win);
    bus.emit('window:open', win);

    // 挂载应用
    try { if (app.mount) app.mount(win, args || {}); }
    catch (err) { console.error('应用挂载失败', appId, err); body.innerHTML = '<div style="padding:24px;color:var(--danger)">应用启动失败：' + err.message + '</div>'; }

    return win;
  }

  /* ---------- 焦点 ---------- */
  function focus(win) {
    if (win.state.minimized) return;
    if (win.focused) return;
    windows.forEach(w => { w.focused = false; w.el.classList.remove('focused'); });
    win.focused = true;
    win.el.classList.add('focused');
    win.el.style.zIndex = ++zCounter;
    bus.emit('window:focus', win);
    bus.emit('window:change');
  }

  function getFocused() { return windows.find(w => w.focused); }

  /* ---------- 关闭 ---------- */
  function close(win) {
    if (win.onBeforeClose && win.onBeforeClose() === false) return;
    bus.emit('window:closing', win);
    win.el.classList.add('anim-close');
    const done = () => {
      if (win.onClose) { try { win.onClose(); } catch (e) {} }
      win.cleanups.forEach(fn => { try { fn(); } catch (e) {} });
      win.el.remove();
      const i = windows.indexOf(win);
      if (i >= 0) windows.splice(i, 1);
      bus.emit('window:close', win);
      bus.emit('window:change');
      if (win.state.focused) {
        const next = windows.filter(w => !w.state.minimized).sort((a, b) => (+b.el.style.zIndex || 0) - (+a.el.style.zIndex || 0))[0];
        if (next) focus(next);
      }
    };
    win.el.addEventListener('animationend', done, { once: true });
    setTimeout(done, 340);
  }

  /* ---------- 最小化 / 最大化 ---------- */
  function minimize(win) {
    if (win.state.minimized) return;
    win.state.minimized = true;
    win.focused = false;
    win.el.classList.remove('focused', 'anim-open');
    win.el.classList.add('anim-min');
    bus.emit('window:minimize', win);
    bus.emit('window:change');
  }
  function restore(win) {
    win.state.minimized = false;
    win.el.classList.remove('minimized', 'anim-min');
    win.el.classList.add('anim-restore');
    setTimeout(() => win.el.classList.remove('anim-restore'), 420);
    focus(win);
    bus.emit('window:change');
  }
  function toggleMax(win) {
    const wa = workArea();
    if (win.state.maximized) {
      const p = win.state.prev || win.state;
      Object.assign(win.state, { x: p.x, y: p.y, w: p.w, h: p.h, maximized: false });
      win.el.classList.remove('anim-max');
      apply(win);
    } else {
      win.state.prev = { x: win.state.x, y: win.state.y, w: win.state.w, h: win.state.h };
      Object.assign(win.state, { x: wa.x, y: wa.y, w: wa.w, h: wa.h, maximized: true });
      win.el.classList.add('anim-max');
      apply(win);
    }
  }
  function apply(win) {
    const s = win.state;
    win.el.style.left = s.x + 'px'; win.el.style.top = s.y + 'px';
    win.el.style.width = s.w + 'px'; win.el.style.height = s.h + 'px';
    if (win.state.maximized) win.el.style.borderRadius = '0';
    else win.el.style.borderRadius = '';
    bus.emit('window:resize', win);
  }

  /* ---------- 拖动 ---------- */
  let dragging = null;
  function startDrag(win, e) {
    if (e.target.closest('.win-btn') || !win.el.classList.contains('focused')) {
      if (e.target.closest('.win-btn')) return;
    }
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const s = win.state;
    let startX = e.clientX, startY = e.clientY;
    let ox = s.x, oy = s.y, snap = null, wasMax = s.maximized;
    let moved = false;

    function move(ev) {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      moved = true;
      document.body.style.cursor = 'grabbing';

      // 从最大化状态拖出 → 还原
      if (wasMax && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
        const p = s.prev || { x: 40, y: 40, w: 900, h: 600 };
        const ratio = ev.clientX / window.innerWidth;
        s.w = p.w; s.h = p.h;
        ox = Math.round(ev.clientX - p.w * ratio);
        oy = Math.max(MENUBAR_H, ev.clientY - 20);
        s.maximized = false; wasMax = false;
        win.el.style.borderRadius = '';
        startX = ev.clientX; startY = ev.clientY;
        apply(win);
        return;
      }

      s.x = Math.max(-s.w + 120, Math.min(ox + dx, window.innerWidth - 120));
      s.y = Math.max(MENUBAR_H, Math.min(oy + dy, workArea().y + workArea().h - 44));
      win.el.style.left = s.x + 'px'; win.el.style.top = s.y + 'px';
      win.el.classList.add('dragging');

      // 吸附探测
      const wa = workArea();
      snap = null;
      if (ev.clientY <= SNAP_EDGE) snap = { x: 0, y: wa.y, w: wa.w, h: wa.h };
      else if (ev.clientX <= SNAP_EDGE) snap = { x: 0, y: wa.y, w: wa.w / 2, h: wa.h };
      else if (ev.clientX >= window.innerWidth - SNAP_EDGE) snap = { x: wa.w / 2, y: wa.y, w: wa.w / 2, h: wa.h };
      showSnap(snap);
    }
    function up() {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      win.el.classList.remove('dragging');
      showSnap(null);
      if (snap) {
        if (snap.w === wa_w() && snap.h === wa_h()) { toggleMaxIfNeeded(win); }
        else {
          win.state.prev = { x: ox, y: oy, w: win.state.w, h: win.state.h };
          Object.assign(win.state, { x: snap.x, y: snap.y, w: snap.w, h: snap.h, maximized: false });
          win.el.classList.add('anim-max');
          apply(win);
        }
      }
      dragging = null;
    }
    function wa_w() { return workArea().w; }
    function wa_h() { return workArea().h; }
    function toggleMaxIfNeeded(w) {
      w.state.prev = { x: ox, y: oy, w: w.state.w, h: w.state.h };
      Object.assign(w.state, { x: 0, y: workArea().y, w: wa_w(), h: wa_h(), maximized: true });
      w.el.classList.add('anim-max');
      apply(w);
    }
    dragging = win;
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  function showSnap(rect) {
    if (!rect) { snapEl.hidden = true; return; }
    snapEl.hidden = false;
    snapEl.style.cssText += `;left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px;`;
  }

  /* ---------- 缩放 ---------- */
  function startResize(win, e, dir) {
    e.stopPropagation();
    focus(win);
    const s = win.state;
    const sx = e.clientX, sy = e.clientY;
    const o = { x: s.x, y: s.y, w: s.w, h: s.h };
    const minW = parseInt(getComputedStyle(win.el).minWidth) || 320;
    const minH = parseInt(getComputedStyle(win.el).minHeight) || 200;
    const wa = workArea();

    function move(ev) {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      let { x, y, w, h } = o;
      if (dir.includes('e')) w = Math.max(minW, o.w + dx);
      if (dir.includes('s')) h = Math.max(minH, o.h + dy);
      if (dir.includes('w')) { w = Math.max(minW, o.w - dx); x = o.x + (o.w - w); }
      if (dir.includes('n')) { h = Math.max(minH, o.h - dy); y = o.y + (o.h - h); }
      if (y < MENUBAR_H) { h += y - MENUBAR_H; y = MENUBAR_H; }
      if (x < 0) { w += x; x = 0; }
      if (x + w > wa.w) w = wa.w - x;
      if (y + h > wa.y + wa.h) h = wa.y + wa.h - y;
      Object.assign(s, { x, y, w, h, maximized: false });
      win.el.classList.add('resizing');
      apply(win);
    }
    function up() {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      win.el.classList.remove('resizing');
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  /* ---------- 对话框 ---------- */
  function dialog(opts) {
    return new Promise(resolve => {
      const host = document.getElementById('desktop');
      const layerD = el('div', { class: 'os-dialog-layer' });
      const veil = el('div', { class: 'os-dialog-veil' });
      const box = el('div', { class: 'os-dialog' });
      const actions = el('div', { class: 'dlg-actions' });
      let inputEl = null;

      box.appendChild(el('div', { class: 'dlg-title' }, [
        opts.icon ? K.util.svgIcon(opts.icon) : null,
        opts.title || '提示'
      ]));
      if (opts.message) box.appendChild(el('div', { class: 'dlg-msg', text: opts.message }));
      if (opts.input) {
        inputEl = el('input', { class: 'dlg-input', type: 'text', value: opts.value || '', placeholder: opts.placeholder || '' });
        box.appendChild(inputEl);
      }

      function close(val) {
        box.classList.add('leaving');
        layerD.style.transition = 'opacity .2s';
        layerD.style.opacity = '0';
        setTimeout(() => layerD.remove(), 220);
        document.removeEventListener('keydown', key);
        resolve(val);
      }
      function key(e) {
        if (e.key === 'Escape') close(opts.input ? null : false);
        if (e.key === 'Enter' && opts.input) close(inputEl.value);
      }
      document.addEventListener('keydown', key);

      (opts.buttons || []).forEach(b => {
        const btn = el('button', { class: 'btn ' + (b.variant || ''), text: b.label });
        btn.addEventListener('click', () => close(b.value));
        actions.appendChild(btn);
      });
      box.appendChild(actions);
      layerD.append(veil, box);
      host.appendChild(layerD);
      veil.addEventListener('click', () => close(opts.input ? null : false));
      if (inputEl) setTimeout(() => { inputEl.focus(); inputEl.select(); }, 60);
    });
  }

  const UI = {
    alert: (message, title) => dialog({ title: title || '提示', message, icon: 'info', buttons: [{ label: '确定', value: true, variant: 'primary' }] }),
    confirm: (message, title, opts) => dialog(Object.assign({
      title: title || '确认', message, icon: 'info',
      buttons: [{ label: opts && opts.cancelText || '取消', value: false }, { label: opts && opts.okText || '确定', value: true, variant: (opts && opts.danger) ? 'danger' : 'primary' }]
    }, {}))
  };
  UI.prompt = function (message, def, title, placeholder) {
    return new Promise(resolve => {
      const host = document.getElementById('desktop');
      const layerD = el('div', { class: 'os-dialog-layer' });
      const veil = el('div', { class: 'os-dialog-veil' });
      const box = el('div', { class: 'os-dialog' });
      box.appendChild(el('div', { class: 'dlg-title' }, [K.util.svgIcon('info'), title || '输入']));
      if (message) box.appendChild(el('div', { class: 'dlg-msg', text: message }));
      const inputEl = el('input', { class: 'dlg-input', type: 'text', value: def || '', placeholder: placeholder || '' });
      box.appendChild(inputEl);
      const actions = el('div', { class: 'dlg-actions' }, [
        el('button', { class: 'btn', text: '取消', onclick: () => done(null) }),
        el('button', { class: 'btn primary', text: '确定', onclick: () => done(inputEl.value) })
      ]);
      box.appendChild(actions);
      layerD.append(veil, box);
      host.appendChild(layerD);
      setTimeout(() => { inputEl.focus(); inputEl.select(); }, 60);
      function done(v) {
        box.classList.add('leaving');
        layerD.style.transition = 'opacity .2s'; layerD.style.opacity = '0';
        setTimeout(() => layerD.remove(), 220);
        document.removeEventListener('keydown', key);
        resolve(v);
      }
      function key(e) {
        if (e.key === 'Escape') done(null);
        if (e.key === 'Enter') done(inputEl.value);
      }
      document.addEventListener('keydown', key);
      veil.addEventListener('click', () => done(null));
    });
  };

  K.WM = {
    open, focus, close, minimize, restore, toggleMax, apply,
    get windows() { return windows; },
    getFocused, workArea, dialog, UI,
    init() { layer = document.getElementById('windows-layer'); snapEl = document.getElementById('snap-preview'); }
  };
})();