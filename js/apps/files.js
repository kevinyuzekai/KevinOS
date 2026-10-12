/* ============================================================
 * KevinOS · 文件管理器
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el, fmtSize, fmtTime } = K.util;
  const FS = K.FS;

  const PLACES = [
    { name: '主目录', path: '/Home', icon: 'files' },
    { name: '桌面', path: '/Home/Desktop', icon: 'image' },
    { name: '文档', path: '/Home/Documents', icon: 'editor' },
    { name: '图片', path: '/Home/Pictures', icon: 'photos' },
    { name: '音乐', path: '/Home/Music', icon: 'media' },
    { name: '视频', path: '/Home/Videos', icon: 'media' },
    { name: '下载', path: '/Home/Downloads', icon: 'files' },
    { name: '系统', path: '/System', icon: 'settings' }
  ];

  function fileIcon(node) {
    const span = el('span', { class: 'fmi-ico' });
    const wrap = el('span', { class: 'app-ico sm', style: { width: '42px', height: '42px', borderRadius: '11px' } });
    if (node.type === 'folder') {
      wrap.style.background = 'linear-gradient(145deg,#ffc24b,#ff9d2e)';
      wrap.innerHTML = `<svg viewBox="0 0 24 24">${K.ICONS.files}</svg>`;
    } else {
      const kind = FS.kind(node.name);
      const map = {
        image: ['photos', '#4f7cff', '#22d3ee'],
        audio: ['media', '#9b6bff', '#d38fff'],
        code: ['code', '#10b981', '#34d399'],
        text: ['editor', '#64748b', '#94a3b8'],
        doc: ['editor', '#4f7cff', '#7aa2ff'],
        file: ['about', '#64748b', '#94a3b8']
      };
      const [ic, c1, c2] = map[kind] || map.file;
      wrap.style.background = `linear-gradient(145deg,${c1},${c2})`;
      wrap.innerHTML = `<svg viewBox="0 0 24 24">${K.ICONS[ic]}</svg>`;
    }
    span.appendChild(wrap);
    return span;
  }

  function openNode(win, node, path) {
    if (node.type === 'folder') { win.__fm.navigate(path); return; }
    const kind = FS.kind(node.name);
    if (kind === 'image') K.WM.open('photos', { path });
    else if (kind === 'audio') K.WM.open('media', { path });
    else if (kind === 'code') K.WM.open('code', { path });
    else K.WM.open('editor', { path });
  }

  K.registerApp({
    id: 'files', name: '文件管理器', icon: 'files',
    gradient: ['#ffb02e', '#ff8a3d'], pinned: true, category: '系统',
    size: { w: 980, h: 640 },
    mount(win, args) {
      const state = {
        cwd: args.path || '/Home',
        history: [args.path || '/Home'],
        hi: 0,
        selection: new Set(),
        view: 'grid',
        sort: 'name'
      };
      win.__fm = { navigate: p => navigate(p) };

      /* ---- 侧栏 ---- */
      const side = el('div', { class: 'fm-side' });
      side.appendChild(el('div', { class: 'fm-side-title', text: '位置' }));
      const placeEls = [];
      PLACES.forEach(p => {
        const item = el('div', { class: 'fm-side-item' }, [
          K.util.svgIcon(p.icon),
          el('span', { text: p.name })
        ]);
        item.addEventListener('click', () => navigate(p.path));
        side.appendChild(item);
        placeEls.push({ p, item });
      });
      side.appendChild(el('div', { class: 'fm-side-title', text: '存储' }));
      const usageEl = el('div', { class: 'fm-side-item', style: { cursor: 'default' } }, [
        K.util.svgIcon('settings'),
        el('span', { text: '本机存储' })
      ]);
      side.appendChild(usageEl);
      const usageBar = el('div', { class: 'fm-usage' });
      side.appendChild(usageBar);

      /* ---- 工具栏 ---- */
      const backBtn = el('button', { class: 't-btn', title: '后退', html: '<svg viewBox="0 0 24 24"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>' });
      const fwdBtn = el('button', { class: 't-btn', title: '前进', html: '<svg viewBox="0 0 24 24"><path d="M8.6 7.4 10 6l6 6-6 6-1.4-1.4L13.2 12z"/></svg>' });
      const upBtn = el('button', { class: 't-btn', title: '上一级', html: '<svg viewBox="0 0 24 24"><path d="M12 6 5 13h4v5h6v-5h4z"/></svg>' });
      const newFolderBtn = el('button', { class: 't-btn', title: '新建文件夹', html: '<svg viewBox="0 0 24 24"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6zm8 4v3H8v2h3v3h2v-3h3v-2h-3v-3h-2z"/></svg>' });
      const newFileBtn = el('button', { class: 't-btn', title: '新建文件', html: '<svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6V2zm7 1.5V7h3.5L13 3.5zM11 11v3H8v2h3v3h2v-3h3v-2h-3v-3h-2z"/></svg>' });
      const uploadBtn = el('button', { class: 't-btn', title: '导入文件', html: '<svg viewBox="0 0 24 24"><path d="M12 3l5 5h-3v6h-4V8H7zM5 18h14v2H5z"/></svg>' });
      const pathBar = el('div', { class: 'path-bar' });
      const searchInput = el('input', { class: 'search-input', type: 'text', placeholder: '搜索当前目录…' });
      const viewBtn = el('button', { class: 't-btn', title: '切换视图', html: '<svg viewBox="0 0 24 24"><path d="M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 13h6v6H4v-6zm10 0h6v6h-6v-6z"/></svg>' });
      const toolbar = el('div', { class: 'toolbar' }, [backBtn, fwdBtn, upBtn, pathBar, newFolderBtn, newFileBtn, uploadBtn, searchInput, viewBtn]);

      const fileInput = el('input', { type: 'file', multiple: '', style: { display: 'none' } });

      /* ---- 主区 ---- */
      const grid = el('div', { class: 'fm-grid' });
      const status = el('div', { class: 'fm-status' });
      const main = el('div', { class: 'fm-main' }, [grid, status]);
      const root = el('div', { class: 'app-col' }, [
        toolbar,
        el('div', { class: 'app-row' }, [side, main]),
        fileInput
      ]);

      /* ---- 面包屑 ---- */
      function renderPath() {
        pathBar.innerHTML = '';
        const parts = state.cwd.split('/').filter(Boolean);
        const crumb = (label, path, last) => {
          const c = el('span', { class: 'path-crumb' + (last ? ' last' : ''), text: label });
          c.addEventListener('click', () => navigate(path));
          return c;
        };
        pathBar.appendChild(crumb('🏠 此电脑', '/Home', parts.length === 0));
        let acc = '';
        parts.forEach((p, i) => {
          acc += '/' + p;
          pathBar.appendChild(el('span', { class: 'path-sep', text: '›' }));
          pathBar.appendChild(crumb(p, acc, i === parts.length - 1));
        });
      }

      /* ---- 排序 ---- */
      function sortNodes(arr) {
        return arr.slice().sort((a, b) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
          if (state.sort === 'size') return (b.size || 0) - (a.size || 0);
          if (state.sort === 'date') return b.modified - a.modified;
          return a.name.localeCompare(b.name, 'zh');
        });
      }

      /* ---- 渲染列表 ---- */
      function render() {
        renderPath();
        placeEls.forEach(({ p, item }) => item.classList.toggle('active', p.path === state.cwd));
        grid.className = 'fm-grid' + (state.view === 'list' ? ' list-view' : '');
        grid.innerHTML = '';

        let nodes = FS.list(state.cwd) || [];
        const q = searchInput.value.trim().toLowerCase();
        if (q) nodes = nodes.filter(n => n.name.toLowerCase().includes(q));
        nodes = sortNodes(nodes);

        backBtn.disabled = state.hi <= 0;
        fwdBtn.disabled = state.hi >= state.history.length - 1;
        upBtn.disabled = state.cwd === '/' || state.cwd === '/Home';

        if (!nodes.length) {
          grid.appendChild(el('div', { class: 'fm-empty', text: q ? '没有匹配的项目' : '此文件夹为空' }));
        }

        nodes.forEach(node => {
          const path = (state.cwd === '/' ? '' : state.cwd) + '/' + node.name;
          const item = el('div', { class: 'fm-item' + (state.selection.has(path) ? ' selected' : '') }, [
            fileIcon(node),
            el('div', { class: 'fmi-name', text: node.name })
          ]);
          if (state.view === 'list') {
            item.appendChild(el('div', { class: 'fmi-meta', text: node.type === 'folder' ? '文件夹' : fmtSize(node.size) }));
            item.appendChild(el('div', { class: 'fmi-meta', text: fmtTime(node.modified) }));
          }
          item.addEventListener('click', e => {
            if (e.ctrlKey || e.metaKey) { state.selection.has(path) ? state.selection.delete(path) : state.selection.add(path); }
            else { state.selection.clear(); state.selection.add(path); }
            render();
          });
          item.addEventListener('dblclick', () => openNode(win, node, path));
          item.addEventListener('contextmenu', e => {
            e.preventDefault(); e.stopPropagation();
            if (!state.selection.has(path)) { state.selection.clear(); state.selection.add(path); render(); }
            itemMenu(e.clientX, e.clientY, node, path);
          });
          // 拖拽移动
          item.draggable = true;
          item.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', path); e.dataTransfer.effectAllowed = 'move'; });
          if (node.type === 'folder') {
            item.addEventListener('dragover', e => { e.preventDefault(); item.style.background = 'var(--accent-soft)'; });
            item.addEventListener('dragleave', () => { item.style.background = ''; });
            item.addEventListener('drop', e => {
              e.preventDefault(); item.style.background = '';
              const src = e.dataTransfer.getData('text/plain');
              if (!src || src === path) return;
              const r = FS.move(src, path);
              if (!r.ok) K.WM.UI.alert(r.error, '无法移动');
            });
          }
          grid.appendChild(item);
        });

        const total = (FS.list(state.cwd) || []).length;
        const selCount = state.selection.size;
        status.innerHTML = '';
        status.appendChild(el('span', { text: `${total} 个项目` }));
        if (selCount) status.appendChild(el('span', { text: `已选择 ${selCount} 项` }));
        const u = FS.usage();
        status.appendChild(el('span', { text: `共 ${u.folders} 个文件夹 · ${u.files} 个文件 · ${fmtSize(u.bytes)}`, style: { marginLeft: 'auto' } }));

        win.setSub(state.cwd);
        win.setTitle('文件管理器');
      }

      /* ---- 导航 ---- */
      function navigate(path, record) {
        path = FS.normalize(path);
        if (!FS.resolve(path)) { K.WM.UI.alert('路径不存在：' + path, '无法打开'); return; }
        state.cwd = path;
        state.selection.clear();
        searchInput.value = '';
        if (record !== false) { state.history = state.history.slice(0, state.hi + 1); state.history.push(path); state.hi = state.history.length - 1; }
        render();
      }

      /* ---- 操作 ---- */
      async function newFolder() {
        const name = await K.WM.UI.prompt('新建文件夹', '新建文件夹', '新建文件夹');
        if (!name) return;
        const r = FS.mkdir(state.cwd + '/' + name);
        if (!r.ok) K.WM.UI.alert(r.error, '创建失败'); else render();
      }
      async function newFile() {
        const name = await K.WM.UI.prompt('新建文件', '新建文本文档.txt', '新建文件');
        if (!name) return;
        const r = FS.writeFile(state.cwd + '/' + name, '');
        if (!r.ok) K.WM.UI.alert(r.error, '创建失败'); else render();
      }

      function itemMenu(x, y, node, path) {
        const items = [
          { label: '打开', icon: 'about', act: () => openNode(win, node, path) },
          { sep: true },
          { label: '重命名', icon: 'editor', act: async () => { const n = await K.WM.UI.prompt('重命名', node.name, '重命名'); if (n) { const r = FS.rename(path, n); if (!r.ok) K.WM.UI.alert(r.error); else render(); } } },
          { label: '复制', icon: 'files', act: () => { K.clipboard = { op: 'copy', path }; toast('已复制到剪贴板'); } },
          { label: '剪切', icon: 'files', act: () => { K.clipboard = { op: 'cut', path }; toast('已剪切到剪贴板'); } },
          { label: '下载', icon: 'files', act: () => { if (node.type === 'file') downloadNode(node); } },
          { sep: true },
          { label: '删除', icon: 'settings', danger: true, act: async () => { const ok = await K.WM.UI.confirm(`确定删除「${node.name}」吗？`, '删除', { danger: true, okText: '删除' }); if (ok) { FS.remove(path); state.selection.clear(); render(); } } }
        ];
        showCtx(x, y, items);
      }

      function blankMenu(x, y) {
        showCtx(x, y, [
          { label: '新建文件夹', icon: 'files', act: newFolder },
          { label: '新建文件', icon: 'editor', act: newFile },
          { label: '导入文件', icon: 'files', act: () => fileInput.click() },
          { sep: true },
          { label: '粘贴', icon: 'files', disabled: !K.clipboard, act: paste },
          { sep: true },
          { label: '切换视图', icon: 'about', act: () => { state.view = state.view === 'grid' ? 'list' : 'grid'; render(); } },
          { label: '刷新', icon: 'media', act: render }
        ]);
      }

      function paste() {
        if (!K.clipboard) return;
        const { op, path } = K.clipboard;
        const r = op === 'copy' ? FS.copy(path, state.cwd) : FS.move(path, state.cwd);
        if (!r.ok) K.WM.UI.alert(r.error, '粘贴失败');
        else if (op === 'cut') K.clipboard = null;
        render();
      }

      function downloadNode(node) {
        const blob = new Blob([node.content || ''], { type: FS.MIME[FS.ext(node.name)] || 'text/plain' });
        const a = el('a', { href: URL.createObjectURL(blob), download: node.name });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      }

      function showCtx(x, y, items) { K.desktop.showContextMenu(x, y, items); }
      function toast(msg) { K.desktop.notify({ title: '文件管理器', body: msg }); }

      /* ---- 事件 ---- */
      backBtn.addEventListener('click', () => { if (state.hi > 0) { state.hi--; navigate(state.history[state.hi], false); } });
      fwdBtn.addEventListener('click', () => { if (state.hi < state.history.length - 1) { state.hi++; navigate(state.history[state.hi], false); } });
      upBtn.addEventListener('click', () => navigate(state.cwd.split('/').slice(0, -1).join('/') || '/Home'));
      newFolderBtn.addEventListener('click', newFolder);
      newFileBtn.addEventListener('click', newFile);
      uploadBtn.addEventListener('click', () => fileInput.click());
      viewBtn.addEventListener('click', () => { state.view = state.view === 'grid' ? 'list' : 'grid'; render(); });
      searchInput.addEventListener('input', render);
      grid.addEventListener('contextmenu', e => { if (e.target === grid) { e.preventDefault(); state.selection.clear(); render(); blankMenu(e.clientX, e.clientY); } });
      grid.addEventListener('click', e => { if (e.target === grid) { state.selection.clear(); render(); } });

      fileInput.addEventListener('change', () => {
        const files = Array.from(fileInput.files || []);
        if (!files.length) return;
        let pending = files.length;
        files.forEach(f => {
          const isText = /^text\//.test(f.type) || /json|javascript|xml|csv|svg/.test(f.type) ||
            ['txt', 'md', 'js', 'json', 'html', 'css', 'csv', 'log', 'svg'].includes(FS.ext(f.name));
          const reader = new FileReader();
          reader.onload = () => {
            const content = reader.result;
            FS.writeFile(state.cwd + '/' + f.name, content, isText ? null : { dataUrl: content });
            if (--pending === 0) { render(); toast(`已导入 ${files.length} 个文件`); }
          };
          reader.onerror = () => { if (--pending === 0) render(); };
          if (isText) reader.readAsText(f); else reader.readAsDataURL(f);
        });
        fileInput.value = '';
      });

      // FS 变化时刷新（若未被本窗口触发也无妨）
      win.cleanups.push(FS.onChange(() => render()));

      win.body.appendChild(root);
      // 初始路径纠正
      if (!FS.resolve(state.cwd)) state.cwd = '/Home';
      render();
      win.deliver = a => { if (a && a.path) navigate(a.path); };
    }
  });
})();