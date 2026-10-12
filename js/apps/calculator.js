/* ============================================================
 * KevinOS · 计算器
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  function evaluate(expr) {
    // 仅允许安全字符
    if (!/^[\d\s+\-*/().%^]+$/.test(expr)) throw new Error('非法字符');
    let e = expr.replace(/\^/g, '**').replace(/%/g, '/100*');
    // 处理尾随运算符
    e = e.replace(/[+\-*/.]+$/, '');
    if (!e.trim()) return 0;
    // eslint-disable-next-line no-new-func
    const v = Function('"use strict";return (' + e + ')')();
    if (typeof v !== 'number' || !isFinite(v)) throw new Error('结果无效');
    return v;
  }

  K.registerApp({
    id: 'calculator', name: '计算器', icon: 'calculator',
    gradient: ['#10b981', '#34d399'], pinned: false, category: '工具',
    size: { w: 340, h: 500 },
    mount(win) {
      let expr = '';
      const screenExpr = el('div', { class: 'calc-expr' });
      const screenOut = el('div', { class: 'calc-out', text: '0' });
      const screen = el('div', { class: 'calc-screen' }, [screenExpr, screenOut]);
      const grid = el('div', { class: 'calc-grid' });
      const root = el('div', { class: 'calc' }, [screen, grid]);

      const keys = [
        ['C', 'fn'], ['⌫', 'fn'], ['%', 'op'], ['÷', 'op'],
        ['7'], ['8'], ['9'], ['×', 'op'],
        ['4'], ['5'], ['6'], ['−', 'op'],
        ['1'], ['2'], ['3'], ['+', 'op'],
        ['±', 'fn'], ['0'], ['.'], ['=', 'eq']
      ];

      function update() {
        screenExpr.textContent = expr || '';
        if (!expr) { screenOut.textContent = '0'; return; }
        try {
          const v = evaluate(expr.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-'));
          screenOut.textContent = format(v);
        } catch (e) {
          screenOut.textContent = '…';
        }
      }
      function format(v) {
        if (Number.isInteger(v)) return String(v);
        const r = Math.round(v * 1e10) / 1e10;
        return String(r);
      }

      function press(k) {
        if (k === 'C') { expr = ''; }
        else if (k === '⌫') { expr = expr.slice(0, -1); }
        else if (k === '=') {
          try {
            const clean = expr.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-');
            const v = evaluate(clean);
            screenExpr.textContent = expr + ' =';
            screenOut.textContent = format(v);
            expr = String(v);
            return;
          } catch (e) { screenOut.textContent = '错误'; return; }
        }
        else if (k === '±') {
          if (/^-?\(?-?[\d.]+\)?$/.test(expr)) expr = expr.startsWith('-') ? expr.slice(1) : '-' + expr;
          else expr = '-' + expr;
        }
        else if (['÷', '×', '−', '+', '%'].includes(k)) {
          if (!expr && k !== '−') return;
          if (/[÷×−+.]$/.test(expr)) expr = expr.slice(0, -1);
          expr += k;
        }
        else { expr += k; }
        update();
      }

      keys.forEach(([label, cls]) => {
        const btn = el('button', { class: 'calc-key ' + (cls || ''), text: label });
        btn.addEventListener('click', () => press(label));
        grid.appendChild(btn);
      });

      win.el.addEventListener('keydown', e => {
        const map = { '/': '÷', '*': '×', '-': '−', 'Enter': '=', '=': '=', 'Backspace': '⌫', 'Escape': 'C', 'Delete': 'C' };
        if (/^[0-9.]$/.test(e.key)) { press(e.key); e.preventDefault(); }
        else if (map[e.key]) { press(map[e.key]); e.preventDefault(); }
        else if (e.key === '+' || e.key === '%') { press(e.key); e.preventDefault(); }
      });
      win.el.tabIndex = 0;
      setTimeout(() => win.el.focus(), 80);

      win.body.appendChild(root);
      update();
    }
  });
})();