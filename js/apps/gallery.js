/* ============================================================
 * KevinOS · 图片相册（可安装应用）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;
  const FS = K.FS;

  K.registerApp({
    id: 'gallery', name: '相册', icon: 'gallery', installable: true,
    gradient: ['#6D28D9', '#A78BFA'], category: '媒体',
    size: { w: 780, h: 600 },
    mount(win) {
      const grid = el('div', { class: 'gallery-grid' });
      const viewer = el('div', { class: 'gallery-viewer', style: { display: 'none' } });
      const refreshBtn = el('button', { class: 'btn', text: '刷新' });
      refreshBtn.addEventListener('click', render);
      const toolbar = el('div', { class: 'gallery-toolbar' }, [el('h2', { text: '相册' }), refreshBtn]);
      const root = el('div', { class: 'app-col gallery-root' }, [toolbar, grid, viewer]);
      win.body.appendChild(root);

      const IMG_EXT = ['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
      const images = [];

      function walk(path) {
        (FS.list(path) || []).forEach(n => {
          if (n.type === 'folder') walk(path + '/' + n.name);
          else {
            const e = (n.name.split('.').pop() || '').toLowerCase();
            if (IMG_EXT.includes(e)) images.push({ name: n.name, path: path + '/' + n.name, content: n.content });
          }
        });
      }

      function render() {
        grid.innerHTML = '';
        images.length = 0;
        walk('/Home/Pictures');
        walk('/Home/Desktop');
        if (!images.length) {
          grid.appendChild(el('div', { class: 'gallery-empty', text: '暂无图片，可将图片保存到 Pictures 文件夹' }));
          return;
        }
        images.forEach((img, i) => {
          const card = el('div', { class: 'gallery-item' }, [
            el('img', { src: img.content.startsWith('<svg') || img.content.startsWith('data:') ? img.content : ('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(img.content)))) , alt: img.name }),
            el('div', { class: 'gallery-name', text: img.name })
          ]);
          card.addEventListener('click', () => view(i));
          grid.appendChild(card);
        });
      }

      let idx = 0;
      function view(i) {
        idx = i;
        viewer.style.display = 'flex';
        viewer.innerHTML = '';
        const closeBtn = el('button', { class: 'gallery-close', text: '×' });
        closeBtn.addEventListener('click', () => viewer.style.display = 'none');
        const prev = el('button', { class: 'gallery-nav', text: '‹' });
        const next = el('button', { class: 'gallery-nav right', text: '›' });
        prev.addEventListener('click', () => { if (idx > 0) view(idx - 1); });
        next.addEventListener('click', () => { if (idx < images.length - 1) view(idx + 1); });
        const imgSrc = images[idx].content.startsWith('<svg') ? 'data:image/svg+xml;utf8,' + encodeURIComponent(images[idx].content) : images[idx].content;
        const img = el('img', { src: imgSrc, class: 'gallery-full' });
        const caption = el('div', { class: 'gallery-caption', text: images[idx].name + ` (${idx + 1}/${images.length})` });
        viewer.append(prev, img, next, closeBtn, caption);
      }

      render();
    }
  });
})();
