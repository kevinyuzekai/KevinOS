/* ============================================================
 * KevinOS · 截图工具（可安装应用，html2canvas 风格区域截图）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  K.registerApp({
    id: 'screenshot', name: '截图', icon: 'photos', installable: true,
    gradient: ['#10b981', '#059669'], category: '工具',
    size: { w: 600, h: 520 },
    mount(win) {
      const preview = el('img', { class: 'ss-preview', style: { display: 'none' } });
      const statusEl = el('div', { class: 'ss-status', text: '点击下方按钮截取整个桌面或当前窗口' });
      const fullBtn = el('button', { class: 'btn primary', text: '📷 截取桌面' });
      const winBtn = el('button', { class: 'btn', text: '🪟 截取当前窗口' });
      const downloadBtn = el('button', { class: 'btn', text: '↓ 下载图片', disabled: 'disabled' });

      function capture(target) {
        statusEl.textContent = '正在截图…';
        // 使用 SVG foreignObject 方式截图（纯前端，无依赖）
        try {
          const rect = target.getBoundingClientRect();
          const clone = target.cloneNode(true);
          // 内联样式
          const serialize = (node) => {
            if (node.nodeType === 1) {
              const cs = getComputedStyle(node);
              let style = '';
              for (let i = 0; i < cs.length; i++) {
                const prop = cs[i];
                style += `${prop}:${cs.getPropertyValue(prop)};`;
              }
              node.setAttribute('style', style);
            }
            node.childNodes.forEach(serialize);
          };
          serialize(clone);

          const xml = new XMLSerializer().serializeToString(clone);
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
            <foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`;
          const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = rect.width; canvas.height = rect.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            preview.src = canvas.toDataURL('image/png');
            preview.style.display = 'block';
            downloadBtn.disabled = false;
            statusEl.textContent = `截图完成 (${Math.round(rect.width)}×${Math.round(rect.height)})`;
            URL.revokeObjectURL(url);
          };
          img.onerror = () => { statusEl.textContent = '截图失败，请尝试截取桌面'; URL.revokeObjectURL(url); };
          img.src = url;
        } catch (e) {
          statusEl.textContent = '截图失败：' + e.message;
        }
      }

      fullBtn.addEventListener('click', () => capture(document.getElementById('desktop')));
      winBtn.addEventListener('click', () => {
        const w = document.querySelector('.window.focused') || document.querySelector('.window');
        if (w) capture(w); else statusEl.textContent = '没有打开的窗口';
      });
      downloadBtn.addEventListener('click', () => {
        if (preview.src) {
          const a = el('a', { href: preview.src, download: 'kevinos-screenshot-' + Date.now() + '.png' });
          a.click();
        }
      });

      const controls = el('div', { class: 'ss-controls' }, [fullBtn, winBtn, downloadBtn]);
      const root = el('div', { class: 'app-col ss-root' }, [preview, statusEl, controls]);
      win.body.appendChild(root);
    }
  });
})();
