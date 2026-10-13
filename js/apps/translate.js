/* ============================================================
 * KevinOS · 翻译（可安装应用，使用 MyMemory 免费 API）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  const LANGS = [
    { code: 'zh-CN', name: '中文' }, { code: 'en', name: '英语' },
    { code: 'ja', name: '日语' }, { code: 'ko', name: '韩语' },
    { code: 'fr', name: '法语' }, { code: 'de', name: '德语' },
    { code: 'es', name: '西班牙语' }, { code: 'ru', name: '俄语' },
    { code: 'it', name: '意大利语' }, { code: 'pt', name: '葡萄牙语' }
  ];

  K.registerApp({
    id: 'translate', name: '翻译', icon: 'about', installable: true,
    gradient: ['#06b6d4', '#3b82f6'], category: '工具',
    size: { w: 680, h: 520 },
    mount(win) {
      const srcSel = el('select', { class: 'tr-sel' });
      const dstSel = el('select', { class: 'tr-sel' });
      LANGS.forEach(l => {
        srcSel.appendChild(el('option', { value: l.code, text: l.name }));
        dstSel.appendChild(el('option', { value: l.code, text: l.name }));
      });
      srcSel.value = 'zh-CN'; dstSel.value = 'en';

      const swapBtn = el('button', { class: 'btn', text: '⇄', title: '交换语言' });
      swapBtn.addEventListener('click', () => { const t = srcSel.value; srcSel.value = dstSel.value; dstSel.value = t; });

      const srcBox = el('textarea', { class: 'tr-box', placeholder: '输入要翻译的文本…', rows: '6' });
      const dstBox = el('textarea', { class: 'tr-box', placeholder: '译文将显示在这里…', rows: '6', readonly: 'readonly' });
      const translateBtn = el('button', { class: 'btn primary', text: '翻译' });
      const statusEl = el('div', { class: 'tr-status', text: '' });

      async function doTranslate() {
        const text = srcBox.value.trim();
        if (!text) { statusEl.textContent = '请输入文本'; return; }
        statusEl.textContent = '翻译中…';
        dstBox.value = '';
        try {
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcSel.value}|${dstSel.value}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.responseData && data.responseData.translatedText) {
            dstBox.value = data.responseData.translatedText;
            statusEl.textContent = `翻译完成（${dstBox.value.length} 字符）`;
          } else {
            statusEl.textContent = '翻译失败：' + (data.responseStatus || '未知错误');
          }
        } catch (e) {
          statusEl.textContent = '网络错误，请稍后重试';
        }
      }
      translateBtn.addEventListener('click', doTranslate);
      srcBox.addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter') doTranslate(); });

      const copyBtn = el('button', { class: 'btn', text: '复制译文' });
      copyBtn.addEventListener('click', () => {
        if (dstBox.value) { navigator.clipboard.writeText(dstBox.value).then(() => { statusEl.textContent = '已复制到剪贴板'; }); }
      });

      const top = el('div', { class: 'tr-top' }, [srcSel, swapBtn, dstSel]);
      const boxes = el('div', { class: 'tr-boxes' }, [
        el('div', {}, [srcBox]),
        el('div', {}, [dstBox])
      ]);
      const actions = el('div', { class: 'tr-actions' }, [translateBtn, copyBtn, statusEl]);
      const root = el('div', { class: 'app-col translate-root' }, [top, boxes, actions]);
      win.body.appendChild(root);
    }
  });
})();
