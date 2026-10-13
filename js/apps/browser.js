/* ============================================================
 * KevinOS · 内置浏览器
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  const HOME = 'kevin://home';

  const SHORTCUTS = [
    { name: '维基百科', url: 'https://zh.wikipedia.org/', color: '#3a3a3a', letter: 'W' },
    { name: 'GitHub', url: 'https://github.com/', color: '#24292f', letter: 'G' },
    { name: 'Bing', url: 'https://www.bing.com/', color: '#0a86c4', letter: 'B' },
    { name: 'MDN 文档', url: 'https://developer.mozilla.org/zh-CN/', color: '#1b1b1b', letter: 'M' },
    { name: 'KevinOS', url: 'kevin://welcome', color: '#1b2a4a', letter: 'K' },
    { name: '示例页面', url: 'kevin://demo', color: '#4f7cff', letter: 'D' }
  ];

  /* ---------- OS 内置页面 ---------- */
  function pageShell(title, body) {
    return `<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Segoe UI","PingFang SC","Microsoft YaHei",system-ui,sans-serif;background:linear-gradient(160deg,#0d1428,#0a0f1e 60%,#060a14);color:#e8eefc;line-height:1.7;padding:64px 28px;min-height:100vh}
  .in{max-width:760px;margin:0 auto}
  .logo{width:64px;height:64px;border-radius:16px;background:linear-gradient(145deg,#4f7cff,#9b6bff);display:grid;place-items:center;font-size:30px;font-weight:800;color:#fff;box-shadow:0 16px 36px -14px rgba(79,124,255,.7);margin-bottom:22px}
  h1{font-size:32px;letter-spacing:.5px;margin-bottom:10px}
  h2{font-size:19px;margin:26px 0 8px;color:#bcd0ff}
  p{color:#9fb0d4;margin-bottom:12px}
  ul{margin:0 0 14px 20px;color:#9fb0d4}
  li{margin-bottom:6px}
  code{background:rgba(255,255,255,.1);padding:2px 7px;border-radius:6px;font-family:Consolas,monospace;font-size:13px;color:#8fe3b0}
  .card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:20px 22px;margin-top:18px}
  a{color:#7aa2ff}
  .pill{display:inline-block;padding:3px 12px;border-radius:20px;background:rgba(79,124,255,.2);color:#8fb0ff;font-size:12px;font-weight:600;margin-bottom:16px}
</style></head><body><div class="in">${body}</div></body></html>`;
  }

  const PAGES = {
    'kevin://welcome': () => pageShell('welcome', `
      <div class="pill">KevinOS 内置页面</div>
      <div class="logo">K</div>
      <h1>欢迎来到 KevinOS 浏览器</h1>
      <p>这是一个完全运行在网页中的浏览器外壳。它支持多标签页、地址栏导航、书签与历史记录。</p>
      <h2>你能做什么</h2>
      <ul>
        <li>在地址栏输入网址（如 <code>github.com</code>）直接访问</li>
        <li>输入关键词自动进行网络搜索</li>
        <li>点击右上角 <code>+</code> 新建标签页</li>
        <li>部分站点禁止被嵌入，可点击工具栏外链按钮在新窗口打开</li>
      </ul>
      <div class="card"><h2 style="margin-top:0">关于安全</h2><p>出于浏览器同源策略，无法读取外部页面的内容，这是 Web 平台的安全基石。</p></div>
    `),
    'kevin://demo': () => pageShell('demo', `
      <div class="pill">DEMO</div>
      <h1>示例页面</h1>
      <p>这是由 KevinOS 直接生成的内置页面，用于演示浏览器渲染能力。</p>
      <h2>排版演示</h2>
      <p>普通段落文本，包含 <code>行内代码</code> 与 <a href="kevin://welcome">内部链接</a>。中文与 English mixed 显示正常。</p>
      <div class="card"><h2 style="margin-top:0">卡片组件</h2><p>圆角、边框与半透明背景，遵循 KevinOS 的视觉语言。</p></div>
    `)
  };

  /* 兼容渲染：通过公共 CORS 代理取回页面 HTML 再在本地渲染，
     用于绕过 X-Frame-Options / CSP frame-ancestors 的嵌入限制 */
  const PROXIES = [
    u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
    u => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u),
    u => 'https://corsproxy.io/?' + encodeURIComponent(u),
    u => 'https://api.allorigins.win/get?url=' + encodeURIComponent(u),
    u => 'https://thingproxy.freeboard.io/fetch/' + u,
    u => 'https://cors.eu.org/' + u
  ];

  function isInternal(url) { return url.startsWith('kevin://'); }
  function isUrlLike(s) {
    s = s.trim();
    if (!s || /\s/.test(s)) return false;                 // 含空格 → 视为搜索
    if (isInternal(s)) return true;
    if (/^https?:\/\//i.test(s)) return true;
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s)) return true;      // 域名
    if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/\S*)?$/.test(s)) return true;   // IP
    if (/^localhost(:\d+)?(\/\S*)?$/i.test(s)) return true;
    return false;
  }
  function toUrl(s) {
    s = s.trim();
    if (isInternal(s) || /^https?:\/\//i.test(s)) return s;
    return 'https://' + s;
  }
  function searchUrl(q) { return 'https://www.bing.com/search?q=' + encodeURIComponent(q); }

  /* ---------- 应用挂载 ---------- */
  K.registerApp({
    id: 'browser', name: 'Kevin 浏览器', icon: 'browser',
    gradient: ['#4f7cff', '#22d3ee'], pinned: true, category: '网络',
    size: { w: 1020, h: 680 },
    mount(win, args) {
      const tabs = [];
      let activeId = null;
      let tabSeq = 0;

      const tabsBar = el('div', { class: 'br-tabs' });
      const newTabBtn = el('button', { class: 'br-newtab', title: '新建标签页', html: '<svg viewBox="0 0 24 24" class="ico"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>' });
      tabsBar.appendChild(newTabBtn);

      const backBtn = el('button', { class: 't-btn', title: '后退', html: '<svg viewBox="0 0 24 24"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>' });
      const fwdBtn = el('button', { class: 't-btn', title: '前进', html: '<svg viewBox="0 0 24 24"><path d="M8.6 7.4 10 6l6 6-6 6-1.4-1.4L13.2 12z"/></svg>' });
      const reloadBtn = el('button', { class: 't-btn', title: '刷新', html: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>' });
      const homeBtn = el('button', { class: 't-btn', title: '主页', html: '<svg viewBox="0 0 24 24"><path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3z"/></svg>' });
      const urlInput = el('input', { class: 'br-url', type: 'text', placeholder: '搜索或输入网址', spellcheck: 'false' });
      const goBtn = el('button', { class: 't-btn', title: '前往', html: '<svg viewBox="0 0 24 24"><path d="M4 11h12.2l-4.6-4.6L13 5l7 7-7 7-1.4-1.4 4.6-4.6H4z"/></svg>' });
      const compatBtn = el('button', { class: 't-btn', title: '兼容渲染（代理加载）· 用于拒绝嵌入的站点', html: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.6a13 13 0 0 0-1-2.5A8 8 0 0 1 18.9 8zM12 4.2c.7 1 1.3 2.4 1.7 3.8h-3.4c.4-1.4 1-2.8 1.7-3.8zM4.3 14a8 8 0 0 1 0-4h3a16 16 0 0 0 0 4h-3zm.8 2h2.6a13 13 0 0 0 1 2.5A8 8 0 0 1 5.1 16zm2.6-8H5.1a8 8 0 0 1 3.6-2.5A13 13 0 0 0 7.7 8zM12 19.8c-.7-1-1.3-2.4-1.7-3.8h3.4c-.4 1.4-1 2.8-1.7 3.8zM14.1 14H9.9a14 14 0 0 1 0-4h4.2a14 14 0 0 1 0 4zm.2 4.5a13 13 0 0 0 1-2.5h2.6a8 8 0 0 1-3.6 2.5zm1.8-4.5a16 16 0 0 0 0-4h3a8 8 0 0 1 0 4h-3z"/></svg>' });
      const extBtn = el('button', { class: 't-btn', title: '在新窗口打开', html: '<svg viewBox="0 0 24 24"><path d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14zM5 5h6v2H6v11h11v-5h2v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/></svg>' });

      const toolbar = el('div', { class: 'br-toolbar' }, [backBtn, fwdBtn, reloadBtn, homeBtn, urlInput, goBtn, compatBtn, extBtn]);
      const view = el('div', { class: 'br-view' });
      const root = el('div', { class: 'app-col' }, [tabsBar, toolbar, view]);

      function makeTab(url) {
        const tab = { id: ++tabSeq, title: '新标签页', url: url || HOME, history: [url || HOME], hi: 0, favicon: 'K', mode: 'auto' };
        tabs.push(tab);
        return tab;
      }

      function activeTab() { return tabs.find(t => t.id === activeId); }

      function syncTabBar() {
        tabsBar.querySelectorAll('.br-tab').forEach(n => n.remove());
        tabs.forEach(t => {
          const tabEl = el('div', { class: 'br-tab' + (t.id === activeId ? ' active' : '') }, [
            el('span', { class: 'bt-fav', text: t.favicon }),
            el('span', { class: 'bt-title', text: t.title }),
            el('span', { class: 'bt-x', html: '<svg viewBox="0 0 24 24" class="ico" style="width:12px;height:12px"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/></svg>' })
          ]);
          tabEl.addEventListener('click', e => {
            if (e.target.closest('.bt-x')) {
              e.stopPropagation();
              const i = tabs.indexOf(t);
              if (tabs.length === 1) { makeTab(HOME); }
              tabs.splice(i, 1);
              if (activeId === t.id) activeId = tabs[Math.max(0, i - 1)].id;
              syncTabBar(); renderActive();
              return;
            }
            activeId = t.id; syncTabBar(); renderActive();
          });
          tabsBar.insertBefore(tabEl, newTabBtn);
        });
      }

      function navigate(input, record) {
        const t = activeTab();
        if (!t) return;
        let target = isUrlLike(input) ? toUrl(input) : searchUrl(input);
        if (record !== false) { t.history = t.history.slice(0, t.hi + 1); t.history.push(target); t.hi = t.history.length - 1; }
        else { t.history[t.hi] = target; }
        t.url = target;
        t.mode = 'auto';
        renderActive();
      }

      const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-top-navigation-by-user-activation';
      let renderSeq = 0;

      function setTabMeta(t) {
        if (t.url === HOME) { t.title = '新标签页'; t.favicon = 'K'; win.setSub(''); return; }
        if (isInternal(t.url)) { t.title = 'KevinOS · ' + t.url.replace('kevin://', ''); t.favicon = 'K'; }
        else {
          t.favicon = (t.url.replace(/^https?:\/\//, '')[0] || '·').toUpperCase();
          t.title = t.url.replace(/^https?:\/\//, '').split('/')[0] || t.url;
        }
        win.setSub(t.title === '新标签页' ? '' : t.title);
      }

      // 直接嵌入（原生 iframe）
      function directEmbed(t, my, onFail) {
        const frame = el('iframe', { referrerpolicy: 'no-referrer' });
        frame.src = t.url;
        frame.setAttribute('sandbox', SANDBOX);
        let loaded = false;
        frame.addEventListener('load', () => { loaded = true; });
        view.innerHTML = '';
        view.appendChild(frame);
        setTimeout(() => { if (my === renderSeq && !loaded) onFail(); }, 3000);
      }

      // 兼容渲染：通过代理取回 HTML，注入 <base> 后在本地 iframe 呈现
      async function proxyFetch(t, my) {
        for (let i = 0; i < PROXIES.length; i++) {
          const make = PROXIES[i];
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 8000);
          try {
            const res = await fetch(make(t.url), { redirect: 'follow', signal: ctrl.signal });
            clearTimeout(timer);
            if (my !== renderSeq) return null;
            if (!res.ok) continue;
            const txt = await res.text();
            if (my !== renderSeq) return null;
            if (!txt || txt.length < 40) continue;
            // allorigins.win/get 返回 JSON 包装
            let html = txt;
            try {
              const j = JSON.parse(txt);
              if (j && typeof j.contents === 'string') html = j.contents;
            } catch {}
            if (html && html.length > 40) return html;
          } catch (e) { clearTimeout(timer); }
          if (my !== renderSeq) return null;
        }
        return null;
      }
      // 清理 HTML：移除 CSP、frame-busting 脚本等阻碍嵌入的内容
      function sanitizeHtml(html, url) {
        let doc = html;
        // 移除 CSP meta 标签
        doc = doc.replace(/<meta[^>]+http-equiv=["']content-security-policy["'][^>]*>/gi, '');
        doc = doc.replace(/<meta[^>]+content=["'][^"']*frame-ancestors[^"']*["'][^>]*>/gi, '');
        // 移除 X-Frame-Options 相关 meta
        doc = doc.replace(/<meta[^>]+http-equiv=["']x-frame-options["'][^>]*>/gi, '');
        // 注入 <base> 标签以正确解析相对路径
        const base = '<base href="' + url.replace(/"/g, '%22') + '" target="_blank">';
        if (/<head[^>]*>/i.test(doc)) doc = doc.replace(/<head([^>]*)>/i, '<head$1>' + base);
        else doc = '<!DOCTYPE html><html><head>' + base + '</head><body>' + doc + '</body></html>';
        return doc;
      }
      function paintProxy(t, html, my) {
        if (my !== renderSeq) return;
        const doc = sanitizeHtml(html, t.url);
        const frame = el('iframe');
        frame.setAttribute('sandbox', SANDBOX);
        frame.srcdoc = doc;
        view.innerHTML = '';
        view.appendChild(frame);
      }
      function showFail(t, my) {
        if (my !== renderSeq) return;
        view.innerHTML = '';
        view.appendChild(blockedCard(t.url));
        t.title = '无法打开';
        syncTabBar();
      }

      // 外部站点渲染：自动模式优先代理（可绕过 X-Frame-Options），失败再回退直接嵌入
      async function renderExternal(t) {
        const my = ++renderSeq;
        setTabMeta(t); syncTabBar();
        if (t.mode === 'direct') { directEmbed(t, my, () => showFail(t, my)); return; }
        view.innerHTML = '';
        view.appendChild(loadingCard(t.url, t.mode === 'auto'));
        const html = await proxyFetch(t, my);
        if (my !== renderSeq) return;
        if (html) { paintProxy(t, html, my); return; }
        if (t.mode === 'auto') { directEmbed(t, my, () => showFail(t, my)); return; }
        showFail(t, my);
      }

      function renderActive() {
        const t = activeTab();
        if (!t) return;
        view.innerHTML = '';
        urlInput.value = isInternal(t.url) ? '' : t.url;
        backBtn.disabled = t.hi <= 0;
        fwdBtn.disabled = t.hi >= t.history.length - 1;
        compatBtn.classList.toggle('active', t.mode !== 'direct');

        if (t.url === HOME) {
          view.appendChild(buildHome());
          t.title = '新标签页'; t.favicon = 'K';
          win.setSub('');
        } else if (isInternal(t.url)) {
          const frame = el('iframe');
          frame.setAttribute('sandbox', 'allow-same-origin allow-popups allow-forms');
          frame.srcdoc = PAGES[t.url] ? PAGES[t.url]() : PAGES['kevin://welcome']();
          view.appendChild(frame);
          setTabMeta(t);
        } else {
          renderExternal(t);
        }
        syncTabBar();
      }

      function buildHome() {
        const wrap = el('div', { class: 'br-home' });
        wrap.appendChild(el('img', { class: 'br-home-logo', src: 'assets/logo.png', alt: '' }));
        wrap.appendChild(el('h2', { text: 'Kevin 浏览器' }));
        const search = el('div', { class: 'br-search' });
        const si = el('input', { type: 'text', placeholder: '搜索网络或输入网址…' });
        const sb = el('button', { text: '搜索' });
        const doSearch = () => { if (si.value.trim()) navigate(si.value.trim()); };
        sb.addEventListener('click', doSearch);
        si.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
        search.append(si, sb);
        wrap.appendChild(search);

        const grid = el('div', { class: 'br-shortcuts' });
        SHORTCUTS.forEach(s => {
          const card = el('div', { class: 'br-sc' }, [
            el('div', { class: 'sc-ico', style: { background: s.color }, text: s.letter }),
            el('div', { class: 'sc-name', text: s.name })
          ]);
          card.addEventListener('click', () => navigate(s.url));
          grid.appendChild(card);
        });
        wrap.appendChild(grid);
        wrap.appendChild(el('div', { class: 'br-note', text: '提示：少数网站通过 X-Frame-Options 拒绝被嵌入，浏览器会自动切换「兼容渲染」；也可点击工具栏的地球按钮手动切换。' }));
        return wrap;
      }

      function loadingCard(url, auto) {
        const wrap = el('div', { class: 'br-home' });
        wrap.appendChild(el('div', { class: 'br-spinner' }));
        wrap.appendChild(el('h2', { text: auto ? '正在兼容渲染…' : '正在加载…' }));
        wrap.appendChild(el('div', { class: 'br-note', text: url + '\n该站点拒绝直接嵌入，正在通过代理取回页面内容。' }));
        return wrap;
      }

      function blockedCard(url) {
        const wrap = el('div', { class: 'br-home' });
        wrap.appendChild(el('img', { class: 'br-home-logo', src: 'assets/logo.png' }));
        wrap.appendChild(el('h2', { text: '无法加载该页面' }));
        wrap.appendChild(el('div', { class: 'br-note', text: url + '\n直接嵌入与代理渲染均未成功。可在新窗口打开，或稍后重试。' }));
        const btn = el('button', { class: 'btn primary', text: '在新窗口打开 ↗' });
        btn.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
        wrap.appendChild(btn);
        const retry = el('button', { class: 'btn', text: '重试' });
        retry.addEventListener('click', () => { const t = activeTab(); t.mode = 'auto'; renderActive(); });
        wrap.appendChild(retry);
        const home = el('button', { class: 'btn', text: '返回主页' });
        home.addEventListener('click', () => navigate(HOME));
        wrap.appendChild(home);
        return wrap;
      }

      // 事件绑定
      newTabBtn.addEventListener('click', () => { const t = makeTab(HOME); activeId = t.id; syncTabBar(); renderActive(); });
      backBtn.addEventListener('click', () => { const t = activeTab(); if (t.hi > 0) { t.hi--; t.url = t.history[t.hi]; renderActive(); } });
      fwdBtn.addEventListener('click', () => { const t = activeTab(); if (t.hi < t.history.length - 1) { t.hi++; t.url = t.history[t.hi]; renderActive(); } });
      reloadBtn.addEventListener('click', () => renderActive());
      compatBtn.addEventListener('click', () => {
        const t = activeTab();
        if (!t || isInternal(t.url) || t.url === HOME) { K.WM.UI.alert('当前是内置页面，无需兼容渲染。'); return; }
        t.mode = t.mode === 'direct' ? 'auto' : 'direct';
        renderActive();
      });
      homeBtn.addEventListener('click', () => navigate(HOME));
      goBtn.addEventListener('click', () => { if (urlInput.value.trim()) navigate(urlInput.value.trim()); });
      urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') { navigate(urlInput.value.trim() || HOME); urlInput.blur(); } });
      extBtn.addEventListener('click', () => { const t = activeTab(); if (t && !isInternal(t.url) && t.url !== HOME) window.open(t.url, '_blank', 'noopener'); else K.WM.UI.alert('当前是内置页面，无需外部打开。'); });

      win.body.appendChild(root);

      // 初始标签
      const t0 = makeTab(args.url || HOME);
      activeId = t0.id;
      syncTabBar();
      renderActive();
      if (args.url && args.url !== HOME) navigate(args.url);

      win.deliver = (a) => { if (a && a.url) navigate(a.url); };
    }
  });
})();