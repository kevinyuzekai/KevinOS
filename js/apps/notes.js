/* ============================================================
 * KevinOS · 便签
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el, fmtTime } = K.util;

  const KEY = 'kevinos.notes.v1';
  function load() {
    try { const n = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(n)) return n; } catch (e) {}
    return [
      { id: uid(), title: '欢迎使用便签', body: '在这里记录你的想法。\n\n· 支持自动保存\n· 点击左侧卡片切换便签\n· 使用「新建」创建新便签', modified: Date.now() }
    ];
  }
  function uid() { return 'nt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  K.registerApp({
    id: 'notes', name: '便签', icon: 'notes',
    gradient: ['#f5b942', '#ffd97a'], pinned: false, category: '办公',
    size: { w: 780, h: 560 },
    mount(win) {
      let notes = load();
      let activeId = notes[0] ? notes[0].id : null;
      let saveTimer = null;

      const listElmt = el('div', { class: 'notes-list' });
      const titleInput = el('input', { class: 'notes-title', placeholder: '标题' });
      const bodyInput = el('textarea', { class: 'notes-body', placeholder: '开始输入…' });
      const editor = el('div', { class: 'notes-editor' }, [titleInput, bodyInput]);

      const newBtn = el('button', { class: 't-btn accent', html: '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>', title: '新建便签' });
      const delBtn = el('button', { class: 't-btn', html: '<svg viewBox="0 0 24 24"><path d="M6 7h12v2H6zM9 4h6v2H9zM8 10v8h2v-8zm6 0v8h2v-8z"/></svg>', title: '删除便签' });
      const search = el('input', { class: 'search-input', type: 'text', placeholder: '搜索便签…' });
      const toolbar = el('div', { class: 'toolbar' }, [newBtn, delBtn, search, el('div', { style: { flex: '1' } }), el('span', { style: { fontSize: '12px', color: 'var(--text-dim)' }, id: 'notes-count' })]);

      const root = el('div', { class: 'app-col' }, [toolbar, el('div', { class: 'notes' }, [listElmt, editor])]);

      function persist() { localStorage.setItem(KEY, JSON.stringify(notes)); }

      function active() { return notes.find(n => n.id === activeId); }

      function renderList() {
        const q = search.value.trim().toLowerCase();
        listElmt.innerHTML = '';
        const arr = notes.slice().sort((a, b) => b.modified - a.modified);
        arr.filter(n => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)).forEach(n => {
          const card = el('div', { class: 'note-card' + (n.id === activeId ? ' active' : '') }, [
            el('div', { class: 'nc-title', text: n.title || '无标题' }),
            el('div', { class: 'nc-prev', text: (n.body || '').slice(0, 40) || '空便签' }),
            el('div', { class: 'nc-time', text: fmtTime(n.modified) })
          ]);
          card.addEventListener('click', () => { activeId = n.id; renderList(); renderEditor(); });
          listElmt.appendChild(card);
        });
        const countEl = toolbar.querySelector('#notes-count');
        if (countEl) countEl.textContent = `${notes.length} 条便签`;
      }

      function renderEditor() {
        const n = active();
        if (!n) { titleInput.value = ''; bodyInput.value = ''; titleInput.disabled = bodyInput.disabled = true; return; }
        titleInput.disabled = bodyInput.disabled = false;
        titleInput.value = n.title;
        bodyInput.value = n.body;
        win.setSub(n.title || '无标题');
      }

      function touch() {
        const n = active();
        if (!n) return;
        n.title = titleInput.value;
        n.body = bodyInput.value;
        n.modified = Date.now();
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => { persist(); renderList(); }, 500);
      }
      titleInput.addEventListener('input', touch);
      bodyInput.addEventListener('input', touch);
      search.addEventListener('input', renderList);

      newBtn.addEventListener('click', () => {
        const n = { id: uid(), title: '新便签', body: '', modified: Date.now() };
        notes.unshift(n); activeId = n.id; persist(); renderList(); renderEditor(); titleInput.focus(); titleInput.select();
      });
      delBtn.addEventListener('click', async () => {
        const n = active(); if (!n) return;
        const ok = await K.WM.UI.confirm(`确定删除便签「${n.title || '无标题'}」吗？`, '删除便签', { danger: true, okText: '删除' });
        if (!ok) return;
        notes = notes.filter(x => x.id !== n.id);
        activeId = notes[0] ? notes[0].id : null;
        persist(); renderList(); renderEditor();
      });

      win.body.appendChild(root);
      renderList(); renderEditor();
    }
  });
})();