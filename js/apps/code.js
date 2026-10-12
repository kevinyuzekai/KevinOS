/* ============================================================
 * KevinOS · 代码编辑器（类 VS Code）
 * 文件资源管理器 + 多标签 + 语法高亮 + 命令面板
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;
  const FS = K.FS;

  /* ---------------- 语法高亮 ---------------- */
  const KW = {
    js: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'new', 'class', 'extends', 'super', 'this', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch',
      'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'delete', 'void', 'yield', 'static', 'true', 'false', 'null', 'undefined'],
    py: ['def', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'class', 'try', 'except', 'finally', 'with',
      'as', 'pass', 'lambda', 'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is', 'async', 'await', 'yield', 'self', 'raise'],
    sh: ['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'echo', 'export', 'return', 'local'],
    json: ['true', 'false', 'null'],
    yaml: ['true', 'false', 'null']
  };
  function langCfg(lang) {
    switch (lang) {
      case 'js': case 'ts': case 'jsx': case 'tsx':
        return { kw: KW.js, lc: ['//'], bc: ['/*', '*/'], str: ['"', "'", '`'] };
      case 'json': return { kw: KW.json, lc: [], bc: [], str: ['"'] };
      case 'css': case 'scss': return { kw: [], lc: [], bc: ['/*', '*/'], str: ['"', "'"] };
      case 'html': case 'xml': case 'svg': return { kw: [], lc: [], bc: ['<!--', '-->'], str: ['"', "'"] };
      case 'py': return { kw: KW.py, lc: ['#'], bc: [], str: ['"', "'"] };
      case 'sh': return { kw: KW.sh, lc: ['#'], bc: [], str: ['"', "'"] };
      case 'yml': case 'yaml': return { kw: KW.yaml, lc: ['#'], bc: [], str: ['"', "'"] };
      case 'md': return { kw: [], lc: [], bc: [], str: [] };
      default: return null;
    }
  }
  function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function highlight(code, lang) {
    const cfg = langCfg(lang);
    if (!cfg) return escHtml(code);
    const n = code.length;
    let out = '', i = 0;
    const isWord = c => /[\w$]/.test(c);
    outer:
    while (i < n) {
      const c = code[i];
      // 块注释
      if (cfg.bc.length === 2 && code.startsWith(cfg.bc[0], i)) {
        const end = code.indexOf(cfg.bc[1], i + cfg.bc[0].length);
        const j = end === -1 ? n : end + cfg.bc[1].length;
        out += '<span class="tk-com">' + escHtml(code.slice(i, j)) + '</span>'; i = j; continue;
      }
      // 行注释
      if (cfg.lc.some(l => code.startsWith(l, i))) {
        let j = code.indexOf('\n', i); if (j === -1) j = n;
        out += '<span class="tk-com">' + escHtml(code.slice(i, j)) + '</span>'; i = j; continue;
      }
      // Markdown 标题
      if (lang === 'md' && c === '#' && (i === 0 || code[i - 1] === '\n')) {
        let j = code.indexOf('\n', i); if (j === -1) j = n;
        out += '<span class="tk-kw">' + escHtml(code.slice(i, j)) + '</span>'; i = j; continue;
      }
      // 字符串
      if (cfg.str.includes(c)) {
        let j = i + 1;
        while (j < n) {
          if (code[j] === '\\') { j += 2; continue; }
          if (code[j] === c) { j++; break; }
          if (code[j] === '\n' && c !== '`') break;
          j++;
        }
        out += '<span class="tk-str">' + escHtml(code.slice(i, j)) + '</span>'; i = j; continue;
      }
      // 数字
      if (/[0-9]/.test(c)) {
        let j = i; while (j < n && /[0-9a-fA-FxX._]/.test(code[j])) j++;
        out += '<span class="tk-num">' + escHtml(code.slice(i, j)) + '</span>'; i = j; continue;
      }
      // 标识符 / 关键字
      if (isWord(c)) {
        let j = i; while (j < n && /[\w$]/.test(code[j])) j++;
        const word = code.slice(i, j);
        const prev = code[i - 1];
        if (cfg.kw.includes(word)) out += '<span class="tk-kw">' + escHtml(word) + '</span>';
        else if (code[j] === '(') out += '<span class="tk-fn">' + escHtml(word) + '</span>';
        else if ((lang === 'html' || lang === 'xml') && (prev === '<' || prev === '/')) out += '<span class="tk-tag">' + escHtml(word) + '</span>';
        else if (lang === 'css' && code[j] === ':') out += '<span class="tk-prop">' + escHtml(word) + '</span>';
        else out += escHtml(word);
        i = j; continue;
      }
      // HTML 尖括号
      if ((lang === 'html' || lang === 'xml' || lang === 'svg') && (c === '<' || c === '>' || c === '/')) {
        out += '<span class="tk-tag">' + escHtml(c) + '</span>'; i++; continue;
      }
      out += escHtml(c); i++;
    }
    return out;
  }

  /* ---------------- 语言 ---------------- */
  const EXT_LANG = {
    js: 'js', mjs: 'js', cjs: 'js', ts: 'ts', jsx: 'jsx', tsx: 'tsx', json: 'json',
    html: 'html', htm: 'html', xml: 'xml', svg: 'svg', css: 'css', scss: 'css',
    md: 'md', markdown: 'md', py: 'py', sh: 'sh', bash: 'sh', yml: 'yml', yaml: 'yml', txt: 'txt'
  };
  function langOf(name) { return EXT_LANG[FS.ext(name)] || 'txt'; }
  const LANG_LABEL = { js: 'JavaScript', ts: 'TypeScript', jsx: 'JavaScript React', tsx: 'TypeScript React', json: 'JSON', html: 'HTML', htm: 'HTML', xml: 'XML', svg: 'SVG', css: 'CSS', md: 'Markdown', py: 'Python', sh: 'Shell', yml: 'YAML', txt: '纯文本' };

  /* ---------------- 注册应用 ---------------- */
  K.registerApp({
    id: 'code', name: '代码编辑器', icon: 'code',
    gradient: ['#0ea5e9', '#2563eb'], pinned: true, category: '开发',
    size: { w: 1040, h: 680 },
    mount(win, args) {
      const state = { docs: [], active: -1, expanded: new Set(['/Home', '/Home/Documents', '/Home/Desktop']), view: 'explorer' };

      /* ----- DOM ----- */
      const tabsEl = el('div', { class: 'cd-tabs' });
      const newBtn = el('button', { class: 'cd-act-btn', title: '新建文件', html: '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>' });
      const saveBtn = el('button', { class: 'cd-act-btn', title: '保存 (Ctrl+S)', html: '<svg viewBox="0 0 24 24"><path d="M5 3h11l3 3v15H5V3zm2 2v4h8V5H7zm5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>' });
      const cmdBtn = el('button', { class: 'cd-act-btn', title: '命令面板 (Ctrl+Shift+P)', html: '<svg viewBox="0 0 24 24"><path d="M4 5h16v2H4zM4 11h16v2H4zM4 17h10v2H4z"/></svg>' });
      const tabsbar = el('div', { class: 'cd-tabsbar' }, [tabsEl, el('div', { class: 'cd-tabsbar-actions' }, [newBtn, saveBtn, cmdBtn])]);

      const sideBody = el('div', { class: 'cd-side-body' });
      const sideTitle = el('div', { class: 'cd-side-title', text: '资源管理器' });
      const side = el('div', { class: 'cd-side' }, [sideTitle, sideBody]);

      const actExplorer = actItem('files', '资源管理器', 'explorer');
      const actSearch = actItem('about', '搜索', 'search');
      const activity = el('div', { class: 'cd-activity' }, [actExplorer, actSearch]);

      const gutterInner = el('div', { class: 'cd-gutter-inner' });
      const gutter = el('div', { class: 'cd-gutter' }, [gutterInner]);
      const hlCode = el('code');
      const hl = el('pre', { class: 'cd-hl', 'aria-hidden': 'true' }, [hlCode]);
      const area = el('textarea', { class: 'cd-area', spellcheck: 'false', wrap: 'off', autocomplete: 'off' });
      const codeMain = el('div', { class: 'cd-code-main' }, [hl, area]);
      const code = el('div', { class: 'cd-code' }, [gutter, codeMain]);
      const status = el('div', { class: 'cd-status' });
      const editor = el('div', { class: 'cd-editor' }, [code, status]);
      const main = el('div', { class: 'cd-main' }, [activity, side, editor]);
      const palette = el('div', { class: 'cd-palette', hidden: 'true' });
      const root = el('div', { class: 'cd' }, [tabsbar, main, palette]);
      win.body.appendChild(root);

      function actItem(icon, title, view) {
        const b = el('button', { class: 'cd-act-item', title, html: `<svg viewBox="0 0 24 24">${K.ICONS[icon]}</svg>` });
        b.addEventListener('click', () => switchView(view));
        return b;
      }

      /* ----- 文档 ----- */
      function doc() { return state.docs[state.active]; }

      function openDoc(path, name) {
        const exist = state.docs.findIndex(d => d.path && d.path === path);
        if (exist >= 0) { state.active = exist; refresh(); return; }
        const content = path ? (FS.readFile(path) || '') : '';
        const nm = name || (path ? path.split('/').pop() : '未命名-' + (state.docs.length + 1) + '.txt');
        state.docs.push({ path: path || null, name: nm, content, dirty: false });
        state.active = state.docs.length - 1;
        refresh();
        setTimeout(() => area.focus(), 40);
      }

      function closeDoc(idx) {
        state.docs.splice(idx, 1);
        if (state.active >= state.docs.length) state.active = state.docs.length - 1;
        refresh();
      }

      function saveDoc() {
        const d = doc(); if (!d) return;
        if (!d.path) return saveAs();
        const r = FS.writeFile(d.path, area.value);
        if (!r.ok) return K.WM.UI.alert(r.error, '保存失败');
        d.content = area.value; d.dirty = false;
        K.desktop.notify({ title: '代码编辑器', body: '已保存 ' + d.name });
        refresh();
      }
      async function saveAs() {
        const d = doc(); if (!d) return;
        const def = d.path || '/Home/Documents/' + d.name;
        const p = await K.WM.UI.prompt('保存到路径', def, '另存为');
        if (!p) return;
        const r = FS.writeFile(p, area.value);
        if (!r.ok) return K.WM.UI.alert(r.error, '保存失败');
        d.path = FS.normalize(p); d.name = d.path.split('/').pop();
        d.content = area.value; d.dirty = false;
        refresh();
      }

      /* ----- 渲染 ----- */
      function refresh() {
        renderTabs();
        renderSide();
        renderEditor();
      }

      function renderTabs() {
        tabsEl.innerHTML = '';
        state.docs.forEach((d, i) => {
          const tab = el('div', { class: 'cd-tab' + (i === state.active ? ' active' : '') }, [
            el('span', { class: 'cd-tab-name', text: d.name }),
            el('span', { class: 'cd-tab-dot' + (d.dirty ? ' on' : ''), text: d.dirty ? '●' : '' })
          ]);
          const x = el('span', { class: 'cd-tab-x', text: '✕' });
          x.addEventListener('click', e => { e.stopPropagation(); maybeClose(i); });
          tab.appendChild(x);
          tab.addEventListener('click', () => { state.active = i; refresh(); });
          tabsEl.appendChild(tab);
        });
      }
      function maybeClose(i) {
        const d = state.docs[i];
        if (d.dirty && !window.confirm('「' + d.name + '」有未保存的更改，确定关闭吗？')) return;
        closeDoc(i);
      }

      function renderSide() {
        actExplorer.classList.toggle('active', state.view === 'explorer');
        actSearch.classList.toggle('active', state.view === 'search');
        sideBody.innerHTML = '';
        if (state.view === 'explorer') {
          sideTitle.textContent = '资源管理器';
          buildTree('/Home', 0);
        } else {
          sideTitle.textContent = '搜索';
          const input = el('input', { class: 'search-input', placeholder: '搜索文件…', type: 'text' });
          const results = el('div', { class: 'cd-search-results' });
          sideBody.append(el('div', { style: { padding: '8px' } }, [input]), results);
          const run = () => {
            const q = input.value.trim().toLowerCase();
            results.innerHTML = '';
            if (!q) return;
            const found = [];
            (function walk(p) {
              (FS.list(p) || []).forEach(nd => {
                const np = p + '/' + nd.name;
                if (nd.type === 'folder') { if (found.length < 60) walk(np); }
                else if (nd.name.toLowerCase().includes(q) || (nd.content || '').toLowerCase().includes(q)) found.push({ nd, np });
              });
            })('/Home');
            found.slice(0, 40).forEach(f => {
              const row = el('div', { class: 'cd-file' }, [fileIcon(f.nd.name), el('span', { class: 'cd-file-name', text: f.nd.name })]);
              row.addEventListener('click', () => openDoc(f.np));
              results.appendChild(row);
            });
            if (!found.length) results.appendChild(el('div', { class: 'cd-empty', text: '没有匹配结果' }));
          };
          input.addEventListener('input', run);
          setTimeout(() => input.focus(), 40);
        }
      }

      function buildTree(path, depth) {
        (FS.list(path) || []).forEach(nd => {
          const p = path + '/' + nd.name;
          if (nd.type === 'folder') {
            const open = state.expanded.has(p);
            const row = el('div', { class: 'cd-file dir' }, [
              el('span', { class: 'cd-caret' + (open ? ' open' : ''), text: '▸' }),
              folderIcon(),
              el('span', { class: 'cd-file-name', text: nd.name })
            ]);
            row.style.paddingLeft = (6 + depth * 13) + 'px';
            row.addEventListener('click', () => { open ? state.expanded.delete(p) : state.expanded.add(p); renderSide(); });
            sideBody.appendChild(row);
            if (open) buildTree(p, depth + 1);
          } else {
            const row = el('div', { class: 'cd-file' }, [fileIcon(nd.name), el('span', { class: 'cd-file-name', text: nd.name })]);
            row.style.paddingLeft = (8 + depth * 13) + 'px';
            row.addEventListener('click', () => openDoc(p));
            sideBody.appendChild(row);
          }
        });
      }
      function folderIcon() { return el('span', { class: 'cd-fi folder', html: `<svg viewBox="0 0 24 24">${K.ICONS.files}</svg>` }); }
      function fileIcon(name) {
        const l = langOf(name);
        const cls = l === 'txt' ? 'txt' : l === 'md' ? 'md' : (l === 'json' ? 'json' : 'code');
        return el('span', { class: 'cd-fi ' + cls, html: `<svg viewBox="0 0 24 24">${K.ICONS.editor}</svg>` });
      }

      function renderEditor() {
        const d = doc();
        if (!d) {
          area.value = ''; hlCode.innerHTML = ''; gutterInner.textContent = '';
          area.disabled = true;
          status.innerHTML = '<span>未打开文件 — 从左侧选择或新建</span>';
          win.setSub(''); return;
        }
        area.disabled = false;
        if (area.value !== d.content) area.value = d.content;
        updateView();
      }

      function updateView() {
        const d = doc(); if (!d) return;
        const text = area.value;
        const lang = langOf(d.name);
        hlCode.innerHTML = highlight(text, lang) + '\n';
        const lines = text.split('\n').length;
        let g = '';
        for (let i = 1; i <= lines; i++) g += i + '\n';
        gutterInner.textContent = g;
        // 状态栏
        const pos = caretPos();
        status.innerHTML = '';
        status.append(
          el('span', { class: 'cd-st-item', text: (LANG_LABEL[lang] || 'Plain Text') }),
          el('span', { class: 'cd-st-item', text: 'Ln ' + pos.line + ', Col ' + pos.col }),
          el('span', { class: 'cd-st-item', text: 'Spaces: 2' }),
          el('span', { class: 'cd-st-item', text: 'UTF-8' }),
          el('span', { class: 'cd-st-item cd-st-right', text: d.dirty ? '未保存 ●' : '✓ 已保存' })
        );
        win.setSub(d.path ? (d.path.replace('/Home/', '')) : '未保存');
        syncScroll();
      }

      function caretPos() {
        const upTo = area.value.slice(0, area.selectionStart);
        const lines = upTo.split('\n');
        return { line: lines.length, col: lines[lines.length - 1].length + 1 };
      }
      function syncScroll() {
        hl.style.transform = `translate(${-area.scrollLeft}px, ${-area.scrollTop}px)`;
        gutterInner.style.transform = `translateY(${-area.scrollTop}px)`;
      }

      /* ----- 事件 ----- */
      area.addEventListener('input', () => { const d = doc(); if (d) { d.dirty = true; d.content = area.value; } updateView(); renderTabsDirty(); });
      area.addEventListener('scroll', syncScroll);
      area.addEventListener('click', updateView);
      area.addEventListener('keyup', () => {
        const pos = caretPos(); const items = status.querySelectorAll('.cd-st-item');
        if (items[1]) items[1].textContent = 'Ln ' + pos.line + ', Col ' + pos.col;
      });
      area.addEventListener('keydown', e => {
        const mod = e.ctrlKey || e.metaKey;
        if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveDoc(); return; }
        if (mod && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); openPalette(); return; }
        if (e.key === 'Tab') {
          e.preventDefault();
          const s = area.selectionStart;
          area.setRangeText('  ', s, area.selectionEnd, 'end');
          area.dispatchEvent(new Event('input'));
        }
        if (e.key === 'Enter') {
          const upto = area.value.slice(0, area.selectionStart);
          const line = upto.slice(upto.lastIndexOf('\n') + 1);
          const indent = (line.match(/^\s*/) || [''])[0];
          const extra = /[{[(:\]]\s*$/.test(line) ? '  ' : '';
          e.preventDefault();
          area.setRangeText('\n' + indent + extra, area.selectionStart, area.selectionEnd, 'end');
          area.dispatchEvent(new Event('input'));
        }
      });
      function renderTabsDirty() {
        const d = doc(); if (!d) return;
        const tabs = tabsEl.querySelectorAll('.cd-tab');
        const t = tabs[state.active];
        if (!t) return;
        const dot = t.querySelector('.cd-tab-dot');
        if (dot) { dot.textContent = d.dirty ? '●' : ''; dot.classList.toggle('on', d.dirty); }
      }

      newBtn.addEventListener('click', () => openDoc(null));
      saveBtn.addEventListener('click', saveDoc);
      cmdBtn.addEventListener('click', openPalette);

      function switchView(v) {
        state.view = v;
        if (v !== 'explorer') state.expanded.add('/Home');
        renderSide();
      }

      /* ----- 命令面板 ----- */
      const COMMANDS = [
        { label: '新建文件', run: () => openDoc(null) },
        { label: '保存', run: saveDoc },
        { label: '另存为…', run: saveAs },
        { label: '关闭当前标签', run: () => { if (state.active >= 0) maybeClose(state.active); } },
        { label: '切换资源管理器', run: () => switchView('explorer') },
        { label: '搜索文件', run: () => switchView('search') },
        { label: '打开终端', run: () => K.WM.open('terminal') },
        { label: '打开天气', run: () => K.WM.open('weather') }
      ];
      let paletteInput = null;
      function openPalette() {
        palette.hidden = false;
        palette.innerHTML = '';
        paletteInput = el('input', { class: 'cd-palette-input', placeholder: '输入命令…（Esc 关闭）', type: 'text' });
        const list = el('div', { class: 'cd-palette-list' });
        const filter = () => {
          const q = paletteInput.value.trim().toLowerCase();
          list.innerHTML = '';
          COMMANDS.filter(c => !q || c.label.toLowerCase().includes(q)).forEach(c => {
            const row = el('div', { class: 'cd-palette-item' }, [el('span', { text: c.label })]);
            row.addEventListener('click', () => { closePalette(); c.run(); });
            list.appendChild(row);
          });
        };
        paletteInput.addEventListener('input', filter);
        paletteInput.addEventListener('keydown', e => {
          if (e.key === 'Escape') closePalette();
          if (e.key === 'Enter') { const first = list.querySelector('.cd-palette-item'); if (first) first.click(); }
        });
        palette.append(paletteInput, list);
        filter();
        setTimeout(() => paletteInput.focus(), 40);
      }
      function closePalette() { palette.hidden = true; palette.innerHTML = ''; }

      /* ----- 初始化 ----- */
      if (args && args.path) openDoc(args.path);
      else if (args && args.name) openDoc(null, args.name);
      else {
        // 默认打开一个示例文件
        const sample = '/Home/Documents/hello.js';
        if (FS.readFile(sample) != null) openDoc(sample);
        else openDoc(null, 'untitled.js');
      }
      refresh();
      win.onBeforeClose = () => {
        const dirty = state.docs.filter(d => d.dirty);
        if (dirty.length) return window.confirm(dirty.length + ' 个文件有未保存的更改，确定关闭吗？');
        return true;
      };
      win.deliver = a => { if (a && a.path) openDoc(a.path); };
    }
  });
})();