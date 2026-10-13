/* ============================================================
 * KevinOS · 虚拟文件系统 (VFS)
 * 基于 localStorage 持久化的树形文件系统
 * ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'kevinos.fs.v1';
  /* 持久化模式：文件系统内容保存在浏览器 localStorage 中，
     每个浏览器/设备独立存储，不跨设备同步 */
  const PERSIST = true;

  const MIME = {
    txt: 'text/plain', md: 'text/markdown', js: 'text/javascript', json: 'application/json',
    html: 'text/html', css: 'text/css', csv: 'text/csv',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', mp4: 'video/mp4'
  };
  const IMG_EXT = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
  const AUDIO_EXT = ['mp3', 'wav', 'ogg', 'm4a'];
  const CODE_EXT = ['js', 'json', 'html', 'css', 'ts', 'py', 'java', 'c', 'cpp', 'sh', 'xml', 'yml', 'yaml'];
  const DOC_EXT = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];

  function ext(name) { const i = name.lastIndexOf('.'); return i < 0 ? '' : name.slice(i + 1).toLowerCase(); }
  function kind(name) {
    const e = ext(name);
    if (IMG_EXT.includes(e)) return 'image';
    if (AUDIO_EXT.includes(e)) return 'audio';
    if (CODE_EXT.includes(e)) return 'code';
    if (DOC_EXT.includes(e)) return 'doc';
    if (['txt', 'md', 'csv', 'log'].includes(e)) return 'text';
    return 'file';
  }
  function uid() { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function node(name, type, extra) {
    const n = {
      id: uid(), name, type,
      created: Date.now(), modified: Date.now(),
      children: type === 'folder' ? [] : undefined,
      content: type === 'file' ? '' : undefined,
      size: type === 'file' ? 0 : undefined
    };
    if (extra) Object.assign(n, extra);
    return n;
  }

  /* ---------- 默认目录树 ---------- */
  function defaultTree() {
    const root = node('', 'folder');
    root.id = 'root';
    const mk = (n, t) => { const c = node(n, t); root.children.push(c); return c; };
    const home = mk('Home', 'folder');
    const desktop = node('Desktop', 'folder'); home.children.push(desktop);
    const documents = node('Documents', 'folder'); home.children.push(documents);
    const pictures = node('Pictures', 'folder'); home.children.push(pictures);
    const music = node('Music', 'folder'); home.children.push(music);
    const videos = node('Videos', 'folder'); home.children.push(videos);
    const downloads = node('Downloads', 'folder'); home.children.push(downloads);
    mk('System', 'folder');

    const doc = (name, content) => { const f = node(name, 'file', { content, size: content.length }); documents.children.push(f); return f; };
    doc('欢迎使用 KevinOS.md',
      '# 欢迎使用 KevinOS\n\n这是一个跑在浏览器里的桌面操作系统。\n\n## 你可以做什么\n\n- 双击图标打开应用\n- 拖动窗口标题栏移动，拖边框缩放\n- 把窗口拖到屏幕边缘可自动吸附\n- 右键桌面或文件可呼出菜单\n- 打开「终端」输入 `help` 查看命令\n\n> 所有文件都保存在你自己的浏览器里（localStorage）。\n');

    const note = node('待办事项.txt', 'file', { content: '1. 体验内置浏览器\n2. 用文件管理器整理资料\n3. 在设置里换一张壁纸\n4. 打开终端跑一次 neofetch\n', size: 120 });
    documents.children.push(note);

    const readme = node('关于本机.txt', 'file', { content: 'KevinOS · 网页操作系统\n版本 1.0 "Navy"\n内核: KevinKernel\n渲染: WebEngine\n', size: 90 });
    documents.children.push(readme);

    // 生成几张 SVG 示例图片
    const svgArt = (title, c1, c2) => `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="640" height="400" fill="url(#g)"/>
<circle cx="500" cy="110" r="70" fill="rgba(255,255,255,.18)"/>
<circle cx="140" cy="320" r="120" fill="rgba(255,255,255,.10)"/>
<text x="50%" y="52%" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="46" fill="#fff" font-weight="700">${title}</text>
<text x="50%" y="64%" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="18" fill="rgba(255,255,255,.8)">KevinOS Gallery</text>
</svg>`;
    const p1 = node('Aurora.svg', 'file', { content: svgArt('Aurora', '#4f7cff', '#9b6bff'), size: 400 });
    const p2 = node('Sunset.svg', 'file', { content: svgArt('Sunset', '#ff8a3d', '#ff5c8a'), size: 400 });
    const p3 = node('Forest.svg', 'file', { content: svgArt('Forest', '#10b981', '#2f9e6f'), size: 400 });
    pictures.children.push(p1, p2, p3);

    const code = node('hello.js', 'file', { content: 'function hello(name) {\n  console.log(`Hello, ${name}!`);\n}\n\nhello("KevinOS");\n', size: 90 });
    documents.children.push(code);

    return root;
  }

  /* ---------- 状态 ---------- */
  let root;

  function load() {
    // 持久化模式：优先从 localStorage 读取，没有则用默认目录树
    if (PERSIST) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) { root = JSON.parse(raw); return; }
      } catch (e) { /* ignore */ }
    }
    root = defaultTree();
    save();
  }
  function save() {
    if (!PERSIST) return;   // 演示模式下不写入本地存储
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(root)); }
    catch (e) { console.warn('FS 保存失败', e); }
  }

  /* ---------- 路径工具 ---------- */
  function normalize(path) {
    if (!path) return '/Home';
    path = String(path).replace(/\\/g, '/').replace(/\/+/g, '/');
    const abs = path.startsWith('/') ? path : '/Home/' + path;
    const parts = abs.split('/').filter(Boolean);
    const out = [];
    for (const p of parts) {
      if (p === '.') continue;
      if (p === '..') { out.pop(); continue; }
      out.push(p);
    }
    return '/' + out.join('/');
  }
  function splitPath(path) { return normalize(path).split('/').filter(Boolean); }

  function resolve(path) {
    const parts = splitPath(path);
    let cur = root;
    for (const p of parts) {
      if (!cur || cur.type !== 'folder') return null;
      const next = (cur.children || []).find(c => c.name.toLowerCase() === p.toLowerCase());
      if (!next) return null;
      cur = next;
    }
    return cur;
  }
  function parentOf(path) {
    const parts = splitPath(path);
    parts.pop();
    return resolve('/' + parts.join('/'));
  }

  /* ---------- 操作 ---------- */
  const listeners = new Set();
  function emit() { save(); listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  function list(path) {
    const n = resolve(path);
    if (!n || n.type !== 'folder') return null;
    return n.children.slice().sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, 'zh');
    });
  }

  function mkdir(path) {
    const parent = parentOf(path);
    const name = splitPath(path).pop();
    if (!parent || parent.type !== 'folder') return { ok: false, error: '父目录不存在' };
    if (parent.children.some(c => c.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: '已存在同名项' };
    parent.children.push(node(name, 'folder'));
    emit();
    return { ok: true };
  }

  function writeFile(path, content, opts) {
    content = content == null ? '' : String(content);
    let target = resolve(path);
    if (target && target.type === 'file') {
      target.content = content; target.size = content.length; target.modified = Date.now();
      emit(); return { ok: true, node: target };
    }
    const parent = parentOf(path);
    const name = splitPath(path).pop();
    if (!parent || parent.type !== 'folder') return { ok: false, error: '目录不存在' };
    if (!name) return { ok: false, error: '非法文件名' };
    const f = node(name, 'file', Object.assign({ content, size: content.length }, opts || {}));
    parent.children.push(f);
    emit();
    return { ok: true, node: f };
  }

  function readFile(path) {
    const n = resolve(path);
    if (!n || n.type !== 'file') return null;
    return n.content;
  }
  function stat(path) { return resolve(path); }

  function remove(path) {
    const target = resolve(path);
    if (!target) return { ok: false, error: '不存在' };
    if (target === root) return { ok: false, error: '无法删除根目录' };
    const parent = parentOf(path);
    if (!parent) return { ok: false, error: '无法删除' };
    parent.children = parent.children.filter(c => c !== target);
    emit();
    return { ok: true };
  }

  function rename(path, newName) {
    const target = resolve(path);
    if (!target) return { ok: false, error: '不存在' };
    newName = String(newName || '').trim();
    if (!newName || /[\/\\]/.test(newName)) return { ok: false, error: '非法名称' };
    const parent = parentOf(path);
    if (parent && parent.children.some(c => c !== target && c.name.toLowerCase() === newName.toLowerCase()))
      return { ok: false, error: '已存在同名项' };
    target.name = newName;
    target.modified = Date.now();
    emit();
    return { ok: true };
  }

  function copyNode(n) {
    const c = JSON.parse(JSON.stringify(n));
    c.id = uid();
    if (c.children) c.children.forEach((ch, i) => { const nc = copyNode(ch); c.children[i] = nc; });
    return c;
  }

  function copy(srcPath, destDir) {
    const src = resolve(srcPath);
    const dir = resolve(destDir);
    if (!src || !dir || dir.type !== 'folder') return { ok: false, error: '路径错误' };
    let name = src.name, i = 1;
    while (dir.children.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      const dot = src.name.lastIndexOf('.');
      name = dot > 0 ? src.name.slice(0, dot) + ` (${i})` + src.name.slice(dot) : src.name + ` (${i})`;
      i++;
    }
    const cp = copyNode(src); cp.name = name;
    dir.children.push(cp);
    emit();
    return { ok: true, node: cp };
  }

  function move(srcPath, destDir) {
    const src = resolve(srcPath);
    const dir = resolve(destDir);
    if (!src || !dir || dir.type !== 'folder') return { ok: false, error: '路径错误' };
    if (src.type === 'folder' && (destDir.startsWith(srcPath + '/') || destDir === srcPath))
      return { ok: false, error: '不能移动到自身内部' };
    const parent = parentOf(srcPath);
    let name = src.name, i = 1;
    while (dir.children.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      const dot = src.name.lastIndexOf('.');
      name = dot > 0 ? src.name.slice(0, dot) + ` (${i})` + src.name.slice(dot) : src.name + ` (${i})`;
      i++;
    }
    src.name = name;
    if (parent) parent.children = parent.children.filter(c => c !== src);
    dir.children.push(src);
    emit();
    return { ok: true };
  }

  function usage() {
    let files = 0, folders = 0, bytes = 0;
    (function walk(n) {
      (n.children || []).forEach(c => {
        if (c.type === 'folder') { folders++; walk(c); }
        else { files++; bytes += (c.content || '').length; }
      });
    })(root);
    return { files, folders, bytes };
  }

  function reset() { root = defaultTree(); emit(); }

  load();

  window.KevinOS = window.KevinOS || {};
  window.KevinOS.FS = {
    MIME, ext, kind,
    normalize, resolve, list, mkdir, writeFile, readFile, stat,
    remove, rename, copy, move, onChange, usage, reset,
    HOME: '/Home', get root() { return root; }
  };
})();