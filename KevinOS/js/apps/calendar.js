/* ============================================================
 * KevinOS · 日历
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  const EV_KEY = 'kevinos.calendar.events';
  function loadEvents() { try { return JSON.parse(localStorage.getItem(EV_KEY)) || {}; } catch (e) { return {}; } }
  function saveEvents(o) { localStorage.setItem(EV_KEY, JSON.stringify(o)); }
  function keyOf(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  K.registerApp({
    id: 'calendar', name: '日历', icon: 'calendar',
    gradient: ['#ff5c8a', '#ff9bb8'], pinned: false, category: '办公',
    size: { w: 700, h: 620 },
    mount(win) {
      let events = loadEvents();
      const today = new Date();
      let viewYear = today.getFullYear();
      let viewMonth = today.getMonth();
      let selected = new Date(today);

      const prevBtn = el('button', { class: 't-btn', html: '<svg viewBox="0 0 24 24"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>' });
      const nextBtn = el('button', { class: 't-btn', html: '<svg viewBox="0 0 24 24"><path d="M8.6 7.4 10 6l6 6-6 6-1.4-1.4L13.2 12z"/></svg>' });
      const todayBtn = el('button', { class: 't-btn', text: '今天' });
      const monthLabel = el('div', { class: 'cal-month' });
      const addBtn = el('button', { class: 't-btn accent', text: '+ 新建日程' });
      const head = el('div', { class: 'cal-head' }, [monthLabel, todayBtn, prevBtn, nextBtn, addBtn]);

      const grid = el('div', { class: 'cal-grid' });
      const list = el('div', { class: 'cal-today-list' });
      const root = el('div', { class: 'app-col cal' }, [head, grid, list]);

      const DOW = ['日', '一', '二', '三', '四', '五', '六'];

      function render() {
        monthLabel.textContent = `${viewYear} 年 ${viewMonth + 1} 月`;
        grid.innerHTML = '';
        DOW.forEach(d => grid.appendChild(el('div', { class: 'cal-dow', text: d })));

        const first = new Date(viewYear, viewMonth, 1);
        const startDow = first.getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const prevDays = new Date(viewYear, viewMonth, 0).getDate();

        const cells = [];
        for (let i = startDow - 1; i >= 0; i--) cells.push({ d: prevDays - i, other: true, date: new Date(viewYear, viewMonth - 1, prevDays - i) });
        for (let d = 1; d <= daysInMonth; d++) cells.push({ d, other: false, date: new Date(viewYear, viewMonth, d) });
        while (cells.length % 7 !== 0) {
          const n = cells.length - (startDow + daysInMonth) + 1;
          cells.push({ d: n, other: true, date: new Date(viewYear, viewMonth + 1, n) });
        }

        cells.forEach(c => {
          const k = keyOf(c.date);
          const cell = el('div', { class: 'cal-day' + (c.other ? ' other' : '') + (k === keyOf(today) ? ' today' : '') + (k === keyOf(selected) && k !== keyOf(today) ? ' sel' : '') }, [el('span', { text: c.d })]);
          if (events[k] && events[k].length) cell.appendChild(el('span', { class: 'evdot' }));
          cell.addEventListener('click', () => { selected = c.date; viewYear = c.date.getFullYear(); viewMonth = c.date.getMonth(); render(); });
          cell.addEventListener('dblclick', () => addEvent(c.date));
          grid.appendChild(cell);
        });

        renderList();
      }

      function renderList() {
        const k = keyOf(selected);
        list.innerHTML = '';
        list.appendChild(el('div', { class: 'ctl-title', text: `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')} 的日程` }));
        const evs = events[k] || [];
        if (!evs.length) list.appendChild(el('div', { class: 'term-dim', style: { fontSize: '12.5px' }, text: '暂无日程，双击日期或点击「新建日程」添加。' }));
        evs.forEach((ev, i) => {
          const row = el('div', { class: 'cal-ev' }, [
            el('span', { class: 'ev-time', text: ev.time || '全天' }),
            el('span', { text: ev.title, style: { flex: '1' } })
          ]);
          const del = el('button', { class: 't-btn', html: '<svg viewBox="0 0 24 24" style="width:14px;height:14px"><path d="M6 7h12v2H6zM9 4h6v2H9zM8 10v8h2v-8zm6 0v8h2v-8z"/></svg>' });
          del.addEventListener('click', () => { evs.splice(i, 1); if (!evs.length) delete events[k]; saveEvents(events); renderList(); render(); });
          row.appendChild(del);
          list.appendChild(row);
        });
      }

      async function addEvent(date) {
        const title = await K.WM.UI.prompt('日程标题', '', '新建日程 ' + keyOf(date || selected));
        if (!title) return;
        const time = await K.WM.UI.prompt('时间（如 14:30，可留空表示全天）', '', '日程时间');
        const k = keyOf(date || selected);
        (events[k] = events[k] || []).push({ title, time: time || '' });
        events[k].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        saveEvents(events);
        selected = date || selected; viewYear = selected.getFullYear(); viewMonth = selected.getMonth();
        render();
      }

      prevBtn.addEventListener('click', () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render(); });
      nextBtn.addEventListener('click', () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render(); });
      todayBtn.addEventListener('click', () => { const n = new Date(); viewYear = n.getFullYear(); viewMonth = n.getMonth(); selected = n; render(); });
      addBtn.addEventListener('click', () => addEvent(selected));

      win.body.appendChild(root);
      render();
    }
  });
})();