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
    office: 'KOffice 办公套件：文字、表格、演示与 PDF，兼容 WPS 主要功能。',
    ai: 'AI 助手，支持多服务商与 Agent 模式操作系统。',
    paint: '画板应用，支持自由绘制、多色画笔与保存为 PNG。',
    todo: '待办事项，支持添加、勾选、删除与自动保存。',
    music: '本地音乐播放器，支持导入音频文件、播放列表与音量控制。',
    gallery: '图片相册，自动扫描 Pictures 与桌面的图片文件。',
    translate: '多语言翻译，支持 10 种语言互译（MyMemory API）。',
    reader: '文本与 Markdown 阅读器，自动扫描 Documents 文档。',
    passwords: '密码管理器，本地加密存储网站账号密码。',
    archive: '文本压缩解压，基于 LZ77 算法。',
    recorder: '屏幕录制，支持录制桌面并导出 WebM 视频。',
    screenshot: '截图工具，截取桌面或当前窗口并保存为 PNG。',
    converter: '单位换算器，支持长度/重量/温度/面积等 8 种类别。',
    qrcode: '二维码生成器，输入文本生成可下载的二维码图片。'
  };

  K.registerApp({
    id: 'store', name: '应用商店', icon: 'store',
    gradient: ['#f5b942', '#ff8a3d'], pinned: true, category: '系统',
    size: { w: 880, h: 680 },
    mount(win) {
      const hero = el('div', { class: 'store-hero' }, [
        el('img', { src: 'assets/logo.png' }),
        el('div', {}, [
          el('h2', { text: 'KevinOS 应用商店' }),
          el('p', { text: '浏览并安装应用，所有应用均在本地运行。' })
        ])
      ]);

      const tabs = el('div', { class: 'store-tabs' });
      const tabAll = el('button', { class: 'store-tab active', text: '全部' });
      const tabInstalled = el('button', { class: 'store-tab', text: '已安装' });
      const tabAvailable = el('button', { class: 'store-tab', text: '可安装' });
      tabs.append(tabAll, tabInstalled, tabAvailable);

      const listEl = el('div', { class: 'store-list' });
      const root = el('div', { class: 'app-col store' }, [hero, tabs, listEl]);

      let currentTab = 'all';

      function renderList() {
        listEl.innerHTML = '';
        const apps = K.apps.allApps().filter(a => a.id !== 'store').sort((a, b) => {
          if (a.installable !== b.installable) return a.installable ? 1 : -1;
          return a.name.localeCompare(b.name, 'zh');
        });

        const filtered = apps.filter(a => {
          if (currentTab === 'installed') return K.apps.isInstalled(a.id);
          if (currentTab === 'available') return a.installable && !K.apps.isInstalled(a.id);
          return true;
        });

        filtered.forEach(app => {
          const installed = K.apps.isInstalled(app.id);
          const card = el('div', { class: 'store-card' }, [
            K.apps.appIconEl(app),
            el('div', { class: 'sc-info' }, [
              el('div', { class: 'sc-name', text: app.name }),
              el('div', { class: 'sc-desc', text: DESCS[app.id] || 'KevinOS 应用' }),
              app.installable ? el('div', { class: 'sc-tag', text: installed ? '已安装' : '可安装' }) : el('div', { class: 'sc-tag system', text: '系统应用' })
            ]),
            (() => {
              const btnWrap = el('div', { class: 'sc-actions' });
              if (installed) {
                const openBtn = el('button', { class: 'btn primary', text: '打开' });
                openBtn.addEventListener('click', () => K.WM.open(app.id));
                btnWrap.appendChild(openBtn);
                if (app.installable) {
                  const unBtn = el('button', { class: 'btn', text: '卸载' });
                  unBtn.addEventListener('click', () => {
                    if (confirm(`确定卸载「${app.name}」吗？`)) {
                      K.apps.uninstallApp(app.id);
                      K.desktop.notify({ title: '应用商店', body: `已卸载 ${app.name}`, icon: 'store' });
                      renderList();
                    }
                  });
                  btnWrap.appendChild(unBtn);
                }
              } else if (app.installable) {
                const instBtn = el('button', { class: 'btn primary', text: '安装' });
                instBtn.addEventListener('click', () => {
                  K.apps.installApp(app.id);
                  K.desktop.notify({ title: '应用商店', body: `已安装 ${app.name}`, icon: 'store' });
                  renderList();
                });
                btnWrap.appendChild(instBtn);
              } else {
                const openBtn = el('button', { class: 'btn primary', text: '打开' });
                openBtn.addEventListener('click', () => K.WM.open(app.id));
                btnWrap.appendChild(openBtn);
              }
              return btnWrap;
            })()
          ]);
          listEl.appendChild(card);
        });

        if (!filtered.length) {
          listEl.appendChild(el('div', { class: 'store-empty', text: currentTab === 'available' ? '暂无可安装的应用' : '暂无应用' }));
        }
      }

      [tabAll, tabInstalled, tabAvailable].forEach(t => {
        t.addEventListener('click', () => {
          tabs.querySelectorAll('.store-tab').forEach(x => x.classList.remove('active'));
          t.classList.add('active');
          currentTab = t === tabAll ? 'all' : (t === tabInstalled ? 'installed' : 'available');
          renderList();
        });
      });

      win.body.appendChild(root);
      renderList();
    }
  });
})();
