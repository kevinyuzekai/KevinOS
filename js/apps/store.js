/* ============================================================
 * KevinOS · 应用商店
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  const DESCS = {
    browser: '内置多标签网页浏览器，支持搜索与书签。',
    files: '图形化文件管理器，支持新建、复制、移动、导入与拖拽整理。',
    terminal: 'KevinOS Shell，30+ 命令，可操控文件系统与系统设置。',
    editor: '轻量文本编辑器，支持打开 / 保存 / 另存为与自动换行。',
    calculator: '支持键盘输入的表达式计算器。',
    photos: '图片查看器，支持缩放、旋转与幻灯片式翻页。',
    media: '媒体播放器，内置合成音乐引擎与实时频谱可视化。',
    calendar: '日历与日程管理，双击日期即可添加事件。',
    notes: '便签应用，自动保存，支持搜索与多便签管理。',
    settings: '系统设置：主题、强调色、壁纸、亮度与音量。',
    about: '查看 KevinOS 的版本与硬件信息。',
    weather: '查看任意城市的实时天气、逐小时与未来 7 天预报。',
    code: '类 VS Code 代码编辑器：文件树、多标签、语法高亮与命令面板。',
    office: 'KevinOffice 办公套件：文字、表格、演示与 PDF，兼容 WPS 主要功能。'
  };

  K.registerApp({
    id: 'store', name: '应用商店', icon: 'store',
    gradient: ['#f5b942', '#ff8a3d'], pinned: true, category: '系统',
    size: { w: 880, h: 620 },
    mount(win) {
      const hero = el('div', { class: 'store-hero' }, [
        el('img', { src: 'assets/logo.png' }),
        el('div', {}, [
          el('h2', { text: '欢迎来到 KevinOS 应用商店' }),
          el('p', { text: '所有应用均为系统内置，点击「打开」即可运行。' })
        ])
      ]);
      const listEl = el('div', { class: 'store-list' });
      const root = el('div', { class: 'app-col store' }, [hero, listEl]);

      K.apps.allApps().filter(a => a.id !== 'store').forEach(app => {
        const card = el('div', { class: 'store-card' }, [
          K.apps.appIconEl(app),
          el('div', { class: 'sc-info' }, [
            el('div', { class: 'sc-name', text: app.name }),
            el('div', { class: 'sc-desc', text: DESCS[app.id] || 'KevinOS 内置应用' })
          ]),
          (() => {
            const b = el('button', { class: 'btn primary', text: '打开', style: { height: '34px', padding: '0 16px' } });
            b.addEventListener('click', () => K.WM.open(app.id));
            return b;
          })()
        ]);
        listEl.appendChild(card);
      });

      win.body.appendChild(root);
    }
  });
})();