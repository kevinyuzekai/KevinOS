/* ============================================================
 * KevinOS · 关于本机
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  K.registerApp({
    id: 'about', name: '关于本机', icon: 'about',
    gradient: ['#2C5AE0', '#4F7CFF'], pinned: false, category: '系统',
    size: { w: 440, h: 500 }, resizable: true, single: true,
    mount(win) {
      const root = el('div', { class: 'about' }, [
        el('img', { src: 'assets/logo.png', alt: 'KevinOS' }),
        el('h1', { text: 'KevinOS' }),
        el('div', { class: 'ver', text: '版本 1.0 “Navy”  ·  Build 2026.10' }),
        el('div', { class: 'tagline', text: '一个完全运行在浏览器中的桌面操作系统。内置浏览器、文件管理器、终端、Office 办公套件与全套原生应用，所有数据仅在本次会话中保留。' })
      ]);

      const actions = el('div', { class: 'about-actions' }, [
        (() => { const b = el('button', { class: 'btn primary', text: '打开设置' }); b.addEventListener('click', () => K.WM.open('settings')); return b; })(),
        (() => { const b = el('button', { class: 'btn', text: '打开终端' }); b.addEventListener('click', () => K.WM.open('terminal')); return b; })()
      ]);
      root.appendChild(actions);

      root.appendChild(el('div', { class: 'about-foot', text: '© 2026 KevinOS Project · 用 HTML / CSS / JavaScript 构建' }));

      win.body.appendChild(root);
    }
  });
})();