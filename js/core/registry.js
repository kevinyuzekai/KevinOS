/* ============================================================
 * KevinOS · 应用注册表 & 通用工具
 * ============================================================ */
(function () {
  'use strict';

  const K = window.KevinOS = window.KevinOS || {};

  /* ---------------- 图标（内联 SVG，fill=currentColor） ---------------- */
  const ICONS = {
    browser: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm7.9 9h-3a15 15 0 0 0-1.3-6.2A8 8 0 0 1 19.9 11zM12 4c1 1.3 1.9 3.7 2.1 7H9.9C10.1 7.7 11 5.3 12 4zM4.1 11a8 8 0 0 1 4.3-6.2A15 15 0 0 0 7.1 11H4.1zm0 2h3a15 15 0 0 0 1.3 6.2A8 8 0 0 1 4.1 13zm5.8 0h4.2c-.2 3.3-1.1 5.7-2.1 7-1-1.3-1.9-3.7-2.1-7zm5.7 6.2A15 15 0 0 0 16.9 13h3a8 8 0 0 1-4.3 6.2z"/>',
    files: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/>',
    terminal: '<path d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3.7 5.3L5.3 10.7l2.4 2.3 1.4-1.4-1-1 .9-.9-1.3-1.4zM12 14h6v1.6h-6z"/>',
    editor: '<path d="M6 2h8l4 4v16H6V2zm7 1.5V7h3.5L13 3.5zM8 11h8v1.6H8V11zm0 4h8v1.6H8V15zm0-8h3v1.6H8V7z"/>',
    calculator: '<path d="M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm2 3h10v3H7V5zm0 5h3v3H7v-3zm4 0h3v3h-3v-3zm4 0h2v3h-2v-3zM7 15h3v3H7v-3zm4 0h3v3h-3v-3zm4 0h2v3h-2v-3z"/>',
    photos: '<path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 13.5l4.2-5.2 2.6 3.1 3-4 3.2 6.1H5z"/><circle cx="8" cy="8.5" r="1.8"/>',
    media: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-2 5.5l6 3.5-6 3.5V8.5z"/>',
    calendar: '<path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zM5 9h14v10H5V9zm2 2v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2zM7 15v2h2v-2H7zm4 0v2h2v-2h-2z"/>',
    notes: '<path d="M5 3h11l4 4v14H5V3zm10 1.5V7h2.5L15 4.5zM7 11h10v1.6H7V11zm0 4h10v1.6H7V15zm0-8h5v1.6H7V7z"/>',
    settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4c0-.6-.1-1.2-.2-1.8l2-1.5-2-3.4-2.3 1a7 7 0 0 0-3-1.7L15 2H9l-.5 2.6a7 7 0 0 0-3 1.7l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3.6l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 3 1.7L9 22h6l.5-2.6a7 7 0 0 0 3-1.7l2.3 1 2-3.4-2-1.5c.1-.6.2-1.2.2-1.8z"/>',
    store: '<path d="M4 4h16l1 5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0l1-5zm1 7.8A5 5 0 0 0 7 12V20h10v-8a5 5 0 0 0 2-.2V21H5v-9.2z"/>',
    about: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>',
    info: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>',
    code: '<path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>',
    office: '<path d="M4 4h16l1 5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0l1-5zm1 7.8A5 5 0 0 0 7 12V20h10v-8a5 5 0 0 0 2-.2V21H5v-9.2z"/>',
    weather: '<circle cx="8.6" cy="7.4" r="3.1"/><path d="M18 20.2H9.2a4.3 4.3 0 0 1-.5-8.57A5.7 5.7 0 0 1 18.7 13a3.6 3.6 0 0 1-.7 7.2z"/>',
    wifi: '<path d="M12 3C7.5 3 3.5 4.7.6 7.6l1.4 1.4C4.7 6.5 8.2 5 12 5s7.3 1.5 10 4l1.4-1.4C20.5 4.7 16.5 3 12 3zm0 4c-3 0-5.7 1.1-7.8 3l1.4 1.4C7.2 9.8 9.5 9 12 9s4.8.8 6.4 2.4l1.4-1.4C17.7 8.1 15 7 12 7zm0 4c-1.7 0-3.2.6-4.4 1.7l1.4 1.4c.8-.7 1.9-1.1 3-1.1s2.2.4 3 1.1l1.4-1.4C15.2 11.6 13.7 11 12 11zm0 4a2 2 0 0 0-1.4 3.4l1.4 1.6 1.4-1.6A2 2 0 0 0 12 15z"/>',
    'wifi-off': '<path d="M4.3 3 3 4.3l2.9 2.9C4.6 7.8 3.4 8.6 2.4 9.5L3.8 11c.9-.85 1.9-1.5 3-1.95L8.5 10.7C7.1 11.2 5.9 12 4.9 13.1l1.4 1.4c.8-.8 1.8-1.4 2.9-1.7l1.6 1.6c-.9.2-1.7.6-2.4 1.3l1.4 1.4c.6-.6 1.4-.9 2.2-.9l4 4L17 21.5l-3.6-3.6c-.4.2-.9.35-1.4.45V20a2 2 0 0 0 2.8 1.8l1.5-1.5c.7-.7 1.1-1.6 1.4-2.5l4.5 4.5 1.3-1.3L4.3 3zm7.7.05c-2.1 0-4.1.55-5.9 1.5l1.5 1.5A12 12 0 0 1 12 5c3.8 0 7.2 1.5 9.6 4l1.4-1.4C20.4 4.75 16.5 3 12 3.05z"/>',
    image: '<path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 13.5l4.2-5.2 2.6 3.1 3-4 3.2 6.1H5z"/>',
    audio: '<path d="M12 3v11.6A3.5 3.5 0 1 0 14 18V7h4V3h-6z"/>',
    doc: '<path d="M6 2h8l4 4v16H6V2zm7 1.5V7h3.5L13 3.5z"/>',
    text: '<path d="M6 2h8l4 4v16H6V2zm7 1.5V7h3.5L13 3.5zM8 11h8v1.6H8V11zm0 4h8v1.6H8V15z"/>',
    music: '<path d="M12 3v11.6A3.5 3.5 0 1 0 14 18V7h4V3h-6z"/><path d="M12 3v11.6A3.5 3.5 0 1 0 14 18V7h4V3h-6z"/>',
    // AI 助手专用 glyph：四角星 + 小星，和「关于本机」的 i 区分开
    ai: '<path d="M11 2l1.85 4.95L17.8 8.8l-4.95 1.85L11 15.6 9.15 10.65 4.2 8.8l4.95-1.85L11 2z"/><path d="M18.2 14.2l.85 2.25 2.25.85-2.25.85-.85 2.25-.85-2.25-2.25-.85 2.25-.85.85-2.25z"/>'
  };

  /* ---------------- 应用注册 ---------------- */
  const apps = new Map();
  const INSTALLED_KEY = 'kevinos-installed-apps';

  function getInstalled() {
    try { return JSON.parse(localStorage.getItem(INSTALLED_KEY)) || {}; } catch { return {}; }
  }
  function setInstalled(map) { localStorage.setItem(INSTALLED_KEY, JSON.stringify(map)); }

  function registerApp(def) {
    apps.set(def.id, Object.assign({ pinned: false, category: '其他', installable: false }, def));
  }
  function getApp(id) { return apps.get(id); }
  function allApps() { return Array.from(apps.values()); }
  function isInstalled(id) {
    const app = apps.get(id);
    if (!app) return false;
    if (!app.installable) return true;
    return !!getInstalled()[id];
  }
  function installApp(id) {
    const map = getInstalled();
    map[id] = true;
    setInstalled(map);
    window.dispatchEvent(new CustomEvent('kevinos:apps-changed', { detail: { id, action: 'install' } }));
  }
  function uninstallApp(id) {
    const map = getInstalled();
    delete map[id];
    setInstalled(map);
    window.dispatchEvent(new CustomEvent('kevinos:apps-changed', { detail: { id, action: 'uninstall' } }));
  }
  function installedApps() { return allApps().filter(a => isInstalled(a.id)); }

  /* ---------------- 应用图标渲染 ---------------- */
  function appIconEl(app, cls) {
    const el = document.createElement('div');
    el.className = 'app-ico ' + (cls || '');
    const g = app.gradient || ['#2C5AE0', '#4F7CFF'];
    el.style.background = `linear-gradient(145deg, ${g[0]}, ${g[1]})`;
    el.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[app.icon] || ICONS.about}</svg>`;
    return el;
  }
  function iconEl(name, color) {
    const span = document.createElement('span');
    span.className = 'app-ico sm';
    span.style.background = color || 'linear-gradient(145deg,#2C5AE0,#4F7CFF)';
    span.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[name] || ICONS.about}</svg>`;
    return span;
  }

  /* ---------------- DOM 工具 ---------------- */
  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) for (const k in props) {
      if (k === 'class') node.className = props[k];
      else if (k === 'html') node.innerHTML = props[k];
      else if (k === 'text') node.textContent = props[k];
      else if (k === 'style' && typeof props[k] === 'object') Object.assign(node.style, props[k]);
      else if (k.startsWith('on') && typeof props[k] === 'function') node.addEventListener(k.slice(2).toLowerCase(), props[k]);
      else node.setAttribute(k, props[k]);
    }
    if (children) (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }
  function svgIcon(name, cls) {
    const span = el('span', { class: cls || 'ico' });
    span.innerHTML = `<svg viewBox="0 0 24 24" class="ico">${ICONS[name] || ''}</svg>`;
    return span;
  }

  function fmtSize(bytes) {
    if (bytes == null) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
  function fmtTime(ts) {
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  K.ICONS = ICONS;
  K.apps = { registerApp, getApp, allApps, appIconEl, iconEl, isInstalled, installApp, uninstallApp, installedApps };
  K.registerApp = registerApp;
  K.util = { el, svgIcon, fmtSize, fmtTime };
})();