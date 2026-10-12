/* ============================================================
 * KevinOS · 天气
 * 优先使用 Open-Meteo 实时数据，网络不可用时回退到内置气候模型
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  const KEY = 'kevinos.weather.city.v1';

  /* ---------------- 城市 ---------------- */
  const CITIES = [
    { name: '北京', lat: 39.90, lon: 116.40, base: 13, amp: 15 },
    { name: '上海', lat: 31.23, lon: 121.47, base: 17, amp: 11 },
    { name: '广州', lat: 23.13, lon: 113.26, base: 23, amp: 8 },
    { name: '深圳', lat: 22.54, lon: 114.06, base: 23, amp: 7 },
    { name: '杭州', lat: 30.27, lon: 120.16, base: 17, amp: 12 },
    { name: '成都', lat: 30.57, lon: 104.07, base: 16, amp: 9 },
    { name: '武汉', lat: 30.59, lon: 114.31, base: 17, amp: 13 },
    { name: '西安', lat: 34.34, lon: 108.94, base: 14, amp: 13 },
    { name: '重庆', lat: 29.56, lon: 106.55, base: 18, amp: 10 },
    { name: '南京', lat: 32.06, lon: 118.80, base: 16, amp: 12 },
    { name: '天津', lat: 39.08, lon: 117.20, base: 13, amp: 15 },
    { name: '香港', lat: 22.32, lon: 114.17, base: 23, amp: 7 },
    { name: '台北', lat: 25.03, lon: 121.57, base: 23, amp: 8 },
    { name: '东京', lat: 35.68, lon: 139.69, base: 16, amp: 12 },
    { name: '首尔', lat: 37.57, lon: 126.98, base: 12, amp: 15 },
    { name: '新加坡', lat: 1.35, lon: 103.82, base: 28, amp: 2 },
    { name: '纽约', lat: 40.71, lon: -74.01, base: 13, amp: 14 },
    { name: '伦敦', lat: 51.51, lon: -0.13, base: 11, amp: 8 },
    { name: '巴黎', lat: 48.86, lon: 2.35, base: 12, amp: 9 },
    { name: '悉尼', lat: -33.87, lon: 151.21, base: 18, amp: 7, south: true },
    { name: '迪拜', lat: 25.20, lon: 55.27, base: 28, amp: 9 },
    { name: '莫斯科', lat: 55.76, lon: 37.62, base: 6, amp: 16 },
    { name: '洛杉矶', lat: 34.05, lon: -118.24, base: 18, amp: 7 }
  ];

  /* ---------------- WMO 天气代码 ---------------- */
  const WMO = {
    0: ['晴', '☀️', 'clear'],
    1: ['大部晴朗', '🌤️', 'partly'],
    2: ['局部多云', '⛅', 'partly'],
    3: ['阴', '☁️', 'cloudy'],
    45: ['有雾', '🌫️', 'fog'], 48: ['雾凇', '🌫️', 'fog'],
    51: ['毛毛雨', '🌦️', 'rain'], 53: ['毛毛雨', '🌦️', 'rain'], 55: ['毛毛雨', '🌦️', 'rain'],
    56: ['冻毛毛雨', '🌧️', 'rain'], 57: ['冻毛毛雨', '🌧️', 'rain'],
    61: ['小雨', '🌦️', 'rain'], 63: ['中雨', '🌧️', 'rain'], 65: ['大雨', '🌧️', 'rain'],
    66: ['冻雨', '🌧️', 'rain'], 67: ['冻雨', '🌧️', 'rain'],
    71: ['小雪', '🌨️', 'snow'], 73: ['中雪', '🌨️', 'snow'], 75: ['大雪', '❄️', 'snow'], 77: ['雪粒', '🌨️', 'snow'],
    80: ['阵雨', '🌦️', 'rain'], 81: ['阵雨', '🌧️', 'rain'], 82: ['强阵雨', '⛈️', 'rain'],
    85: ['阵雪', '🌨️', 'snow'], 86: ['阵雪', '❄️', 'snow'],
    95: ['雷阵雨', '⛈️', 'storm'], 96: ['雷阵雨伴冰雹', '⛈️', 'storm'], 99: ['强雷暴', '⛈️', 'storm']
  };
  function codeInfo(c) { return WMO[c] || ['未知', '🌡️', 'cloudy']; }

  /* ---------------- 伪随机（离线回退） ---------------- */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rngFrom(seed) {
    let s = seed >>> 0;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function seasonal(city, monthIdx) {
    const phase = -Math.cos(((monthIdx - 0.5) / 12) * Math.PI * 2) * city.amp;
    return city.south ? -phase : phase;
  }
  function synth(city) {
    const rand = rngFrom(hash(city.name + new Date().toDateString()));
    const today = new Date();
    const hour = today.getHours();
    const m = today.getMonth();
    const baseTemp = city.base + seasonal(city, m);
    const cur = Math.round(baseTemp + (rand() * 8 - 4));
    const kindPool = ['clear', 'partly', 'cloudy', 'rain'];
    const kind = kindPool[Math.floor(rand() * kindPool.length)];
    const codesFor = { clear: 0, partly: 2, cloudy: 3, rain: 61 };
    const code = codesFor[kind];

    const hourly = [];
    const hr = rngFrom(hash(city.name + 'h'));
    for (let i = 0; i < 12; i++) {
      const hh = (hour + i) % 24;
      const diurnal = Math.sin(((hh - 9) / 24) * Math.PI * 2) * 4;
      hourly.push({ hour: hh, temp: Math.round(baseTemp + diurnal + (hr() * 4 - 2)), code: hr() > 0.7 ? code : (hr() > 0.5 ? 2 : 1), pop: Math.round(hr() * 60) });
    }
    const daily = [];
    const dr = rngFrom(hash(city.name + 'd'));
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getTime() + i * 86400000);
      const b = city.base + seasonal(city, d.getMonth());
      const hi = Math.round(b + 3 + dr() * 4);
      const lo = Math.round(b - 5 - dr() * 3);
      daily.push({ date: d, max: hi, min: lo, code: dr() > 0.65 ? code : dr() > 0.35 ? 2 : 0 });
    }
    return {
      source: 'offline', city: city.name, code, temp: cur,
      feels: Math.round(cur - 1 + (rand() * 3)), humidity: Math.round(40 + rand() * 45),
      wind: Math.round(rand() * 22), pressure: Math.round(1000 + rand() * 25), pop: Math.round(rand() * 55),
      hourly, daily
    };
  }

  /* ---------------- 实时数据 ---------------- */
  async function fetchLive(city) {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl' +
      '&hourly=temperature_2m,weather_code,precipitation_probability' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
      '&timezone=auto&forecast_days=7';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      const c = j.current || {};
      const nowIdx = (() => {
        const t = (c.time || '').slice(0, 13);
        const i = (j.hourly.time || []).findIndex(x => x.slice(0, 13) === t);
        return i < 0 ? 0 : i;
      })();
      const hourly = [];
      for (let i = nowIdx; i < Math.min(nowIdx + 12, j.hourly.time.length); i++) {
        hourly.push({
          hour: new Date(j.hourly.time[i]).getHours(),
          temp: Math.round(j.hourly.temperature_2m[i]),
          code: j.hourly.weather_code[i],
          pop: j.hourly.precipitation_probability ? j.hourly.precipitation_probability[i] : 0
        });
      }
      const daily = (j.daily.time || []).map((t, i) => ({
        date: new Date(t), max: Math.round(j.daily.temperature_2m_max[i]),
        min: Math.round(j.daily.temperature_2m_min[i]), code: j.daily.weather_code[i]
      }));
      return {
        source: 'live', city: city.name, code: c.weather_code,
        temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature),
        humidity: Math.round(c.relative_humidity_2m), wind: Math.round(c.wind_speed_10m),
        pressure: Math.round(c.pressure_msl), pop: hourly[0] ? hourly[0].pop : 0,
        hourly, daily
      };
    } finally { clearTimeout(timer); }
  }

  const KIND_GRAD = {
    clear: 'linear-gradient(165deg, #2b6dd6 0%, #4f9bff 45%, #7fc4ff 100%)',
    partly: 'linear-gradient(165deg, #2a5aa8 0%, #4c86d6 50%, #86aede 100%)',
    cloudy: 'linear-gradient(165deg, #3a4a63 0%, #5a6d89 55%, #8496b0 100%)',
    fog: 'linear-gradient(165deg, #4a5568 0%, #6b7688 55%, #98a2b3 100%)',
    rain: 'linear-gradient(165deg, #1f3a5f 0%, #2f5b8a 55%, #4d7cb0 100%)',
    snow: 'linear-gradient(165deg, #47627f 0%, #7793b0 55%, #b6cbe0 100%)',
    storm: 'linear-gradient(165deg, #1a2238 0%, #33406a 55%, #5a5f92 100%)'
  };

  K.registerApp({
    id: 'weather', name: '天气', icon: 'weather',
    gradient: ['#38bdf8', '#0ea5e9'], pinned: true, category: '生活',
    size: { w: 900, h: 640 },
    mount(win) {
      let city = CITIES.find(c => c.name === localStorage.getItem(KEY)) || CITIES[0];
      let data = null;
      let loadToken = 0;

      const cityBtn = el('button', { class: 'wx-city-btn', text: city.name });
      const dateEl = el('div', { class: 'wx-date' });
      const refreshBtn = el('button', { class: 't-btn', title: '刷新', html: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>' });
      const locateBtn = el('button', { class: 't-btn', title: '定位当前位置', html: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>' });
      const top = el('div', { class: 'wx-top' }, [cityBtn, dateEl, el('div', { style: { flex: '1' } }), locateBtn, refreshBtn]);

      const body = el('div', { class: 'wx-body' });
      const root = el('div', { class: 'wx' }, [top, body]);
      win.body.appendChild(root);

      const picker = el('div', { class: 'wx-picker' });
      const pickerSearch = el('input', { class: 'search-input', placeholder: '搜索城市…', type: 'text' });
      const pickerList = el('div', { class: 'wx-picker-list' });
      picker.append(el('div', { class: 'wx-picker-head' }, [pickerSearch]), pickerList);
      root.appendChild(picker);
      picker.hidden = true;

      function setDate() {
        const d = new Date();
        const dow = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
        dateEl.textContent = `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${dow} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
      setDate();
      setInterval(setDate, 30000);

      function kindOf(code) { return codeInfo(code)[2]; }

      function metric(icon, label, value) {
        return el('div', { class: 'wx-metric' }, [
          el('div', { class: 'wm-label', html: icon + ' ' + label }),
          el('div', { class: 'wm-value', text: value })
        ]);
      }

      function render() {
        if (!data) return;
        root.className = 'wx kind-' + kindOf(data.code);
        root.style.background = KIND_GRAD[kindOf(data.code)];
        body.innerHTML = '';

        const info = codeInfo(data.code);
        cityBtn.textContent = data.city;
        win.setSub(data.source === 'live' ? '实时' : '离线模拟');

        const hero = el('div', { class: 'wx-hero' }, [
          el('div', { class: 'wx-emoji', text: info[1] }),
          el('div', { class: 'wx-temp-wrap' }, [
            el('div', { class: 'wx-temp', text: data.temp + '°' }),
            el('div', { class: 'wx-cond', text: info[0] + ' · 体感 ' + data.feels + '°' })
          ])
        ]);

        const metrics = el('div', { class: 'wx-metrics' }, [
          metric('💧', '湿度', data.humidity + '%'),
          metric('🌬️', '风速', data.wind + ' km/h'),
          metric('🌧️', '降水概率', (data.pop || 0) + '%'),
          metric('🧭', '气压', data.pressure + ' hPa')
        ]);

        const hourlyWrap = el('div', { class: 'wx-hourly' });
        (data.hourly || []).forEach(h => {
          hourlyWrap.appendChild(el('div', { class: 'wx-hour' }, [
            el('div', { class: 'wh-time', text: String(h.hour).padStart(2, '0') + ':00' }),
            el('div', { class: 'wh-ico', text: codeInfo(h.code)[1] }),
            el('div', { class: 'wh-temp', text: h.temp + '°' })
          ]));
        });

        const dailyList = el('div', { class: 'wx-daily' });
        (data.daily || []).forEach((d, i) => {
          const dow = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.date.getDay()];
          const label = i === 0 ? '今天' : i === 1 ? '明天' : dow;
          dailyList.appendChild(el('div', { class: 'wx-day' }, [
            el('div', { class: 'wd-name', text: label }),
            el('div', { class: 'wd-ico', text: codeInfo(d.code)[1] }),
            el('div', { class: 'wd-cond', text: codeInfo(d.code)[0] }),
            el('div', { class: 'wd-bar' }, [
              el('span', { class: 'wd-min', text: d.min + '°' }),
              el('span', { class: 'wd-track' }, [el('i')]),
              el('span', { class: 'wd-max', text: d.max + '°' })
            ])
          ]));
        });

        body.append(
          hero, metrics,
          el('div', { class: 'wx-section', text: '逐小时预报' }), hourlyWrap,
          el('div', { class: 'wx-section', text: '未来 7 天' }), dailyList
        );
      }

      async function load(showLoading) {
        const token = ++loadToken;
        if (showLoading) win.setSub('更新中…');
        data = synth(city);
        render();
        try {
          const live = await fetchLive(city);
          if (token !== loadToken) return;
          if (live.daily && live.daily.length) { data = live; render(); }
        } catch (e) { /* 保留离线数据 */ }
      }

      function selectCity(c) {
        city = c;
        localStorage.setItem(KEY, c.name);
        picker.hidden = true;
        load(true);
      }
      function openPicker() {
        picker.hidden = false;
        pickerSearch.value = '';
        renderPicker('');
        setTimeout(() => pickerSearch.focus(), 60);
      }
      function renderPicker(q) {
        q = q.trim().toLowerCase();
        pickerList.innerHTML = '';
        CITIES.filter(c => !q || c.name.toLowerCase().includes(q)).forEach(c => {
          const item = el('div', { class: 'wx-pick-item' + (c.name === city.name ? ' active' : '') }, [
            el('span', { class: 'wp-name', text: c.name }),
            el('span', { class: 'wp-coord', text: c.lat.toFixed(1) + ', ' + c.lon.toFixed(1) })
          ]);
          item.addEventListener('click', () => selectCity(c));
          pickerList.appendChild(item);
        });
      }

      cityBtn.addEventListener('click', openPicker);
      pickerSearch.addEventListener('input', e => renderPicker(e.target.value));
      pickerSearch.addEventListener('keydown', e => { if (e.key === 'Escape') picker.hidden = true; });
      refreshBtn.addEventListener('click', () => load(true));
      locateBtn.addEventListener('click', () => {
        if (!navigator.geolocation) { K.WM.UI.alert('当前浏览器不支持定位', '定位'); return; }
        win.setSub('正在定位…');
        navigator.geolocation.getCurrentPosition(
          pos => { selectCity({ name: '我的位置', lat: pos.coords.latitude, lon: pos.coords.longitude, base: 16, amp: 10 }); },
          () => K.WM.UI.alert('无法获取位置，请检查权限', '定位失败'),
          { timeout: 8000 }
        );
      });

      load(false);
    }
  });
})();