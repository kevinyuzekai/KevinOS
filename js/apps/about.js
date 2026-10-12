/* ============================================================
 * KevinOS · 关于本机
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  K.registerApp({
    id: 'about', name: '关于本机', icon: 'about',
    gradient: ['#1b2a4a', '#24365f'], pinned: false, category: '系统',
    size: { w: 470, h: 640 }, resizable: true, single: true,
    mount(win) {
      const root = el('div', { class: 'about' }, [
        el('img', { src: 'assets/logo.png', alt: 'KevinOS' }),
        el('h1', { text: 'KevinOS' }),
        el('div', { class: 'ver', text: '版本 1.0 “Navy”  ·  Build 2026.10' }),
        el('div', { class: 'tagline', text: '一个完全运行在浏览器中的桌面操作系统。内置浏览器、文件管理器、终端、媒体播放器等全套原生应用，所有数据保存在你的浏览器本地。' })
      ]);

      const actions = el('div', { class: 'about-actions' }, [
        (() => { const b = el('button', { class: 'btn primary', text: '打开设置' }); b.addEventListener('click', () => K.WM.open('settings')); return b; })(),
        (() => { const b = el('button', { class: 'btn', text: '打开终端' }); b.addEventListener('click', () => K.WM.open('terminal')); return b; })()
      ]);
      root.appendChild(actions);

      const info = el('div', { class: 'about-info' });
      [
        ['处理器', 'KevinKernel 5.1-web (单核虚拟)'],
        ['内存', '浏览器堆内存（动态分配）'],
        ['显卡', 'GPU 加速 · CSS Compositor'],
        ['存储', 'localStorage · ' + K.util.fmtSize(K.FS.usage().bytes) + ' 已用'],
        ['分辨率', window.innerWidth + ' × ' + window.innerHeight],
        ['宿主平台', navigator.platform || 'Web Browser'],
        ['启动于', K.system.bootTimeText()]
      ].forEach(([k, v]) => info.appendChild(el('div', { class: 'kv' }, [el('span', { class: 'k', text: k }), el('span', { class: 'v', text: v })])));
      root.appendChild(info);

      root.appendChild(el('div', { class: 'about-foot', text: '© 2026 KevinOS Project · 用 HTML / CSS / JavaScript 构建' }));

      win.body.appendChild(root);
    }
  });
})();