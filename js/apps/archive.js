/* ============================================================
 * KevinOS · 压缩解压（可安装应用，文本压缩）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  // 简易 LZ77 风格压缩
  function compress(str) {
    if (!str) return '';
    let out = '';
    let i = 0;
    while (i < str.length) {
      let bestLen = 0, bestOff = 0;
      const maxOff = Math.min(i, 4096);
      for (let off = 1; off <= maxOff && bestLen < 18; off++) {
        let len = 0;
        while (len < 18 && i + len < str.length && str[i - off + len] === str[i + len]) len++;
        if (len > bestLen) { bestLen = len; bestOff = off; }
      }
      if (bestLen >= 3) {
        out += String.fromCharCode(0x8000 | ((bestOff & 0xFFF) << 4) | (bestLen - 3));
        i += bestLen;
      } else {
        const c = str.charCodeAt(i);
        if (c >= 0x80) out += String.fromCharCode(0x8000) + String.fromCharCode(c);
        else out += str[i];
        i++;
      }
    }
    return out;
  }
  function decompress(str) {
    if (!str) return '';
    let out = '';
    let i = 0;
    while (i < str.length) {
      const c = str.charCodeAt(i);
      if (c & 0x8000) {
        if (c === 0x8000) { out += str[++i]; }
        else {
          const off = (c >> 4) & 0xFFF;
          const len = (c & 0xF) + 3;
          for (let j = 0; j < len; j++) out += out[out.length - off];
        }
      } else {
        out += str[i];
      }
      i++;
    }
    return out;
  }

  K.registerApp({
    id: 'archive', name: '压缩解压', icon: 'files', installable: true,
    gradient: ['#f59e0b', '#d97706'], category: '工具',
    size: { w: 640, h: 560 },
    mount(win) {
      const input = el('textarea', { class: 'arc-input', placeholder: '输入要压缩的文本…', rows: '10' });
      const output = el('textarea', { class: 'arc-output', placeholder: '结果…', rows: '10', readonly: 'readonly' });
      const ratioEl = el('div', { class: 'arc-ratio', text: '' });

      const compBtn = el('button', { class: 'btn primary', text: '压缩' });
      compBtn.addEventListener('click', () => {
        const data = compress(input.value);
        output.value = data;
        const ratio = input.value.length ? ((1 - data.length / input.value.length) * 100).toFixed(1) : 0;
        ratioEl.textContent = `原始: ${input.value.length} 字符 → 压缩后: ${data.length} 字符 (压缩率 ${ratio}%)`;
      });

      const decompBtn = el('button', { class: 'btn', text: '解压' });
      decompBtn.addEventListener('click', () => {
        try {
          output.value = decompress(input.value);
          ratioEl.textContent = `解压完成: ${output.value.length} 字符`;
        } catch (e) { ratioEl.textContent = '解压失败：数据格式错误'; }
      });

      const copyBtn = el('button', { class: 'btn', text: '复制结果' });
      copyBtn.addEventListener('click', () => {
        if (output.value) navigator.clipboard.writeText(output.value);
      });

      const root = el('div', { class: 'app-col archive-root' }, [
        el('div', { class: 'arc-header' }, [el('h2', { text: '压缩解压' }), el('span', { class: 'arc-hint', text: '基于 LZ77 算法的文本压缩' })]),
        el('label', { text: '输入文本' }), input,
        el('div', { class: 'arc-actions' }, [compBtn, decompBtn, copyBtn]),
        el('label', { text: '输出结果' }), output,
        ratioEl
      ]);
      win.body.appendChild(root);
    }
  });
})();
