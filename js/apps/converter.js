/* ============================================================
 * KevinOS · 单位换算（可安装应用）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  const CATEGORIES = {
    '长度': { base: 'm', units: { '米 m': 1, '千米 km': 1000, '厘米 cm': 0.01, '毫米 mm': 0.001, '英尺 ft': 0.3048, '英寸 in': 0.0254, '英里 mi': 1609.344, '码 yd': 0.9144 } },
    '重量': { base: 'g', units: { '克 g': 1, '千克 kg': 1000, '毫克 mg': 0.001, '吨 t': 1000000, '磅 lb': 453.592, '盎司 oz': 28.3495 } },
    '温度': { custom: true },
    '面积': { base: 'm²', units: { '平方米 m²': 1, '平方千米 km²': 1000000, '平方厘米 cm²': 0.0001, '公顷 ha': 10000, '英亩 acre': 4046.86, '平方英尺 ft²': 0.092903 } },
    '体积': { base: 'L', units: { '升 L': 1, '毫升 mL': 0.001, '立方米 m³': 1000, '加仑 gal': 3.78541, '夸脱 qt': 0.946353, '杯 cup': 0.236588 } },
    '时间': { base: 's', units: { '秒 s': 1, '毫秒 ms': 0.001, '分钟 min': 60, '小时 h': 3600, '天 d': 86400, '周 wk': 604800, '年 yr': 31536000 } },
    '数据': { base: 'B', units: { '字节 B': 1, '千字节 KB': 1024, '兆字节 MB': 1048576, '吉字节 GB': 1073741824, '太字节 TB': 1099511627776, '位 bit': 0.125 } },
    '速度': { base: 'm/s', units: { '米/秒 m/s': 1, '千米/时 km/h': 0.277778, '英里/时 mph': 0.44704, '节 knot': 0.514444, '英尺/秒 ft/s': 0.3048 } }
  };

  K.registerApp({
    id: 'converter', name: '单位换算', icon: 'calculator', installable: true,
    gradient: ['#4338CA', '#7C7CF5'], category: '工具',
    size: { w: 560, h: 480 },
    mount(win) {
      const catSel = el('select', { class: 'conv-sel' });
      Object.keys(CATEGORIES).forEach(c => catSel.appendChild(el('option', { value: c, text: c })));

      const fromSel = el('select', { class: 'conv-sel' });
      const toSel = el('select', { class: 'conv-sel' });
      const fromIn = el('input', { class: 'conv-input', type: 'number', value: '1' });
      const toOut = el('input', { class: 'conv-input', readonly: 'readonly' });
      const swapBtn = el('button', { class: 'btn', text: '⇄' });

      function populate() {
        const cat = CATEGORIES[catSel.value];
        fromSel.innerHTML = ''; toSel.innerHTML = '';
        if (cat.custom) {
          ['摄氏度 °C', '华氏度 °F', '开尔文 K'].forEach(u => {
            fromSel.appendChild(el('option', { value: u, text: u }));
            toSel.appendChild(el('option', { value: u, text: u }));
          });
          toSel.value = '华氏度 °F';
        } else {
          Object.keys(cat.units).forEach(u => {
            fromSel.appendChild(el('option', { value: u, text: u }));
            toSel.appendChild(el('option', { value: u, text: u }));
          });
        }
        convert();
      }

      function convert() {
        const val = parseFloat(fromIn.value);
        if (isNaN(val)) { toOut.value = ''; return; }
        const cat = CATEGORIES[catSel.value];
        if (cat.custom) {
          let c;
          if (fromSel.value.startsWith('摄氏')) c = val;
          else if (fromSel.value.startsWith('华氏')) c = (val - 32) * 5 / 9;
          else c = val - 273.15;
          let r;
          if (toSel.value.startsWith('摄氏')) r = c;
          else if (toSel.value.startsWith('华氏')) r = c * 9 / 5 + 32;
          else r = c + 273.15;
          toOut.value = r.toFixed(4).replace(/\.?0+$/, '');
        } else {
          const fromUnit = cat.units[fromSel.value];
          const toUnit = cat.units[toSel.value];
          const base = val * fromUnit;
          toOut.value = (base / toUnit).toFixed(6).replace(/\.?0+$/, '');
        }
      }

      catSel.addEventListener('change', populate);
      fromSel.addEventListener('change', convert);
      toSel.addEventListener('change', convert);
      fromIn.addEventListener('input', convert);
      swapBtn.addEventListener('click', () => {
        const t = fromSel.value; fromSel.value = toSel.value; toSel.value = t; convert();
      });

      const root = el('div', { class: 'app-col conv-root' }, [
        el('div', { class: 'conv-row' }, [el('label', { text: '类别' }), catSel]),
        el('div', { class: 'conv-row' }, [fromIn, fromSel]),
        el('div', { class: 'conv-swap' }, [swapBtn]),
        el('div', { class: 'conv-row' }, [toOut, toSel])
      ]);
      win.body.appendChild(root);
      populate();
    }
  });
})();
