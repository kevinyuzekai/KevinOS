/* ============================================================
 * KevinOS · 桌面环境（图标 / 任务栏 / 开始菜单 / 通知）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;
  const FS = K.FS;

  let notifs = [];
  let notifSeq = 0;

  /* ---------------- 通知 ---------------- */
  function notify({ title, body, icon, app, silent }) {
    const n = { id: ++notifSeq, title, body, icon, time: Date.now() };
    notifs.unshift(n);
    if (notifs.length > 30) notifs.pop();
    renderNotifs();
    if (!silent) toast(n);
    return n;
  }
  function toast(n) {
    const stack = document.getElementById('toast-stack');
    const app = n.app ? K.apps.getApp(n.app) : null;
    const grad = app ? app.gradient : ['#4f7cff', '#7aa2ff'];
    const t = el('div', { class: 'toast' }, [
      el('div', { class: 't-ico', style: { background: `linear-gradient(145deg,${grad[0]},${grad[1]})` }, html: `<svg viewBox="0 0 24 24" class="ico">${K.ICONS[app ? app.icon : (n.icon || 'info')] || K.ICONS.info}</svg>` }),
      el('div', {}, [el('div', { class: 't-title', text: n.title }), n.body ? el('div', { class: 't-body', text: n.body }) : null])
    ]);
    stack.appendChild(t);
    setTimeout(() => { t.classList.add('leaving'); setTimeout(() => t.remove(), 400); }, 4200);
  }
  function renderNotifs() {
    const host = document.getElementById('ac-notifs');
    const badge = document.getElementById('notif-badge');
    host.innerHTML = '';
    if (!notifs.length) { host.appendChild(el('div', { class: 'ac-empty', text: '暂无通知' })); }
    notifs.forEach(n => {
      host.appendChild(el('div', { class: 'ac-notif' }, [
        el('div', { class: 'an-title', text: n.title }),
        n.body ? el('div', { class: 'an-body', text: n.body }) : null,
        el('div', { class: 'an-time', text: new Date(n.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) })
      ]));
    });
    if (notifs.length) { badge.hidden = false; badge.textContent = String(Math.min(notifs.length, 99)); }
    else badge.hidden = true;
  }

  /* ---------------- 右键菜单 ---------------- */
  function showContextMenu(x, y, items) {
    const menu = document.getElementById('context-menu');
    menu.innerHTML = '';
    items.forEach(it => {
      if (it.sep) return menu.appendChild(el('div', { class: 'ctx-sep' }));
      const row = el('div', { class: 'ctx-item' + (it.danger ? ' danger' : '') + (it.disabled ? ' disabled' : '') }, [
        it.icon ? K.util.svgIcon(it.icon) : el('span', { class: 'ico' }),
        el('span', { class: 'ctx-label', text: it.label }),
        it.key ? el('span', { class: 'ctx-key', text: it.key }) : null
      ]);
      row.addEventListener('click', () => { hideContextMenu(); it.act && it.act(); });
      menu.appendChild(row);
    });
    menu.hidden = false;
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.min(x, window.innerWidth - mw - 8) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - mh - 8) + 'px';
  }
  function hideContextMenu() { document.getElementById('context-menu').hidden = true; }

  /* ---------------- 触屏交互辅助 ---------------- */
  // 在触屏设备上：单击打开、长按呼出上下文菜单；桌面端保留单击选中 / 双击打开
  function isTouchDevice() { return K.device && K.device.isTouch; }

  function bindTapAndLongPress(el, onTap, onLongPress) {
    const LONG_MS = 500;
    const MOVE_TOL = 10;
    let timer = null, startX = 0, startY = 0, moved = false, longPressed = false;

    el.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return; // 鼠标走原生 click/dblclick/contextmenu
      moved = false; longPressed = false;
      startX = e.clientX; startY = e.clientY;
      timer = setTimeout(() => {
        if (moved) return;
        longPressed = true;
        if (onLongPress) onLongPress(e);
      }, LONG_MS);
    });
    el.addEventListener('pointermove', e => {
      if (Math.abs(e.clientX - startX) > MOVE_TOL || Math.abs(e.clientY - startY) > MOVE_TOL) {
        moved = true;
        if (timer) { clearTimeout(timer); timer = null; }
      }
    });
    el.addEventListener('pointerup', e => {
      if (timer) { clearTimeout(timer); timer = null; }
      if (e.pointerType === 'mouse') return;
      if (longPressed || moved) return;
      if (onTap) onTap(e);
    });
    el.addEventListener('pointercancel', () => {
      if (timer) { clearTimeout(timer); timer = null; }
    });
  }

  /* ---------------- 桌面图标 ---------------- */
  function renderDesktopIcons() {
    const host = document.getElementById('desktop-icons');
    host.innerHTML = '';
    if (!K.system.settings.showDesktopIcons) { host.hidden = true; return; }
    host.hidden = false;

    const selectIcon = (icon) => {
      host.querySelectorAll('.desk-icon').forEach(n => n.classList.remove('selected'));
      icon.classList.add('selected');
    };

    (FS.list('/Home/Desktop') || []).forEach(node => {
      const path = '/Home/Desktop/' + node.name;
      const wrap = el('div', { class: 'desk-icon' });
      const imgWrap = el('div', { class: 'di-img' });
      if (node.type === 'folder') {
        imgWrap.innerHTML = `<span class="app-ico" style="background:linear-gradient(145deg,#ffc24b,#ff9d2e)"><svg viewBox="0 0 24 24">${K.ICONS.files}</svg></span>`;
      } else {
        imgWrap.innerHTML = `<span class="app-ico" style="background:linear-gradient(145deg,#64748b,#94a3b8)"><svg viewBox="0 0 24 24">${K.ICONS.editor}</svg></span>`;
      }
      wrap.append(imgWrap, el('div', { class: 'di-label', text: node.name }));

      const open = () => {
        if (node.type === 'folder') K.WM.open('files', { path });
        else if (FS.kind(node.name) === 'image') K.WM.open('photos', { path });
        else if (FS.kind(node.name) === 'code') K.WM.open('code', { path });
        else if (FS.kind(node.name) === 'doc') K.WM.open('office', { path });
        else K.WM.open('editor', { path });
      };
      const menuItems = [
        { label: '打开', icon: 'about', act: open },
        { sep: true },
        { label: '重命名', icon: 'editor', act: async () => { const n = await K.WM.UI.prompt('重命名', node.name, '重命名'); if (n) { const r = FS.rename(path, n); if (!r.ok) K.WM.UI.alert(r.error); } } },
        { label: '删除', icon: 'settings', danger: true, act: async () => { const ok = await K.WM.UI.confirm(`确定删除「${node.name}」吗？`, '删除', { danger: true, okText: '删除' }); if (ok) FS.remove(path); } }
      ];

      wrap.addEventListener('click', () => { if (!isTouchDevice()) selectIcon(wrap); });
      wrap.addEventListener('dblclick', () => { if (!isTouchDevice()) open(); });
      wrap.addEventListener('contextmenu', e => {
        if (isTouchDevice()) return; // 触屏由长按处理
        e.preventDefault(); e.stopPropagation();
        showContextMenu(e.clientX, e.clientY, menuItems);
      });
      bindTapAndLongPress(wrap, open, e => {
        selectIcon(wrap);
        showContextMenu(e.clientX, e.clientY, menuItems);
      });
      host.appendChild(wrap);
    });
  }

  function desktopMenu(x, y) {
    showContextMenu(x, y, [
      { label: '刷新', icon: 'media', act: () => { renderDesktopIcons(); notify({ title: '桌面', body: '已刷新' }); } },
      { label: '排列图标', icon: 'about', act: () => renderDesktopIcons() },
      { sep: true },
      { label: '新建文件夹', icon: 'files', act: async () => { const n = await K.WM.UI.prompt('新建文件夹', '新建文件夹', '新建'); if (n) FS.mkdir('/Home/Desktop/' + n); } },
      { label: '新建文本文件', icon: 'editor', act: async () => { const n = await K.WM.UI.prompt('新建文件', '新建文本文档.txt', '新建'); if (n) FS.writeFile('/Home/Desktop/' + n, ''); } },
      { sep: true },
      { label: '在终端中打开', icon: 'terminal', act: () => K.WM.open('terminal') },
      { label: '打开文件管理器', icon: 'files', act: () => K.WM.open('files', { path: '/Home/Desktop' }) },
      { sep: true },
      { label: '更改壁纸', icon: 'image', act: () => K.WM.open('settings') },
      { label: '个性化设置', icon: 'settings', act: () => K.WM.open('settings') }
    ]);
  }

  /* ---------------- Dock（底部应用栏） ---------------- */
  const DOCK_PINNED = ['files', 'browser', 'office', 'code', 'terminal', 'weather', 'notes', 'settings'];

  function renderDock() {
    const host = document.getElementById('dock-apps');
    if (!host) return;
    host.innerHTML = '';

    // 收集运行中的应用（按首次打开顺序去重）
    const running = [];
    const seen = new Set();
    K.WM.windows.forEach(win => {
      if (!seen.has(win.appId)) { seen.add(win.appId); running.push(win.appId); }
    });

    // 固定应用 + 运行中的非固定应用
    const ids = [...DOCK_PINNED];
    running.forEach(id => { if (!ids.includes(id)) ids.push(id); });

    ids.forEach(appId => {
      const app = K.apps.getApp(appId);
      if (!app) return;
      const isRunning = running.includes(appId);
      const isFocused = isRunning && K.WM.windows.some(w => w.appId === appId && w.focused);
      const item = el('button', { class: 'dock-app' + (isFocused ? ' focused' : ''), title: app.name });
      const ico = K.apps.appIconEl(app);
      ico.style.width = '44px'; ico.style.height = '44px'; ico.style.borderRadius = '12px';
      item.appendChild(ico);
      if (isRunning) item.appendChild(el('span', { class: 'dock-dot' }));
      item.addEventListener('click', () => {
        const wins = K.WM.windows.filter(w => w.appId === appId);
        if (!wins.length) K.WM.open(appId);
        else {
          const focused = wins.find(w => w.focused && !w.state.minimized);
          if (focused) K.WM.minimize(focused);
          else { wins.forEach(w => { if (w.state.minimized) K.WM.restore(w); else K.WM.focus(w); }); }
        }
      });
      host.appendChild(item);
    });
  }

  /* ---------------- 开始菜单 ---------------- */
  function renderStartApps(filter) {
    const host = document.getElementById('start-apps');
    host.innerHTML = '';
    const apps = K.apps.allApps().filter(a => !filter || a.name.toLowerCase().includes(filter) || a.id.includes(filter) || (a.category || '').toLowerCase().includes(filter));
    if (!apps.length) { host.appendChild(el('div', { class: 'ac-empty', text: '没有匹配的应用' })); return; }
    apps.forEach((app, i) => {
      const item = el('div', { class: 'start-app' }, [K.apps.appIconEl(app), el('div', { class: 'sa-name', text: app.name })]);
      item.style.animationDelay = (i * 18) + 'ms';
      item.addEventListener('click', () => { K.WM.open(app.id); closeStartMenu(); });
      host.appendChild(item);
    });
  }
  function renderStartRecent() {
    const host = document.getElementById('start-recent');
    host.innerHTML = '';
    const now = new Date();
    host.appendChild(el('div', { class: 'start-section-title' }, [el('span', { text: '推荐' })]));
    host.appendChild(el('div', { class: 'sr-item', style: { padding: '8px 4px' }, text: `今天是 ${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · 欢迎回来，Kevin` }));
  }

  function openStartMenu() {
    const m = document.getElementById('start-menu');
    closeActionCenter(); closeWifiPanel();
    m.hidden = false;
    requestAnimationFrame(() => m.classList.add('open'));
    renderStartApps();
    renderStartRecent();
    setTimeout(() => document.getElementById('start-search').focus(), 80);
  }
  function closeStartMenu() {
    const m = document.getElementById('start-menu');
    m.classList.remove('open');
    setTimeout(() => { if (!m.classList.contains('open')) m.hidden = true; }, 300);
    document.getElementById('start-search').value = '';
  }
  function toggleStartMenu() { document.getElementById('start-menu').classList.contains('open') ? closeStartMenu() : openStartMenu(); }

  /* ---------------- 快捷设置 ---------------- */
  function renderActionCenter() {
    const toggles = document.getElementById('ac-toggles');
    toggles.innerHTML = '';
    const st = K.system.settings;
    const defs = [
      { on: st.theme === 'dark', ico: 'image', t1: '深色模式', t2: st.theme === 'dark' ? '已开启' : '已关闭', act: () => { K.system.setTheme(st.theme === 'dark' ? 'light' : 'dark'); renderActionCenter(); } },
      { on: navigator.onLine, ico: navigator.onLine ? 'wifi' : 'wifi-off', t1: '网络', t2: netTypeLabel(netInfo()), act: () => { closeActionCenter(); openWifiPanel(); } },
      { on: false, ico: 'media', t1: '蓝牙', t2: '未连接', act: () => notify({ title: '蓝牙', body: '正在搜索设备…' }) },
      { on: st.glass, ico: 'about', t1: '透明效果', t2: '亚克力材质', act: () => { st.glass = !st.glass; K.system.applySettings(); renderActionCenter(); } }
    ];
    defs.forEach(d => {
      const t = el('div', { class: 'ac-toggle' + (d.on ? ' on' : '') }, [
        el('div', { class: 'ac-ico', html: `<svg viewBox="0 0 24 24" class="ico">${K.ICONS[d.ico]}</svg>` }),
        el('div', { class: 'ac-txt' }, [el('div', { class: 'ac-t1', text: d.t1 }), el('div', { class: 'ac-t2', text: d.t2 })])
      ]);
      t.addEventListener('click', d.act);
      toggles.appendChild(t);
    });
    document.getElementById('ac-brightness').value = st.brightness;
    document.getElementById('ac-volume').value = st.volume;
  }
  function openActionCenter() {
    const a = document.getElementById('action-center');
    closeWifiPanel();
    a.hidden = false;
    requestAnimationFrame(() => a.classList.add('open'));
    renderActionCenter(); renderNotifs();
  }
  function closeActionCenter() {
    const a = document.getElementById('action-center');
    a.classList.remove('open');
    setTimeout(() => { if (!a.classList.contains('open')) a.hidden = true; }, 300);
  }
  function toggleActionCenter() { document.getElementById('action-center').classList.contains('open') ? closeActionCenter() : openActionCenter(); }

  /* ---------------- Wi-Fi / 网络（读取真实网络信息） ---------------- */
  function netConn() {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  }
  function netInfo() {
    const c = netConn();
    return {
      online: navigator.onLine,
      type: (c && c.type) || '',
      effectiveType: (c && c.effectiveType) || '',
      downlink: c && typeof c.downlink === 'number' ? c.downlink : null,
      rtt: c && typeof c.rtt === 'number' ? c.rtt : null,
      saveData: c ? !!c.saveData : null
    };
  }
  const NET_TYPE = { wifi: 'Wi-Fi', ethernet: '以太网', cellular: '蜂窝网络', bluetooth: '蓝牙', wimax: 'WiMAX', none: '无网络', other: '其他', unknown: '未知' };
  function netTypeLabel(i) {
    if (!i.online) return '未连接';
    if (i.type && NET_TYPE[i.type]) return NET_TYPE[i.type];
    return 'Wi-Fi / 已联网';
  }
  function netSpeedLabel(i) {
    const map = { 'slow-2g': '极慢 (slow-2G)', '2g': '较慢 (2G)', '3g': '一般 (3G)', '4g': '良好 (4G)' };
    return i.effectiveType ? (map[i.effectiveType] || i.effectiveType.toUpperCase()) : (i.online ? '未提供' : '—');
  }
  function renderWifiPanel() {
    const panel = document.getElementById('wifi-panel');
    const i = netInfo();
    panel.classList.toggle('offline', !i.online);
    document.getElementById('wifi-head-ico').innerHTML = `<svg viewBox="0 0 24 24" class="ico">${K.ICONS[i.online ? 'wifi' : 'wifi-off']}</svg>`;
    document.getElementById('wifi-head-t1').textContent = netTypeLabel(i);
    document.getElementById('wifi-head-t2').textContent = i.online
      ? (i.saveData ? '已连接 · 数据节省模式' : '已连接 · 网络正常')
      : '离线 · 请检查网络连接';

    const cells = [
      ['状态', i.online ? '在线' : '离线'],
      ['连接类型', netTypeLabel(i)],
      ['网络速率', netSpeedLabel(i)],
      ['下行带宽', i.downlink != null ? i.downlink + ' <small>Mbps</small>' : '<small>未提供</small>'],
      ['往返时延', i.rtt != null ? i.rtt + ' <small>ms</small>' : '<small>未提供</small>'],
      ['数据节省', i.saveData == null ? '<small>未提供</small>' : (i.saveData ? '已开启' : '已关闭')]
    ];
    const grid = document.getElementById('wifi-grid');
    grid.innerHTML = '';
    cells.forEach(([k, v]) => grid.appendChild(
      el('div', { class: 'wifi-cell' }, [el('div', { class: 'wc-k', text: k }), el('div', { class: 'wc-v', html: v })])
    ));
    document.getElementById('wifi-note').textContent = netConn()
      ? '以上为浏览器实时上报的真实网络指标。受隐私保护，网页无法获取 Wi-Fi 名称(SSID)与信号强度。'
      : '当前浏览器未提供 Network Information API（建议使用 Chrome/Edge），仅显示在线状态。受隐私保护，网页无法获取 Wi-Fi 名称与信号强度。';
  }
  function updateWifiTray() {
    const btn = document.getElementById('mb-wifi');
    if (!btn) return;
    const i = netInfo();
    btn.classList.toggle('offline', !i.online);
    btn.title = i.online ? '网络 · ' + netTypeLabel(i) : '网络 · 离线';
    if (!document.getElementById('wifi-panel').hidden) renderWifiPanel();
  }
  function openWifiPanel() {
    closeStartMenu(); closeActionCenter(); closeLaunchpad();
    const p = document.getElementById('wifi-panel');
    p.hidden = false;
    renderWifiPanel();
    requestAnimationFrame(() => p.classList.add('open'));
    document.getElementById('mb-wifi').classList.add('active');
  }
  function closeWifiPanel() {
    const p = document.getElementById('wifi-panel');
    if (p.hidden) return;
    p.classList.remove('open');
    document.getElementById('mb-wifi').classList.remove('active');
    setTimeout(() => { if (!p.classList.contains('open')) p.hidden = true; }, 300);
  }
  function toggleWifiPanel() { document.getElementById('wifi-panel').classList.contains('open') ? closeWifiPanel() : openWifiPanel(); }
  function initNetwork() {
    updateWifiTray();
    window.addEventListener('online', () => { updateWifiTray(); notify({ title: '网络', body: '已恢复网络连接' }); });
    window.addEventListener('offline', () => { updateWifiTray(); notify({ title: '网络', body: '网络连接已断开' }); });
    const c = netConn();
    if (c && c.addEventListener) c.addEventListener('change', updateWifiTray);
  }

  /* ---------------- 启动台（Launchpad） ---------------- */
  const LP_COLS = 7, LP_ROWS = 3, LP_PER_PAGE = LP_COLS * LP_ROWS;
  let lpPage = 0, lpPageCount = 1;

  function lpSort(a, b) {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return a.name.localeCompare(b.name, 'zh');
  }
  function lpUpdateTrack() {
    const track = document.getElementById('lp-track');
    if (track) track.style.transform = `translateX(${-lpPage * 100}%)`;
    document.querySelectorAll('#lp-pages .lp-dot').forEach((d, i) => d.classList.toggle('active', i === lpPage));
  }
  function renderLaunchpad(filter) {
    const q = (filter || '').trim().toLowerCase();
    const track = document.getElementById('lp-track');
    const pagesEl = document.getElementById('lp-pages');
    track.innerHTML = ''; pagesEl.innerHTML = '';

    const apps = K.apps.allApps().filter(a =>
      !q || a.name.toLowerCase().includes(q) || a.id.includes(q) || (a.category || '').toLowerCase().includes(q)
    ).sort(lpSort);

    const pages = [];
    for (let i = 0; i < apps.length; i += LP_PER_PAGE) pages.push(apps.slice(i, i + LP_PER_PAGE));
    if (!pages.length) pages.push([]);
    lpPageCount = pages.length;
    if (lpPage > lpPageCount - 1) lpPage = lpPageCount - 1;
    if (lpPage < 0) lpPage = 0;

    pages.forEach((pageApps, pi) => {
      const page = el('div', { class: 'lp-page' });
      if (!pageApps.length) {
        page.appendChild(el('div', { class: 'lp-empty', text: '没有匹配的应用' }));
      }
      pageApps.forEach((app, idx) => {
        const item = el('div', { class: 'lp-app' }, [K.apps.appIconEl(app), el('div', { class: 'lp-name', text: app.name })]);
        item.style.animationDelay = (pi === lpPage ? idx * 16 : 0) + 'ms';
        item.addEventListener('click', () => { closeLaunchpad(); setTimeout(() => K.WM.open(app.id), 140); });
        page.appendChild(item);
      });
      track.appendChild(page);
    });

    pages.forEach((_, i) => {
      const dot = el('div', { class: 'lp-dot' + (i === lpPage ? ' active' : '') });
      dot.addEventListener('click', () => { lpPage = i; lpUpdateTrack(); });
      pagesEl.appendChild(dot);
    });
    pagesEl.hidden = lpPageCount <= 1;
    lpUpdateTrack();
  }
  function lpGo(delta) {
    const next = Math.min(lpPageCount - 1, Math.max(0, lpPage + delta));
    if (next === lpPage) return;
    lpPage = next; lpUpdateTrack();
  }
  function openLaunchpad() {
    closeStartMenu(); closeActionCenter(); closeWifiPanel();
    const lp = document.getElementById('launchpad');
    lp.hidden = false; lpPage = 0;
    const s = document.getElementById('lp-search'); s.value = '';
    renderLaunchpad('');
    requestAnimationFrame(() => lp.classList.add('open'));
    setTimeout(() => s.focus(), 140);
  }
  function closeLaunchpad() {
    const lp = document.getElementById('launchpad');
    if (lp.hidden) return;
    lp.classList.remove('open');
    setTimeout(() => { if (!lp.classList.contains('open')) lp.hidden = true; }, 340);
  }
  function toggleLaunchpad() { document.getElementById('launchpad').classList.contains('open') ? closeLaunchpad() : openLaunchpad(); }

  /* ---------------- 全局搜索 ---------------- */
  let searchPanel = null;
  function ensureSearchPanel() {
    if (searchPanel) return searchPanel;
    searchPanel = el('div', { class: 'start-menu', id: 'search-panel', style: { width: 'min(520px, calc(100vw - 24px))', left: '50%' } });
    searchPanel.innerHTML = '<div class="start-section-title"><span>搜索结果</span></div><div class="start-apps" id="search-results"></div>';
    document.getElementById('desktop').appendChild(searchPanel);
    return searchPanel;
  }
  function doGlobalSearch(q) {
    q = q.trim().toLowerCase();
    const panel = ensureSearchPanel();
    const results = document.getElementById('search-results');
    results.innerHTML = '';
    if (!q) { panel.classList.remove('open'); setTimeout(() => panel.hidden = true, 300); return; }
    panel.hidden = false; requestAnimationFrame(() => panel.classList.add('open'));
    panel.style.bottom = '74px';

    const apps = K.apps.allApps().filter(a => a.name.toLowerCase().includes(q) || a.id.includes(q));
    // 文件搜索
    const files = [];
    (function walk(path) {
      (FS.list(path) || []).forEach(n => {
        const np = path + '/' + n.name;
        if (n.name.toLowerCase().includes(q)) files.push({ node: n, path: np });
        if (n.type === 'folder' && files.length < 40) walk(np);
      });
    })('/Home');

    if (!apps.length && !files.length) {
      results.appendChild(el('div', { class: 'ac-empty', text: '没有结果。按 Enter 使用浏览器搜索“' + q + '”' }));
      return;
    }
    apps.forEach(a => {
      const it = el('div', { class: 'start-app' }, [K.apps.appIconEl(a), el('div', { class: 'sa-name', text: a.name })]);
      it.addEventListener('click', () => { K.WM.open(a.id); closeSearch(); });
      results.appendChild(it);
    });
    files.slice(0, 12).forEach(f => {
      const it = el('div', { class: 'start-app' }, [
        el('span', { class: 'app-ico', style: { background: 'linear-gradient(145deg,#64748b,#94a3b8)' }, html: `<svg viewBox="0 0 24 24">${K.ICONS.editor}</svg>` }),
        el('div', { class: 'sa-name', text: f.node.name })
      ]);
      it.addEventListener('click', () => {
        if (f.node.type === 'folder') K.WM.open('files', { path: f.path });
        else if (FS.kind(f.node.name) === 'image') K.WM.open('photos', { path: f.path });
        else K.WM.open('editor', { path: f.path });
        closeSearch();
      });
      results.appendChild(it);
    });
  }
  function closeSearch() {
    if (!searchPanel) return;
    searchPanel.classList.remove('open');
    setTimeout(() => { if (searchPanel && !searchPanel.classList.contains('open')) searchPanel.hidden = true; }, 300);
    document.getElementById('global-search').value = '';
  }

  /* ---------------- 时钟 ---------------- */
  function updateClock() {
    const now = new Date();
    const p = n => String(n).padStart(2, '0');
    const time = el('span');
    document.getElementById('clock-time').textContent = p(now.getHours()) + ':' + p(now.getMinutes());
    const dow = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
    document.getElementById('clock-date').textContent = `${now.getMonth() + 1}/${now.getDate()} ${dow}`;
  }

  /* ---------------- OSD ---------------- */
  let osdTimer = null;
  function showOSD(text) {
    const osd = document.getElementById('osd');
    document.getElementById('osd-text').textContent = text;
    osd.hidden = false;
    clearTimeout(osdTimer);
    osdTimer = setTimeout(() => osd.hidden = true, 1400);
  }

  /* ---------------- 桌面小组件 ---------------- */
  const WIDGETS = [
    { id: 'w-clock', name: '时钟', w: 200, h: 140, render: wClock },
    { id: 'w-calendar', name: '日历', w: 220, h: 200, render: wCalendar },
    { id: 'w-weather', name: '天气', w: 200, h: 150, render: wWeather },
    { id: 'w-notes', name: '便签', w: 220, h: 160, render: wNotes }
  ];
  let widgetPositions = JSON.parse(localStorage.getItem('kevinos.widgets.v1') || '{}');

  function saveWidgetPositions() { localStorage.setItem('kevinos.widgets.v1', JSON.stringify(widgetPositions)); }

  function createWidget(def, idx) {
    const pos = widgetPositions[def.id] || { x: window.innerWidth - def.w - 24 - idx * 8, y: 52 + idx * 12 };
    const w = el('div', { class: 'widget', id: def.id, style: { left: pos.x + 'px', top: pos.y + 'px', width: def.w + 'px' } });
    const head = el('div', { class: 'widget-head' }, [el('span', { class: 'widget-name', text: def.name })]);
    const body = el('div', { class: 'widget-body' });
    const close = el('button', { class: 'widget-close', text: '×' });
    close.addEventListener('click', e => { e.stopPropagation(); w.remove(); });
    head.appendChild(close);
    w.append(head, body);
    def.render(body);

    // 拖拽
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
    head.addEventListener('pointerdown', e => {
      if (e.target.closest('.widget-close')) return;
      dragging = true; sx = e.clientX; sy = e.clientY; ox = pos.x; oy = pos.y;
      w.style.zIndex = 60;
    });
    document.addEventListener('pointermove', e => {
      if (!dragging) return;
      pos.x = Math.max(8, Math.min(ox + e.clientX - sx, window.innerWidth - def.w - 8));
      pos.y = Math.max(36, Math.min(oy + e.clientY - sy, window.innerHeight - 120));
      w.style.left = pos.x + 'px'; w.style.top = pos.y + 'px';
    });
    document.addEventListener('pointerup', () => { if (dragging) { dragging = false; widgetPositions[def.id] = pos; saveWidgetPositions(); } });

    return w;
  }

  function initWidgets() {
    const host = document.getElementById('widgets-layer');
    if (!host) return;
    host.innerHTML = '';
    WIDGETS.forEach((def, i) => host.appendChild(createWidget(def, i)));
  }

  /* ---- 时钟小组件 ---- */
  function wClock(body) {
    const t = el('div', { class: 'wc-time' });
    const d = el('div', { class: 'wc-date' });
    body.append(t, d);
    function tick() {
      const now = new Date();
      const p = n => String(n).padStart(2, '0');
      t.textContent = p(now.getHours()) + ':' + p(now.getMinutes());
      const dow = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
      d.textContent = `${now.getMonth() + 1}月${now.getDate()}日 ${dow}`;
    }
    tick(); setInterval(tick, 1000);
  }

  /* ---- 日历小组件 ---- */
  function wCalendar(body) {
    const head = el('div', { class: 'wcal-head' });
    const grid = el('div', { class: 'wcal-grid' });
    body.append(head, grid);
    function render() {
      const now = new Date();
      head.textContent = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月`;
      grid.innerHTML = '';
      ['日', '一', '二', '三', '四', '五', '六'].forEach(d => grid.appendChild(el('div', { class: 'wcal-dow', text: d })));
      const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 0; i < first; i++) grid.appendChild(el('div', { class: 'wcal-cell empty' }));
      for (let day = 1; day <= days; day++) {
        const c = el('div', { class: 'wcal-cell' + (day === now.getDate() ? ' today' : ''), text: String(day) });
        grid.appendChild(c);
      }
    }
    render();
  }

  /* ---- 天气小组件 ---- */
  function wWeather(body) {
    const city = el('div', { class: 'ww-city', text: '上海' });
    const temp = el('div', { class: 'ww-temp', text: '22°' });
    const cond = el('div', { class: 'ww-cond', text: '多云' });
    body.append(city, temp, cond);
    // 模拟数据（真实环境可接入天气应用）
    const sample = [
      { city: '上海', temp: 22, cond: '多云' },
      { city: '北京', temp: 18, cond: '晴' },
      { city: '深圳', temp: 27, cond: '阵雨' }
    ][Math.floor(Math.random() * 3)];
    city.textContent = sample.city;
    temp.textContent = sample.temp + '°';
    cond.textContent = sample.cond;
  }

  /* ---- 便签小组件 ---- */
  function wNotes(body) {
    const ta = el('textarea', { class: 'wn-area', placeholder: '写点什么…', spellcheck: 'false' });
    ta.value = localStorage.getItem('kevinos.widget.note') || '';
    ta.addEventListener('input', () => localStorage.setItem('kevinos.widget.note', ta.value));
    body.appendChild(ta);
  }

  /* ---------------- 初始化 ---------------- */
  function updateMenubarApp() {
    const host = document.getElementById('mb-app-name');
    if (!host) return;
    const win = K.WM.windows.find(w => w.focused);
    host.textContent = win ? win.app.name : 'Finder';
  }

  function init() {
    // Logo / Apple 菜单 → 开始菜单（含关机/重启）
    document.getElementById('mb-logo').addEventListener('click', e => { e.stopPropagation(); toggleStartMenu(); });

    // 电源
    document.getElementById('start-power').addEventListener('click', async () => {
      closeStartMenu();
      const r = await K.WM.dialog({
        title: '电源', message: '选择操作：', icon: 'settings',
        buttons: [
          { label: '取消', value: 'cancel' },
          { label: '睡眠', value: 'sleep' },
          { label: '重启', value: 'reboot', variant: 'primary' },
          { label: '关机', value: 'shutdown', variant: 'danger' }
        ]
      });
      if (r === 'shutdown') K.system.shutdown();
      if (r === 'reboot') K.system.reboot();
      if (r === 'sleep') K.system.sleep();
    });

    // Dock：访达 / 启动台 / 废纸篓
    document.getElementById('dock-finder').addEventListener('click', () => K.WM.open('files'));
    document.getElementById('dock-launchpad').addEventListener('click', e => { e.stopPropagation(); toggleLaunchpad(); });
    document.getElementById('dock-trash').addEventListener('click', () => K.WM.open('files', { path: '/Home/Trash' }));
    document.getElementById('start-all-apps').addEventListener('click', e => { e.stopPropagation(); openLaunchpad(); });

    document.getElementById('desktop').addEventListener('click', e => {
      const t = e.target.closest('[data-open-app]');
      if (t) { K.WM.open(t.dataset.openApp); closeStartMenu(); }
    });
    document.getElementById('lp-search').addEventListener('input', e => { lpPage = 0; renderLaunchpad(e.target.value); });
    document.getElementById('lp-search').addEventListener('keydown', e => {
      if (e.key === 'Escape') closeLaunchpad();
      if (e.key === 'ArrowRight') lpGo(1);
      if (e.key === 'ArrowLeft') lpGo(-1);
      if (e.key === 'Enter') {
        const q = e.target.value.trim().toLowerCase();
        const app = K.apps.allApps().find(a => a.name.toLowerCase().includes(q) || a.id === q);
        if (app) { closeLaunchpad(); setTimeout(() => K.WM.open(app.id), 140); }
      }
    });
    document.getElementById('launchpad').addEventListener('click', e => {
      if (e.target.closest('.lp-app') || e.target.closest('.lp-search-wrap') || e.target.closest('.lp-dot')) return;
      closeLaunchpad();
    });
    document.getElementById('lp-viewport').addEventListener('wheel', e => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && Math.abs(e.deltaY) > 18) lpGo(e.deltaY > 0 ? 1 : -1);
    }, { passive: true });

    // 顶部状态栏
    document.getElementById('mb-notif').addEventListener('click', e => { e.stopPropagation(); toggleActionCenter(); });
    document.getElementById('mb-clock').addEventListener('click', e => { e.stopPropagation(); toggleActionCenter(); });
    document.getElementById('mb-wifi').addEventListener('click', e => { e.stopPropagation(); toggleWifiPanel(); });
    document.getElementById('mb-volume').addEventListener('click', () => showOSD('音量 ' + K.system.settings.volume + '%'));

    // 亮度/音量
    document.getElementById('ac-brightness').addEventListener('input', e => K.system.setBrightness(+e.target.value));
    document.getElementById('ac-volume').addEventListener('input', e => { K.system.setVolume(+e.target.value); showOSD('音量 ' + e.target.value + '%'); });
    document.getElementById('clear-notifs').addEventListener('click', () => { notifs = []; renderNotifs(); });

    // 开始菜单搜索
    document.getElementById('start-search').addEventListener('input', e => renderStartApps(e.target.value.trim().toLowerCase()));

    // 桌面右键 / 触屏长按
    const desktop = document.getElementById('desktop');
    desktop.addEventListener('contextmenu', e => {
      if (e.target.closest('.window') || e.target.closest('.dock') || e.target.closest('.menubar') || e.target.closest('.desk-icon') || e.target.closest('.start-menu') || e.target.closest('.action-center') || e.target.closest('.widget')) return;
      e.preventDefault();
      desktopMenu(e.clientX, e.clientY);
    });
    bindTapAndLongPress(desktop, null, e => {
      if (e.target.closest('.window') || e.target.closest('.dock') || e.target.closest('.menubar') || e.target.closest('.desk-icon') || e.target.closest('.start-menu') || e.target.closest('.action-center') || e.target.closest('.launchpad') || e.target.closest('.widget')) return;
      desktopMenu(e.clientX, e.clientY);
    });
    // 空白点击
    desktop.addEventListener('mousedown', e => {
      if (!e.target.closest('#context-menu')) hideContextMenu();
      if (!e.target.closest('#action-center') && !e.target.closest('#mb-notif') && !e.target.closest('#mb-clock')) closeActionCenter();
      if (!e.target.closest('#wifi-panel') && !e.target.closest('#mb-wifi')) closeWifiPanel();
      if (!e.target.closest('.desk-icon')) desktop.querySelectorAll('.desk-icon').forEach(n => n.classList.remove('selected'));
    });
    window.addEventListener('resize', () => { hideContextMenu(); renderDock(); });
    document.getElementById('wallpaper').addEventListener('click', () => { hideContextMenu(); });

    K.bus.on('window:change', () => { renderDock(); updateMenubarApp(); });
    K.bus.on('window:focus', () => { renderDock(); updateMenubarApp(); });
    FS.onChange(renderDesktopIcons);

    renderDesktopIcons();
    renderDock();
    renderNotifs();
    renderActionCenter();
    initNetwork();
    initWidgets();
    updateClock();
    setInterval(updateClock, 1000);
  }

  K.desktop = {
    init, notify, showContextMenu, hideContextMenu,
    renderDesktopIcons, renderDock, renderNotifs, renderActionCenter,
    renderStartApps, openStartMenu, closeStartMenu, toggleStartMenu,
    openActionCenter, closeActionCenter, showOSD,
    openWifiPanel, closeWifiPanel, toggleWifiPanel, renderWifiPanel, updateWifiTray,
    openLaunchpad, closeLaunchpad, toggleLaunchpad, renderLaunchpad,
    desktopMenu
  };
})();