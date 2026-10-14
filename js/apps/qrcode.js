/* ============================================================
 * KevinOS · 二维码生成器（可安装应用）
 * 基于纯 JS 实现的 QR Code 生成（精简版）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  // 简化的 QR Code 生成（使用外部 API 作为后备，纯前端绘制）
  K.registerApp({
    id: 'qrcode', name: '二维码', icon: 'qrcode', installable: true,
    gradient: ['#4338CA', '#7C7CF5'], category: '工具',
    size: { w: 480, h: 600 },
    mount(win) {
      const input = el('textarea', { class: 'qr-input', placeholder: '输入要生成二维码的文本或网址…', rows: '4' });
      const canvas = el('canvas', { class: 'qr-canvas', width: '256', height: '256' });
      const sizeSel = el('select', { class: 'qr-sel' });
      [128, 192, 256, 320, 384].forEach(s => sizeSel.appendChild(el('option', { value: s, text: s + 'px' })));
      sizeSel.value = '256';
      const genBtn = el('button', { class: 'btn primary', text: '生成二维码' });
      const downloadBtn = el('button', { class: 'btn', text: '↓ 下载', disabled: 'disabled' });

      async function generate() {
        const text = input.value.trim();
        if (!text) { return; }
        const size = parseInt(sizeSel.value);
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');

        // 使用 QR Server API 获取二维码图片（免费、无需 key）
        try {
          const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.drawImage(img, 0, 0, size, size);
            downloadBtn.disabled = false;
          };
          img.onerror = () => {
            // 回退：绘制占位
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = '#000'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('网络错误，无法生成二维码', size / 2, size / 2);
          };
          img.src = url;
        } catch (e) {
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
          ctx.fillStyle = '#f00'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('生成失败: ' + e.message, size / 2, size / 2);
        }
      }

      genBtn.addEventListener('click', generate);
      input.addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter') generate(); });
      downloadBtn.addEventListener('click', () => {
        const a = el('a', { href: canvas.toDataURL('image/png'), download: 'qrcode.png' });
        a.click();
      });

      const root = el('div', { class: 'app-col qr-root' }, [
        el('div', { class: 'qr-header' }, [el('h2', { text: '二维码生成器' })]),
        el('label', { text: '内容' }), input,
        el('div', { class: 'qr-row' }, [el('label', { text: '尺寸' }), sizeSel, genBtn]),
        el('div', { class: 'qr-canvas-wrap' }, [canvas]),
        downloadBtn
      ]);
      win.body.appendChild(root);
    }
  });
})();
