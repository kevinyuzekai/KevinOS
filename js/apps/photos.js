/* ============================================================
 * KevinOS · 图片查看器
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el, fmtSize } = K.util;
  const FS = K.FS;
  const IMG_EXT = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'];

  function srcOf(node) {
    if (!node) return null;
    if (node.dataUrl) return node.dataUrl;
    const e = FS.ext(node.name);
    if (e === 'svg') return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(node.content || '');
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(e)) {
      if ((node.content || '').startsWith('data:')) return node.content;
      return null;
    }
    return null;
  }

  K.registerApp({
    id: 'photos', name: '图片查看器', icon: 'photos',
    gradient: ['#6D28D9', '#A78BFA'], pinned: false, category: '媒体',
    size: { w: 860, h: 620 },
    mount(win, args) {
      let list = [];
      let index = 0;
      let zoom = 1, rotate = 0;

      const img = el('img', { alt: '' });
      const stage = el('div', { class: 'ph-stage' }, [img]);
      const empty = el('div', { class: 'br-note', style: { color: '#8fa0c8', position: 'absolute' }, text: '此文件夹中没有可预览的图片' });

      const prevBtn = el('button', { class: 't-btn', html: '<svg viewBox="0 0 24 24"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>', title: '上一张' });
      const nextBtn = el('button', { class: 't-btn', html: '<svg viewBox="0 0 24 24"><path d="M8.6 7.4 10 6l6 6-6 6-1.4-1.4L13.2 12z"/></svg>', title: '下一张' });
      const zoomIn = el('button', { class: 't-btn', html: '<svg viewBox="0 0 24 24"><path d="M11 5v6H5v2h6v6h2v-6h6v-2h-6V5z"/></svg>', title: '放大' });
      const zoomOut = el('button', { class: 't-btn', html: '<svg viewBox="0 0 24 24"><path d="M5 11h14v2H5z"/></svg>', title: '缩小' });
      const rotBtn = el('button', { class: 't-btn', html: '<svg viewBox="0 0 24 24"><path d="M12 6V3L7 7l5 4V8a4 4 0 1 1-4 4H6a6 6 0 1 0 6-6z"/></svg>', title: '旋转' });
      const nameLabel = el('div', { style: { color: '#9aa6cc', fontSize: '12.5px', flex: '1' } });

      const bar = el('div', { class: 'ph-bar' }, [prevBtn, zoomOut, zoomIn, rotBtn, nextBtn, nameLabel]);
      const root = el('div', { class: 'app-col ph' }, [stage, bar]);

      function apply() { img.style.transform = `scale(${zoom}) rotate(${rotate}deg)`; }

      function show() {
        const node = list[index];
        stage.querySelectorAll('.br-note').forEach(n => n.remove());
        if (!node) {
          img.style.display = 'none';
          stage.appendChild(empty);
          nameLabel.textContent = '0 / 0';
          win.setTitle('图片查看器');
          return;
        }
        img.style.display = '';
        const src = srcOf(node);
        if (!src) { img.style.display = 'none'; stage.appendChild(empty); }
        else img.src = src;
        zoom = 1; rotate = 0; apply();
        nameLabel.textContent = `${index + 1} / ${list.length}  ·  ${node.name}  ·  ${fmtSize(node.size)}`;
        win.setSub(node.name);
        prevBtn.disabled = index <= 0;
        nextBtn.disabled = index >= list.length - 1;
      }

      function loadFrom(path) {
        const node = FS.stat(path);
        if (!node || node.type !== 'file') { list = []; index = 0; show(); return; }
        const dir = path.split('/').slice(0, -1).join('/') || '/';
        list = (FS.list(dir) || []).filter(n => n.type === 'file' && IMG_EXT.includes(FS.ext(n.name)));
        index = list.findIndex(n => n.name === node.name);
        if (index < 0) { list = [node]; index = 0; }
        show();
      }

      prevBtn.addEventListener('click', () => { if (index > 0) { index--; show(); } });
      nextBtn.addEventListener('click', () => { if (index < list.length - 1) { index++; show(); } });
      zoomIn.addEventListener('click', () => { zoom = Math.min(6, zoom + 0.25); apply(); });
      zoomOut.addEventListener('click', () => { zoom = Math.max(0.2, zoom - 0.25); apply(); });
      rotBtn.addEventListener('click', () => { rotate = (rotate + 90) % 360; apply(); });
      stage.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(0.2, Math.min(6, zoom + (e.deltaY < 0 ? 0.15 : -0.15))); apply(); }, { passive: false });

      win.body.appendChild(root);
      if (args.path) loadFrom(args.path);
      else {
        list = (FS.list('/Home/Pictures') || []).filter(n => IMG_EXT.includes(FS.ext(n.name)));
        index = 0; show();
      }
      win.deliver = a => { if (a && a.path) loadFrom(a.path); };
    }
  });
})();