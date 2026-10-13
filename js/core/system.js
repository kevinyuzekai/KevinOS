/* ============================================================
 * KevinOS · 系统引导 & 全局设置
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  const SET_KEY = 'kevinos.settings.v1';
  const BOOT_TIME = Date.now();

  /* ---------------- 壁纸 ---------------- */
  // 纯渐变壁纸，无装饰图案；mode 区分暗色 / 浅色
  const wallpapers = [
    // —— 暗色 ——
    { name: '深海蓝', mode: 'dark', bg: 'radial-gradient(120% 120% at 20% 10%, #1e3a8a 0%, #0b1229 45%, #05070f 100%)' },
    { name: '极光', mode: 'dark', bg: 'linear-gradient(160deg, #0b1020 0%, #14284a 40%, #1f5a63 75%, #0b1020 100%)' },
    { name: '暮光', mode: 'dark', bg: 'radial-gradient(120% 120% at 80% 20%, #ff8a3d 0%, #b5306e 40%, #2a1348 75%, #0b0714 100%)' },
    { name: '森林', mode: 'dark', bg: 'radial-gradient(120% 120% at 30% 20%, #10b981 0%, #0f766e 45%, #06241f 100%)' },
    { name: '紫罗兰', mode: 'dark', bg: 'linear-gradient(150deg, #2b1b52 0%, #4b2a8a 45%, #170f2e 100%)' },
    { name: '石墨', mode: 'dark', bg: 'linear-gradient(160deg, #1b1f2a 0%, #2b3242 50%, #0d1017 100%)' },
    { name: '午夜', mode: 'dark', bg: 'linear-gradient(160deg, #0a0e1a 0%, #101827 50%, #05070d 100%)' },
    { name: '熔岩', mode: 'dark', bg: 'radial-gradient(120% 120% at 70% 30%, #dc2626 0%, #7f1d1d 45%, #1a0a0a 100%)' },
    // —— 浅色 ——
    { name: '晨曦', mode: 'light', bg: 'radial-gradient(120% 120% at 70% 15%, #7aa2ff 0%, #4f7cff 35%, #1b2a4a 80%, #0a1120 100%)' },
    { name: '晴空', mode: 'light', bg: 'linear-gradient(160deg, #bae6fd 0%, #7dd3fc 45%, #38bdf8 100%)' },
    { name: '暖白', mode: 'light', bg: 'linear-gradient(160deg, #fef9f3 0%, #fde8d0 50%, #f5d4a8 100%)' },
    { name: '薄荷', mode: 'light', bg: 'linear-gradient(160deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)' },
    { name: '薰衣草', mode: 'light', bg: 'linear-gradient(160deg, #ede9fe 0%, #ddd6fe 50%, #c4b5fd 100%)' },
    { name: '沙滩', mode: 'light', bg: 'linear-gradient(160deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)' },
    { name: '樱花', mode: 'light', bg: 'linear-gradient(150deg, #ffd6e6 0%, #ff9bb8 40%, #b2598f 100%)' },
    { name: '银灰', mode: 'light', bg: 'linear-gradient(160deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)' },
    // —— 带图案 ——
    { name: '星点', mode: 'dark', bg: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,.18) 1px, transparent 1.5px) 0 0/26px 26px, radial-gradient(120% 120% at 30% 20%, #1e293b 0%, #0f172a 55%, #020617 100%)' },
    { name: '网格', mode: 'dark', bg: 'linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px) 0 0/34px 34px, linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px) 0 0/34px 34px, radial-gradient(120% 120% at 60% 30%, #312e81 0%, #1e1b4b 50%, #0c0a1f 100%)' },
    { name: '斜纹', mode: 'dark', bg: 'repeating-linear-gradient(135deg, rgba(255,255,255,.04) 0, rgba(255,255,255,.04) 1px, transparent 1px, transparent 14px), linear-gradient(160deg, #134e4a 0%, #115e59 40%, #042f2e 100%)' },
    { name: '光斑', mode: 'dark', bg: 'radial-gradient(circle at 20% 30%, rgba(99,102,241,.35), transparent 40%), radial-gradient(circle at 80% 70%, rgba(236,72,153,.30), transparent 40%), radial-gradient(circle at 50% 50%, rgba(16,185,129,.18), transparent 50%), #0b1020' },
    { name: '波浪', mode: 'dark', bg: 'repeating-radial-gradient(circle at 50% 120%, rgba(255,255,255,.05) 0, rgba(255,255,255,.05) 2px, transparent 2px, transparent 22px), linear-gradient(180deg, #1e3a5f 0%, #0f1f3a 60%, #070d1a 100%)' },
    { name: '点阵', mode: 'light', bg: 'radial-gradient(circle at 50% 50%, rgba(15,23,42,.10) 1px, transparent 1.5px) 0 0/22px 22px, linear-gradient(160deg, #e0e7ff 0%, #c7d2fe 50%, #a5b4fc 100%)' },
    { name: '细线', mode: 'light', bg: 'linear-gradient(rgba(15,23,42,.06) 1px, transparent 1px) 0 0/28px 28px, linear-gradient(160deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)' },
    { name: '柔光', mode: 'light', bg: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,.5), transparent 35%), radial-gradient(circle at 75% 75%, rgba(196,181,253,.45), transparent 40%), linear-gradient(160deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)' }
  ];

  const DEFAULTS = {
    theme: 'dark', accent: 'blue', wallpaper: 0,
    showDesktopIcons: true, glass: true, animations: true, snap: true,
    brightness: 100, volume: 60
  };

  let settings = loadSettings();

  function loadSettings() {
    try {
      const raw = JSON.parse(localStorage.getItem(SET_KEY));
      return Object.assign({}, DEFAULTS, raw || {});
    } catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function persist() { localStorage.setItem(SET_KEY, JSON.stringify(settings)); }

  /* ---------------- 应用设置 ---------------- */
  function applySettings() {
    const html = document.documentElement;
    html.setAttribute('data-theme', settings.theme);
    html.setAttribute('data-accent', settings.accent);
    html.setAttribute('data-anim', settings.animations ? 'on' : 'off');
    document.body.classList.toggle('theme-glass', !!settings.glass);

    const wp = wallpapers[settings.wallpaper] || wallpapers[0];
    const wall = document.getElementById('wallpaper');
    if (wall) wall.style.background = wp.bg;

    html.style.setProperty('--wall-brightness', String(settings.brightness / 100));

    if (K.desktop) K.desktop.renderDesktopIcons();
    persist();
  }

  /* ---------------- 侧重设置 ---------------- */
  function setTheme(t) { settings.theme = t; applySettings(); if (K.desktop) K.desktop.renderActionCenter(); }
  function getTheme() { return settings.theme; }
  function setAccent(a) { settings.accent = a; applySettings(); }
  function setWallpaper(i) { settings.wallpaper = ((i % wallpapers.length) + wallpapers.length) % wallpapers.length; applySettings(); }
  function setBrightness(v) { settings.brightness = v; applySettings(); }
  function setVolume(v) { settings.volume = v; persist(); }

  function uptimeText() {
    const s = Math.floor((Date.now() - BOOT_TIME) / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h ? h + ' 小时 ' : '') + (m ? m + ' 分 ' : '') + sec + ' 秒';
  }
  function bootTimeText() {
    return new Date(BOOT_TIME).toLocaleString('zh-CN', { hour12: false });
  }

  /* ---------------- 电源 ---------------- */
  function shutdown() {
    const veil = el('div', { class: 'shutdown-veil' }, [
      el('img', { src: 'assets/logo.png', style: { width: '64px', height: '64px', borderRadius: '16px' } }),
      el('div', { class: 'spinner' }),
      el('div', { text: '正在关机…' })
    ]);
    document.body.appendChild(veil);
    requestAnimationFrame(() => veil.classList.add('show'));
    setTimeout(() => {
      document.querySelector('.shutdown-veil div:last-child').textContent = '已关机。点击任意处重新启动。';
      document.querySelector('.spinner').style.display = 'none';
      veil.addEventListener('click', () => location.reload());
    }, 2200);
  }
  function reboot() {
    const veil = el('div', { class: 'shutdown-veil' }, [
      el('div', { class: 'spinner' }),
      el('div', { text: '正在重启…' })
    ]);
    document.body.appendChild(veil);
    requestAnimationFrame(() => veil.classList.add('show'));
    setTimeout(() => location.reload(), 1400);
  }

  /* ---------------- 睡眠（屏保） ---------------- */
  function sleep() {
    const wp = wallpapers[settings.wallpaper] || wallpapers[0];
    const screen = el('div', { class: 'sleep-screen' }, [
      el('div', { class: 'sleep-bg', style: { background: wp.bg } }),
      el('div', { class: 'sleep-content' }, [
        el('div', { class: 'sleep-time', id: 'sleep-time' }),
        el('div', { class: 'sleep-date', id: 'sleep-date' }),
        el('div', { class: 'sleep-hint', text: '点击或按任意键唤醒' })
      ])
    ]);
    document.body.appendChild(screen);

    const tick = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const timeEl = document.getElementById('sleep-time');
      if (timeEl) timeEl.textContent = hh + ':' + mm + ':' + ss;
      const dateEl = document.getElementById('sleep-date');
      if (dateEl) dateEl.textContent = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    };
    tick();
    const timer = setInterval(tick, 1000);

    requestAnimationFrame(() => screen.classList.add('show'));

    let waking = false;
    const wake = () => {
      if (waking) return;
      waking = true;
      clearInterval(timer);
      screen.classList.remove('show');
      setTimeout(() => screen.remove(), 400);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
    setTimeout(() => {
      window.addEventListener('pointerdown', wake);
      window.addEventListener('keydown', wake);
    }, 300);
  }

  /* ---------------- 快捷键 ---------------- */
  function bindShortcuts() {
    window.addEventListener('keydown', e => {
      const mod = e.ctrlKey || e.metaKey;
      // F4 启动台
      if (e.key === 'F4') { e.preventDefault(); K.desktop.toggleLaunchpad(); return; }
      // Alt+Tab 切换窗口
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        const wins = K.WM.windows.filter(w => !w.state.minimized);
        if (!wins.length) return;
        const cur = wins.findIndex(w => w.focused);
        const next = wins[(cur + 1) % wins.length];
        K.WM.focus(next);
        return;
      }
      if (mod && e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 't') { e.preventDefault(); K.WM.open('terminal'); }
        if (k === 'e') { e.preventDefault(); K.WM.open('files'); }
        if (k === 'b') { e.preventDefault(); K.WM.open('browser'); }
        if (k === 'n') { e.preventDefault(); K.WM.open('notes'); }
        if (k === 'l') { e.preventDefault(); K.WM.open('settings'); }
        return;
      }
      // Ctrl+Alt+方向键 分屏
      if (mod && e.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(e.key)) {
        const w = K.WM.getFocused();
        if (!w) return;
        e.preventDefault();
        const wa = K.WM.workArea();
        if (e.key === 'ArrowUp') { K.WM.toggleMax(w); return; }
        w.state.prev = { x: w.state.x, y: w.state.y, w: w.state.w, h: w.state.h };
        Object.assign(w.state, { x: e.key === 'ArrowLeft' ? 0 : wa.w / 2, y: 0, w: wa.w / 2, h: wa.h, maximized: false });
        K.WM.apply(w);
      }
      // Esc 关闭面板
      if (e.key === 'Escape') {
        K.desktop.closeStartMenu(); K.desktop.closeActionCenter(); K.desktop.hideContextMenu();
        K.desktop.closeLaunchpad();
      }
      // Ctrl+Alt+Del 电源菜单
      if (e.ctrlKey && e.altKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        shutdown();
      }
    });
  }

  /* ---------------- 引导（终端风格） ---------------- */
  const LOG_LINES_BEFORE = [
    'INITIALIZING KERNEL',
    'LOADING DEVICE DRIVERS',
    'MOUNTING VIRTUAL FILESYSTEM',
    'STARTING SYSTEM SERVICES'
  ];
  const LOG_LINES_AFTER = [
    'LOADING WINDOW MANAGER',
    'INITIALIZING DOCK',
    'APPLYING THEME & WALLPAPER',
    'REGISTERING APPLICATIONS',
    'STARTING DESKTOP ENVIRONMENT'
  ];

  function fmtTime(d) {
    const p = n => String(n).padStart(2, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function addLogLine(containerId, msg, delay) {
    setTimeout(() => {
      const box = document.getElementById(containerId);
      if (!box) return;
      const line = document.createElement('div');
      line.className = 'boot-log-line';
      line.innerHTML = '<span class="boot-log-time">' + fmtTime(new Date()) + '</span><span class="boot-log-msg">' + msg + ' ...</span>';
      box.appendChild(line);
    }, delay);
  }

  let booted = false;
  function boot() {
    if (booted) return; booted = true;
    const start = Date.now();
    const DURATION = 6000;

    // 逐条输出日志
    LOG_LINES_BEFORE.forEach((msg, i) => addLogLine('boot-logs', msg, i * 400));
    LOG_LINES_AFTER.forEach((msg, i) => addLogLine('boot-logs2', msg, 1800 + i * 400));

    const timer = setInterval(() => {
      if (Date.now() - start >= DURATION) {
        clearInterval(timer);
        setTimeout(finishBoot, 300);
      }
    }, 100);
  }

  function finishBoot() {
    const bootEl = document.getElementById('boot-screen');
    bootEl.classList.add('leaving');
    document.body.classList.remove('booting');
    const desk = document.getElementById('desktop');
    desk.hidden = false;

    K.WM.init();
    K.desktop.init();
    applySettings();
    bindShortcuts();

    setTimeout(() => {
      bootEl.remove();
      K.desktop.notify({ title: '欢迎使用 KevinOS', body: '点击底部 Dock 或左上角 Kevin 菜单探索系统。', icon: 'about' });
      K.desktop.notify({ title: '小提示', body: '拖动窗口到屏幕边缘可以自动分屏；右键桌面可新建文件与文件夹。', silent: false });
    }, 520);
  }

  K.system = {
    settings, getTheme, setTheme, setAccent, setWallpaper, setBrightness, setVolume,
    applySettings, uptimeText, bootTimeText, shutdown, reboot, sleep,
    wallpapers, boot
  };

  window.addEventListener('load', boot);
  if (document.readyState === 'complete') boot();
})();