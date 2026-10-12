/* ============================================================
 * KevinOS · 桌面环境（图标 / 任务栏 / 开始菜单 / 通知）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;
  const FS = K.FS;

  const DESKTOP_SHORTCUTS = [
    { app: 'files', name: '文件管理器' },
    { app: 'browser', name: '浏览器' },
    { app: 'code', name: '代码编辑器' },
    { app: 'terminal', name: '终端' },
    { app: 'weather', name: '天气' },
    { app: 'store', name: '应用商店' },
    { app: 'notes', name: '便签' },
    { app: 'about', name: '关于本机' }
  ];

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

  /* ---------------- 桌面图标 ---------------- */
  function renderDesktopIcons() {
    const host = document.getElementById('desktop-icons');
    host.innerHTML = '';
    if (!K.system.settings.showDesktopIcons) { host.hidden = true; return; }
    host.hidden = false;

    DESKTOP_SHORTCUTS.forEach(sc => {
      const app = K.apps.getApp(sc.app);
      if (!app) return;
      const icon = el('div', { class: 'desk-icon' }, [
        el('div', { class: 'di-img' }, [K.apps.appIconEl(app)]),
        el('div', { class: 'di-label', text: sc.name })
      ]);
      icon.addEventListener('click', () => {
        host.querySelectorAll('.desk-icon').forEach(n => n.classList.remove('selected'));
        icon.classList.add('selected');
      });
      icon.addEventListener('dblclick', () => K.WM.open(sc.app));
      host.appendChild(icon);
    });

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
      wrap.addEventListener('click', () => { host.querySelectorAll('.desk-icon').forEach(n => n.classList.remove('selected')); wrap.classList.add('selected'); });
      wrap.addEventListener('dblclick', () => {
        if (node.type === 'folder') K.WM.open('files', { path });
        else if (FS.kind(node.name) === 'image') K.WM.open('photos', { path });
        else if (FS.kind(node.name) === 'code') K.WM.open('code', { path });
        else K.WM.open('editor', { path });
      });
      wrap.addEventListener('contextmenu', e => {
        e.preventDefault(); e.stopPropagation();
        showContextMenu(e.clientX, e.clientY, [
          { label: '打开', icon: 'about', act: () => wrap.dispatchEvent(new Event('dblclick')) },
          { sep: true },
          { label: '重命名', icon: 'editor', act: async () => { const n = await K.WM.UI.prompt('重命名', node.name, '重命名'); if (n) { const r = FS.rename(path, n); if (!r.ok) K.WM.UI.alert(r.error); } } },
          { label: '删除', icon: 'settings', danger: true, act: async () => { const ok = await K.WM.UI.confirm(`确定删除「${node.name}」吗？`, '删除', { danger: true, okText: '删除' }); if (ok) FS.remove(path); } }
        ]);
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

  /* ---------------- 任务栏 ---------------- */
  function renderTaskbar() {
    const host = document.getElementById('taskbar-apps');
    host.innerHTML = '';
    K.WM.windows.forEach(win => {
      const b = el('div', { class: 'tb-app' + (win.focused ? ' focused' : '') + (win.state.minimized ? ' minimized' : ''), title: win.app.name, role: 'button', 'aria-label': win.app.name, tabindex: '0' });
      const ico = K.apps.appIconEl(win.app);
      ico.style.width = '28px'; ico.style.height = '28px'; ico.style.borderRadius = '8px';
      b.appendChild(ico);
      b.appendChild(el('span', { class: 'dot' }));
      b.addEventListener('click', () => {
        if (win.state.minimized) K.WM.restore(win);
        else if (win.focused) K.WM.minimize(win);
        else K.WM.focus(win);
      });
      b.addEventListener('contextmenu', e => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY - 10, [
          { label: '还原 / 聚焦', icon: 'about', act: () => K.WM.restore(win) },
          { label: win.state.minimized ? '显示' : '最小化', icon: 'media', act: () => win.state.minimized ? K.WM.restore(win) : K.WM.minimize(win) },
          { label: '最大化 / 还原', icon: 'about', act: () => K.WM.toggleMax(win) },
          { sep: true },
          { label: '关闭窗口', icon: 'settings', danger: true, act: () => K.WM.close(win) }
        ]);
      });
      host.appendChild(b);
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
    m.hidden = false;
    requestAnimationFrame(() => m.classList.add('open'));
    document.getElementById('start-btn').classList.add('active');
    renderStartApps();
    renderStartRecent();
    setTimeout(() => document.getElementById('start-search').focus(), 80);
  }
  function closeStartMenu() {
    const m = document.getElementById('start-menu');
    m.classList.remove('open');
    document.getElementById('start-btn').classList.remove('active');
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
      { on: true, ico: 'settings', t1: 'Wi-Fi', t2: '已连接 KevinOS-5G', act: () => notify({ title: '网络', body: 'Wi-Fi 已就绪' }) },
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
    closeStartMenu(); closeActionCenter();
    const lp = document.getElementById('launchpad');
    lp.hidden = false; lpPage = 0;
    const s = document.getElementById('lp-search'); s.value = '';
    renderLaunchpad('');
    requestAnimationFrame(() => lp.classList.add('open'));
    document.getElementById('launchpad-btn').classList.add('active');
    setTimeout(() => s.focus(), 140);
  }
  function closeLaunchpad() {
    const lp = document.getElementById('launchpad');
    if (lp.hidden) return;
    lp.classList.remove('open');
    document.getElementById('launchpad-btn').classList.remove('active');
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

  /* ---------------- 初始化 ---------------- */
  function init() {
    // 开始按钮
    document.getElementById('start-btn').addEventListener('click', e => { e.stopPropagation(); toggleStartMenu(); });
    document.getElementById('start-power').addEventListener('click', async () => {
      closeStartMenu();
      const r = await K.WM.dialog({
        title: '电源', message: '你想关机还是重启 KevinOS？', icon: 'settings',
        buttons: [{ label: '取消', value: 'cancel' }, { label: '重启', value: 'reboot', variant: 'primary' }, { label: '关机', value: 'shutdown', variant: 'danger' }]
      });
      if (r === 'shutdown') K.system.shutdown();
      if (r === 'reboot') K.system.reboot();
    });

    // 启动台
    document.getElementById('launchpad-btn').addEventListener('click', e => { e.stopPropagation(); toggleLaunchpad(); });
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

    // 托盘
    document.getElementById('tray-notif').addEventListener('click', e => { e.stopPropagation(); toggleActionCenter(); });
    document.getElementById('tray-clock').addEventListener('click', e => { e.stopPropagation(); toggleActionCenter(); });
    document.getElementById('tray-wifi').addEventListener('click', () => notify({ title: '网络', body: 'Wi-Fi：已连接 KevinOS-5G（模拟）' }));
    document.getElementById('tray-volume').addEventListener('click', () => showOSD('音量 ' + K.system.settings.volume + '%'));

    // 亮度/音量
    document.getElementById('ac-brightness').addEventListener('input', e => K.system.setBrightness(+e.target.value));
    document.getElementById('ac-volume').addEventListener('input', e => { K.system.setVolume(+e.target.value); showOSD('音量 ' + e.target.value + '%'); });
    document.getElementById('clear-notifs').addEventListener('click', () => { notifs = []; renderNotifs(); });

    // 开始菜单搜索
    document.getElementById('start-search').addEventListener('input', e => renderStartApps(e.target.value.trim().toLowerCase()));
    // 全局搜索
    const gs = document.getElementById('global-search');
    gs.addEventListener('input', e => doGlobalSearch(e.target.value));
    gs.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const q = gs.value.trim();
        if (!q) return;
        const app = K.apps.allApps().find(a => a.name.toLowerCase().includes(q.toLowerCase()) || a.id === q.toLowerCase());
        if (app) { K.WM.open(app.id); closeSearch(); }
        else { K.WM.open('browser', { url: q }); closeSearch(); }
      }
      if (e.key === 'Escape') closeSearch();
    });

    // 桌面右键
    const desktop = document.getElementById('desktop');
    desktop.addEventListener('contextmenu', e => {
      if (e.target.closest('.window') || e.target.closest('.taskbar') || e.target.closest('.desk-icon') || e.target.closest('.start-menu') || e.target.closest('.action-center')) return;
      e.preventDefault();
      desktopMenu(e.clientX, e.clientY);
    });
    // 空白点击
    desktop.addEventListener('mousedown', e => {
      if (!e.target.closest('#context-menu')) hideContextMenu();
      if (!e.target.closest('#start-menu') && !e.target.closest('#start-btn') && !e.target.closest('#search-panel')) closeStartMenu();
      if (!e.target.closest('#action-center') && !e.target.closest('#tray-notif') && !e.target.closest('#tray-clock')) closeActionCenter();
      if (!e.target.closest('#search-panel') && !e.target.closest('#global-search')) closeSearch();
      if (!e.target.closest('.desk-icon')) desktop.querySelectorAll('.desk-icon').forEach(n => n.classList.remove('selected'));
    });
    window.addEventListener('resize', () => { hideContextMenu(); renderTaskbar(); });
    document.getElementById('wallpaper').addEventListener('click', () => { hideContextMenu(); });

    K.bus.on('window:change', renderTaskbar);
    K.bus.on('window:focus', renderTaskbar);
    FS.onChange(renderDesktopIcons);

    renderDesktopIcons();
    renderTaskbar();
    renderNotifs();
    renderActionCenter();
    updateClock();
    setInterval(updateClock, 1000);
  }

  K.desktop = {
    init, notify, showContextMenu, hideContextMenu,
    renderDesktopIcons, renderTaskbar, renderNotifs, renderActionCenter,
    renderStartApps, openStartMenu, closeStartMenu, toggleStartMenu,
    openActionCenter, closeActionCenter, showOSD,
    openLaunchpad, closeLaunchpad, toggleLaunchpad, renderLaunchpad,
    desktopMenu
  };
})();