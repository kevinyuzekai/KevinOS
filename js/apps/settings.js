/* ============================================================
 * KevinOS · 设置
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el, fmtSize } = K.util;
  const FS = K.FS;

  const SECTIONS = [
    { id: 'appearance', name: '个性化', icon: 'image' },
    { id: 'desktop', name: '桌面与任务栏', icon: 'files' },
    { id: 'display', name: '显示与声音', icon: 'media' },
    { id: 'storage', name: '存储', icon: 'about' },
    { id: 'system', name: '系统', icon: 'settings' }
  ];

  function row(title, desc, control) {
    return el('div', { class: 'set-row' }, [
      el('div', { class: 'sr-main' }, [el('div', { class: 'sr-t', text: title }), desc ? el('div', { class: 'sr-d', text: desc }) : null]),
      control
    ]);
  }
  function switchEl(get, set) {
    const s = el('div', { class: 'switch' + (get() ? ' on' : '') });
    s.addEventListener('click', () => { set(!get()); s.classList.toggle('on', get()); });
    return s;
  }

  K.registerApp({
    id: 'settings', name: '设置', icon: 'settings',
    gradient: ['#64748b', '#94a3b8'], pinned: true, category: '系统',
    size: { w: 900, h: 620 },
    mount(win) {
      let current = 'appearance';
      const side = el('div', { class: 'set-side' });
      const main = el('div', { class: 'set-main' });
      const root = el('div', { class: 'app-col' }, [el('div', { class: 'app-row' }, [side, main])]);

      const items = {};
      SECTIONS.forEach(s => {
        const it = el('div', { class: 'set-side-item' }, [K.util.svgIcon(s.icon), el('span', { text: s.name })]);
        it.addEventListener('click', () => { current = s.id; render(); });
        side.appendChild(it);
        items[s.id] = it;
      });

      function render() {
        Object.entries(items).forEach(([id, it]) => it.classList.toggle('active', id === current));
        main.innerHTML = '';
        ({ appearance: renderAppearance, desktop: renderDesktop, display: renderDisplay, storage: renderStorage, system: renderSystem })[current]();
      }

      function renderAppearance() {
        const st = K.system.settings;
        main.append(
          el('div', { class: 'set-h1', text: '个性化' }),
          el('div', { class: 'set-desc', text: '选择主题、强调色与壁纸，打造属于你的桌面。' })
        );

        const modeCtrl = el('div', { class: 'theme-swatches' }, [
          swatchBtn('浅色', st.theme === 'light', '#f1f5f9', () => { K.system.setTheme('light'); render(); }),
          swatchBtn('深色', st.theme === 'dark', '#141c30', () => { K.system.setTheme('dark'); render(); })
        ]);
        main.appendChild(el('div', { class: 'set-group' }, [
          el('div', { class: 'set-group-title', text: '主题模式' }),
          row('主题', '在浅色与深色之间切换', modeCtrl)
        ]));

        const accents = [
          ['blue', '#4f7cff'], ['violet', '#9b6bff'], ['green', '#10b981'], ['pink', '#ff5c8a'], ['orange', '#ff8a3d']
        ];
        const accRow = el('div', { class: 'theme-swatches' });
        accents.forEach(([name, color]) => {
          const sw = el('div', { class: 'swatch' + (st.accent === name ? ' active' : ''), style: { background: color }, title: name });
          sw.addEventListener('click', () => { K.system.setAccent(name); render(); });
          accRow.appendChild(sw);
        });
        main.appendChild(el('div', { class: 'set-group' }, [
          el('div', { class: 'set-group-title', text: '强调色' }),
          row('强调色', '影响按钮、选中态与高亮', accRow)
        ]));

        const wallGrid = el('div', { class: 'wall-grid' });
        K.system.wallpapers.forEach((wp, i) => {
          const wrap = el('div', { class: 'wall-item' });
          const th = el('div', { class: 'wall-thumb' + (st.wallpaper === i ? ' active' : ''), style: { background: wp.bg } });
          th.addEventListener('click', () => { K.system.setWallpaper(i); render(); });
          const cap = el('div', { class: 'wall-cap', text: wp.name + ' · ' + (wp.mode === 'dark' ? '暗' : '浅') });
          wrap.append(th, cap);
          wallGrid.appendChild(wrap);
        });
        main.appendChild(el('div', { class: 'set-group' }, [
          el('div', { class: 'set-group-title', text: '壁纸' }),
          wallGrid
        ]));
      }

      function swatchBtn(label, active, color, onClick) {
        const b = el('div', { class: 'swatch' + (active ? ' active' : ''), style: { background: color, width: 'auto', height: '42px', padding: '0 18px', display: 'grid', placeItems: 'center', color: color === '#141c30' ? '#fff' : '#14203a', fontSize: '12.5px', fontWeight: '600' }, text: label });
        b.addEventListener('click', onClick);
        return b;
      }

      function renderDesktop() {
        const st = K.system.settings;
        main.append(
          el('div', { class: 'set-h1', text: '桌面与任务栏' }),
          el('div', { class: 'set-desc', text: '管理桌面图标、视觉效果与交互。' })
        );
        main.appendChild(el('div', { class: 'set-group' }, [
          row('显示桌面图标', '在桌面上显示应用与文件快捷方式', switchEl(() => st.showDesktopIcons, v => { st.showDesktopIcons = v; K.system.applySettings(); })),
          row('玻璃模糊效果', '窗口与面板使用亚克力背景', switchEl(() => st.glass, v => { st.glass = v; K.system.applySettings(); })),
          row('界面动画', '窗口打开 / 关闭 / 最小化动画', switchEl(() => st.animations, v => { st.animations = v; K.system.applySettings(); })),
          row('窗口吸附', '拖动窗口到屏幕边缘时自动分屏', switchEl(() => st.snap, v => { st.snap = v; K.system.applySettings(); }))
        ]));
      }

      function renderDisplay() {
        const st = K.system.settings;
        const bright = el('input', { type: 'range', min: '40', max: '100', value: st.brightness, style: { width: '200px' } });
        bright.addEventListener('input', () => { K.system.setBrightness(+bright.value); });
        const vol = el('input', { type: 'range', min: '0', max: '100', value: st.volume, style: { width: '200px' } });
        vol.addEventListener('input', () => { K.system.setVolume(+vol.value); });
        main.append(
          el('div', { class: 'set-h1', text: '显示与声音' }),
          el('div', { class: 'set-desc', text: '调整屏幕亮度与系统音量。' })
        );
        main.appendChild(el('div', { class: 'set-group' }, [
          row('屏幕亮度', '降低亮度可使界面更柔和', bright),
          row('系统音量', '媒体播放器的输出音量', vol)
        ]));
      }

      function renderStorage() {
        const u = FS.usage();
        main.append(
          el('div', { class: 'set-h1', text: '存储' }),
          el('div', { class: 'set-desc', text: '文件保存在浏览器的本地存储中（localStorage）。' })
        );
        main.appendChild(el('div', { class: 'set-group' }, [
          row('文件数量', u.files + ' 个文件 · ' + u.folders + ' 个文件夹', el('span', { class: 'sr-t', text: fmtSize(u.bytes) })),
          row('清理数据', '删除所有文件并恢复默认目录结构', (() => {
            const b = el('button', { class: 'btn danger', text: '重置文件系统' });
            b.addEventListener('click', async () => {
              const ok = await K.WM.UI.confirm('确定重置整个文件系统吗？此操作不可撤销。', '重置文件系统', { danger: true, okText: '重置' });
              if (ok) { FS.reset(); K.desktop.notify({ title: '存储', body: '文件系统已重置' }); render(); }
            });
            return b;
          })())
        ]));
      }

      function renderSystem() {
        main.append(
          el('div', { class: 'set-h1', text: '系统' }),
          el('div', { class: 'set-desc', text: '关于 KevinOS 与系统操作。' })
        );
        main.appendChild(el('div', { class: 'set-group' }, [
          el('div', { class: 'kv' }, [el('span', { class: 'k', text: '系统版本' }), el('span', { class: 'v', text: 'KevinOS 1.0 “Navy”' })]),
          el('div', { class: 'kv' }, [el('span', { class: 'k', text: '内核' }), el('span', { class: 'v', text: 'KevinKernel 5.1-web' })]),
          el('div', { class: 'kv' }, [el('span', { class: 'k', text: 'Shell' }), el('span', { class: 'v', text: 'ksh 1.0' })]),
          el('div', { class: 'kv' }, [el('span', { class: 'k', text: '渲染引擎' }), el('span', { class: 'v', text: 'WebEngine / ' + (navigator.userAgent.includes('Firefox') ? 'Gecko' : 'Blink') })]),
          el('div', { class: 'kv' }, [el('span', { class: 'k', text: '启动时间' }), el('span', { class: 'v', text: K.system.bootTimeText() })])
        ]));
        main.appendChild(el('div', { class: 'set-group' }, [
          row('关于本机', '查看 KevinOS 的详细信息', (() => {
            const b = el('button', { class: 'btn', text: '打开"关于"' });
            b.addEventListener('click', () => K.WM.open('about'));
            return b;
          })())
        ]));
      }

      win.body.appendChild(root);
      render();
    }
  });
})();