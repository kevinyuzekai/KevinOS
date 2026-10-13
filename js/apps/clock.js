/* ============================================================
 * KevinOS · 时钟（可安装应用）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  K.registerApp({
    id: 'clock', name: '时钟', icon: 'calendar',
    gradient: ['#4338CA', '#7C7CF5'], category: '工具',
    size: { w: 480, h: 560 },
    mount(win) {
      const tabs = el('div', { class: 'clock-tabs' });
      const view = el('div', { class: 'clock-view' });
      const root = el('div', { class: 'app-col clock-root' }, [tabs, view]);
      win.body.appendChild(root);

      let swTimer = null, swStart = 0, swElapsed = 0;
      let tmTimer = null, tmEnd = 0;

      const TABS = [
        { id: 'time', name: '时钟' },
        { id: 'stopwatch', name: '秒表' },
        { id: 'timer', name: '倒计时' }
      ];

      TABS.forEach(t => {
        const b = el('button', { class: 'clock-tab' + (t.id === 'time' ? ' active' : ''), text: t.name });
        b.addEventListener('click', () => { tabs.querySelectorAll('.clock-tab').forEach(x => x.classList.remove('active')); b.classList.add('active'); showTab(t.id); });
        tabs.appendChild(b);
      });

      function showTab(id) {
        view.innerHTML = '';
        if (id === 'time') buildClock();
        else if (id === 'stopwatch') buildStopwatch();
        else buildTimer();
      }

      function buildClock() {
        const wrap = el('div', { class: 'clock-face' });
        const timeEl = el('div', { class: 'clock-time' });
        const dateEl = el('div', { class: 'clock-date' });
        wrap.append(timeEl, dateEl);
        view.appendChild(wrap);
        const tick = () => {
          const d = new Date();
          const p = n => String(n).padStart(2, '0');
          timeEl.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
          dateEl.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${'日一二三四五六'[d.getDay()]}`;
        };
        tick();
        view._timer = setInterval(tick, 1000);
      }

      function buildStopwatch() {
        const wrap = el('div', { class: 'clock-face' });
        const display = el('div', { class: 'clock-time', text: '00:00.00' });
        const btns = el('div', { class: 'clock-btns' });
        const startBtn = el('button', { class: 'btn primary', text: '开始' });
        const resetBtn = el('button', { class: 'btn', text: '重置' });
        btns.append(startBtn, resetBtn);
        wrap.append(display, btns);
        view.appendChild(wrap);

        function fmt(ms) {
          const m = Math.floor(ms / 60000);
          const s = Math.floor((ms % 60000) / 1000);
          const cs = Math.floor((ms % 1000) / 10);
          return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
        }
        function update() { display.textContent = fmt(swElapsed + (swTimer ? Date.now() - swStart : 0)); }

        startBtn.addEventListener('click', () => {
          if (swTimer) {
            swElapsed += Date.now() - swStart;
            clearInterval(swTimer); swTimer = null;
            startBtn.textContent = '继续';
          } else {
            swStart = Date.now();
            swTimer = setInterval(update, 16);
            startBtn.textContent = '暂停';
          }
        });
        resetBtn.addEventListener('click', () => {
          if (swTimer) { clearInterval(swTimer); swTimer = null; }
          swElapsed = 0; display.textContent = '00:00.00'; startBtn.textContent = '开始';
        });
      }

      function buildTimer() {
        const wrap = el('div', { class: 'clock-face' });
        const display = el('div', { class: 'clock-time', text: '00:00' });
        const presetRow = el('div', { class: 'clock-btns' });
        [60, 180, 300, 600].forEach(s => {
          const b = el('button', { class: 'btn', text: s >= 60 ? (s / 60) + '分' : s + '秒' });
          b.addEventListener('click', () => { tmEnd = Date.now() + s * 1000; runTimer(); });
          presetRow.appendChild(b);
        });
        const customRow = el('div', { class: 'clock-btns' });
        const minIn = el('input', { type: 'number', placeholder: '分', value: '1', class: 'clock-num', style: { width: '60px' } });
        const startBtn = el('button', { class: 'btn primary', text: '开始' });
        const stopBtn = el('button', { class: 'btn', text: '停止' });
        customRow.append(el('span', { text: '自定义：' }), minIn, el('span', { text: '分' }), startBtn, stopBtn);
        wrap.append(display, presetRow, customRow);
        view.appendChild(wrap);

        function runTimer() {
          if (tmTimer) clearInterval(tmTimer);
          tmTimer = setInterval(() => {
            const left = Math.max(0, tmEnd - Date.now());
            const m = Math.floor(left / 60000);
            const s = Math.floor((left % 60000) / 1000);
            display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            if (left <= 0) { clearInterval(tmTimer); tmTimer = null; K.desktop.notify({ title: '时钟', body: '倒计时结束！', icon: 'calendar' }); }
          }, 250);
        }
        startBtn.addEventListener('click', () => { const m = Math.max(1, parseInt(minIn.value) || 1); tmEnd = Date.now() + m * 60000; runTimer(); });
        stopBtn.addEventListener('click', () => { if (tmTimer) { clearInterval(tmTimer); tmTimer = null; } display.textContent = '00:00'; });
      }

      showTab('time');
      win.onClose = () => { if (view._timer) clearInterval(view._timer); if (swTimer) clearInterval(swTimer); if (tmTimer) clearInterval(tmTimer); };
    }
  });
})();
