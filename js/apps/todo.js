/* ============================================================
 * KevinOS · 待办事项（可安装应用）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;
  const STORE_KEY = 'kevinos-todos';

  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; } }
  function save(list) { localStorage.setItem(STORE_KEY, JSON.stringify(list)); }

  K.registerApp({
    id: 'todo', name: '待办', icon: 'todo', installable: true,
    gradient: ['#0A7A50', '#34D399'], category: '效率',
    size: { w: 560, h: 640 },
    mount(win) {
      let todos = load();
      const list = el('div', { class: 'todo-list' });
      const input = el('input', { class: 'todo-input', placeholder: '添加新任务，回车确认…' });

      function render() {
        list.innerHTML = '';
        if (!todos.length) {
          list.appendChild(el('div', { class: 'todo-empty', text: '暂无任务，添加一个吧～' }));
          win.setSub('0 项待办');
          return;
        }
        todos.forEach((t, i) => {
          const cb = el('input', { type: 'checkbox' });
          if (t.done) cb.checked = true;
          cb.addEventListener('change', () => { todos[i].done = cb.checked; save(todos); render(); });
          const del = el('button', { class: 'todo-del', html: '×', title: '删除' });
          del.addEventListener('click', () => { todos.splice(i, 1); save(todos); render(); });
          const item = el('div', { class: 'todo-item' + (t.done ? ' done' : '') }, [
            cb, el('span', { class: 'todo-text', text: t.text }), del
          ]);
          list.appendChild(item);
        });
        win.setSub(`${todos.filter(t => !t.done).length} 项待办`);
      }

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && input.value.trim()) {
          todos.push({ text: input.value.trim(), done: false, time: Date.now() });
          input.value = ''; save(todos); render();
        }
      });

      const header = el('div', { class: 'todo-header' }, [el('h2', { text: '待办事项' })]);
      const root = el('div', { class: 'app-col todo-root' }, [header, list, el('div', { class: 'todo-input-row' }, [input])]);
      win.body.appendChild(root);
      render();
    }
  });
})();
