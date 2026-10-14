/* ============================================================
 * KevinOS · 阅读器（可安装应用，支持 txt/md）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;
  const FS = K.FS;

  // 极简 Markdown 渲染
  function mdToHtml(md) {
    return md
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^\> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^\- (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  K.registerApp({
    id: 'reader', name: '阅读器', icon: 'reader', installable: true,
    gradient: ['#B45309', '#FBBF24'], category: '阅读',
    size: { w: 720, h: 600 },
    mount(win) {
      const content = el('div', { class: 'reader-content' });
      const sidebar = el('div', { class: 'reader-sidebar' });
      const root = el('div', { class: 'reader-root' }, [sidebar, content]);
      win.body.appendChild(root);

      const files = [];
      function scan(path) {
        (FS.list(path) || []).forEach(n => {
          if (n.type === 'folder') scan(path + '/' + n.name);
          else {
            const e = (n.name.split('.').pop() || '').toLowerCase();
            if (['txt', 'md'].includes(e)) files.push({ name: n.name, path: path + '/' + n.name });
          }
        });
      }
      function renderSidebar() {
        sidebar.innerHTML = '';
        sidebar.appendChild(el('h3', { text: '文档库' }));
        if (!files.length) {
          sidebar.appendChild(el('div', { class: 'reader-empty', text: 'Documents 中暂无 txt/md 文件' }));
          return;
        }
        files.forEach(f => {
          const item = el('div', { class: 'reader-item', text: f.name });
          item.addEventListener('click', () => open(f));
          sidebar.appendChild(item);
        });
      }
      function open(f) {
        const raw = FS.readFile(f.path) || '';
        const e = (f.name.split('.').pop() || '').toLowerCase();
        content.innerHTML = '';
        const title = el('h1', { class: 'reader-title', text: f.name });
        const body = el('div', { class: 'reader-body' });
        body.innerHTML = e === 'md' ? mdToHtml(raw) : '<p>' + raw.replace(/\n/g, '<br>') + '</p>';
        content.append(title, body);
        win.setSub(f.name);
      }

      scan('/Home/Documents');
      renderSidebar();
    }
  });
})();
