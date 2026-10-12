/* ============================================================
 * KevinOS · 文本编辑器
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el, fmtTime } = K.util;
  const FS = K.FS;

  K.registerApp({
    id: 'editor', name: '文本编辑器', icon: 'editor',
    gradient: ['#4f7cff', '#7aa2ff'], pinned: false, category: '办公',
    size: { w: 840, h: 620 },
    mount(win, args) {
      let path = args.path || null;
      let dirty = false;

      const newBtn = el('button', { class: 't-btn', title: '新建', html: '<svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6V2zm7 1.5V7h3.5L13 3.5z"/></svg>' });
      const openBtn = el('button', { class: 't-btn', title: '打开', html: '<svg viewBox="0 0 24 24"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/></svg>' });
      const saveBtn = el('button', { class: 't-btn accent', title: '保存', html: '<svg viewBox="0 0 24 24"><path d="M5 3h11l3 3v15H5V3zm2 2v4h8V5H7zm5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>' });
      const saveAsBtn = el('button', { class: 't-btn', title: '另存为', html: '<svg viewBox="0 0 24 24"><path d="M5 3h11l3 3v15H5V3zm2 2v4h6V5H7zm8 11v-2h2v-2h-2V10h-2v2h-2v2h2v2h2z"/></svg>' });
      const wrapBtn = el('button', { class: 't-btn', title: '自动换行', html: '<svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zM4 11h11a2.5 2.5 0 1 1 0 5h-3v-2h3a.5.5 0 0 0 0-1H4zM4 18h6v-2H4z"/></svg>' });
      const pathLabel = el('div', { class: 'ed-status-path', style: { flex: '1', marginLeft: '6px', color: 'var(--text-dim)', fontSize: '12.5px' } });

      const toolbar = el('div', { class: 'toolbar' }, [newBtn, openBtn, saveBtn, saveAsBtn, wrapBtn, pathLabel]);

      const area = el('textarea', { class: 'ed-area', spellcheck: 'false', placeholder: '在此输入文本…' });
      const status = el('div', { class: 'ed-status' });
      const wrap = el('div', { class: 'ed-wrap' }, [area, status]);
      const root = el('div', { class: 'app-col' }, [toolbar, wrap]);

      function renderStatus() {
        const text = area.value;
        const lines = text ? text.split('\n').length : 1;
        status.innerHTML = '';
        status.appendChild(el('span', { text: `${lines} 行` }));
        status.appendChild(el('span', { text: `${text.length} 字符` }));
        status.appendChild(el('span', { text: path ? fmtTime(FS.stat(path) ? FS.stat(path).modified : Date.now()) : '未保存' }));
        status.appendChild(el('span', { text: dirty ? '● 未保存' : '✓ 已保存', style: { marginLeft: 'auto', color: dirty ? 'var(--warn)' : 'var(--good)' } }));
        win.setSub(path ? path.split('/').pop() + (dirty ? ' •' : '') : '未命名');
        pathLabel.textContent = path || '未命名文档';
      }

      function load(p) {
        const c = FS.readFile(p);
        if (c == null) { K.WM.UI.alert('无法打开文件：' + p, '打开失败'); return; }
        path = p; area.value = c; dirty = false; renderStatus();
      }

      function save() {
        if (!path) return saveAs();
        const r = FS.writeFile(path, area.value);
        if (!r.ok) return K.WM.UI.alert(r.error, '保存失败');
        dirty = false; renderStatus();
        K.desktop.notify({ title: '文本编辑器', body: '已保存 ' + path.split('/').pop() });
      }
      async function saveAs() {
        const p = await K.WM.UI.prompt('保存到路径', path || '/Home/Documents/未命名.txt', '另存为');
        if (!p) return;
        const r = FS.writeFile(p, area.value);
        if (!r.ok) return K.WM.UI.alert(r.error, '保存失败');
        path = FS.normalize(p); dirty = false; renderStatus();
      }
      async function openFile() {
        const p = await K.WM.UI.prompt('输入要打开的完整路径', path || '/Home/Documents/欢迎使用 KevinOS.md', '打开文件');
        if (p) load(FS.normalize(p));
      }
      function newFile() {
        if (dirty && !confirmSave()) return;
        path = null; area.value = ''; dirty = false; renderStatus();
      }
      function confirmSave() {
        return window.confirm('当前文档尚未保存，确定要放弃更改吗？');
      }

      area.addEventListener('input', () => { dirty = true; renderStatus(); });
      area.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
        if (e.key === 'Tab') { e.preventDefault(); const s = area.selectionStart; area.setRangeText('  ', s, area.selectionEnd, 'end'); }
      });
      newBtn.addEventListener('click', newFile);
      openBtn.addEventListener('click', openFile);
      saveBtn.addEventListener('click', save);
      saveAsBtn.addEventListener('click', saveAs);
      wrapBtn.addEventListener('click', () => {
        const on = area.style.whiteSpace === 'pre';
        area.style.whiteSpace = on ? 'pre-wrap' : 'pre';
        area.style.overflowWrap = on ? 'break-word' : 'normal';
        wrapBtn.classList.toggle('accent', !on);
      });

      win.onBeforeClose = () => { if (dirty) return window.confirm('文档有未保存的更改，确定要关闭吗？'); return true; };

      win.body.appendChild(root);
      if (path) load(path); else renderStatus();
      setTimeout(() => area.focus(), 80);
      win.deliver = a => { if (a && a.path) load(a.path); };
    }
  });
})();