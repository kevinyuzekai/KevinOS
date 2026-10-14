/* ============================================================
 * KevinOS · 画板（可安装应用）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  K.registerApp({
    id: 'paint', name: '画板', icon: 'paint', installable: true,
    gradient: ['#6D28D9', '#A78BFA'], category: '创意',
    size: { w: 820, h: 600 },
    mount(win) {
      let color = '#4f7cff', size = 4, drawing = false, ctx = null;

      const canvas = el('canvas', { class: 'paint-canvas' });
      const toolbar = el('div', { class: 'paint-toolbar' });

      const colors = ['#000000', '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
      const colorBox = el('div', { class: 'paint-colors' });
      colors.forEach(c => {
        const b = el('button', { class: 'paint-color' + (c === color ? ' active' : ''), style: { background: c }, title: c });
        b.addEventListener('click', () => { color = c; colorBox.querySelectorAll('.paint-color').forEach(x => x.classList.remove('active')); b.classList.add('active'); });
        colorBox.appendChild(b);
      });

      const sizeRange = el('input', { type: 'range', min: '1', max: '40', value: String(size), class: 'paint-size' });
      const sizeLabel = el('span', { class: 'paint-size-label', text: size + 'px' });
      sizeRange.addEventListener('input', () => { size = +sizeRange.value; sizeLabel.textContent = size + 'px'; });

      const clearBtn = el('button', { class: 'btn', text: '清空' });
      clearBtn.addEventListener('click', () => { if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); });

      const saveBtn = el('button', { class: 'btn primary', text: '保存图片' });
      saveBtn.addEventListener('click', () => {
        const link = el('a', { href: canvas.toDataURL('image/png'), download: 'kevinos-paint-' + Date.now() + '.png' });
        link.click();
      });

      toolbar.append(colorBox, sizeRange, sizeLabel, clearBtn, saveBtn);
      const root = el('div', { class: 'app-col paint-root' }, [toolbar, canvas]);
      win.body.appendChild(root);

      setTimeout(() => {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        ctx = canvas.getContext('2d');
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      }, 50);

      function pos(e) {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return { x: t.clientX - r.left, y: t.clientY - r.top };
      }
      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('touchstart', e => { e.preventDefault(); start(e); });
      canvas.addEventListener('mousemove', move);
      canvas.addEventListener('touchmove', e => { e.preventDefault(); move(e); });
      window.addEventListener('mouseup', end);
      window.addEventListener('touchend', end);

      function start(e) { drawing = true; ctx.strokeStyle = color; ctx.lineWidth = size; ctx.beginPath(); const p = pos(e); ctx.moveTo(p.x, p.y); }
      function move(e) { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      function end() { drawing = false; }
    }
  });
})();
