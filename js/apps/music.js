/* ============================================================
 * KevinOS · 音乐播放器（可安装应用）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;
  const STORE_KEY = 'kevinos-music-playlist';

  function loadList() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; } }
  function saveList(l) { localStorage.setItem(STORE_KEY, JSON.stringify(l)); }

  K.registerApp({
    id: 'music', name: '音乐', icon: 'media', installable: true,
    gradient: ['#BE123C', '#FB7185'], category: '媒体',
    size: { w: 520, h: 640 },
    mount(win) {
      let tracks = loadList();
      let current = -1;
      let playing = false;
      const audio = new Audio();
      audio.volume = 0.8;

      const listEl = el('div', { class: 'music-list' });
      const titleEl = el('div', { class: 'music-title', text: '未播放' });
      const artistEl = el('div', { class: 'music-artist', text: '选择一首歌开始播放' });
      const progress = el('input', { type: 'range', class: 'music-progress', min: '0', max: '100', value: '0' });
      const curTime = el('span', { class: 'music-time', text: '0:00' });
      const durTime = el('span', { class: 'music-time', text: '0:00' });
      const playBtn = el('button', { class: 'music-ctrl', html: '▶', title: '播放' });
      const prevBtn = el('button', { class: 'music-ctrl', text: '⏮', title: '上一首' });
      const nextBtn = el('button', { class: 'music-ctrl', text: '⏭', title: '下一首' });
      const volSlider = el('input', { type: 'range', min: '0', max: '100', value: '80', class: 'music-vol' });

      function fmt(s) {
        if (!isFinite(s)) return '0:00';
        const m = Math.floor(s / 60), sec = Math.floor(s % 60);
        return m + ':' + String(sec).padStart(2, '0');
      }
      function renderList() {
        listEl.innerHTML = '';
        if (!tracks.length) {
          listEl.appendChild(el('div', { class: 'music-empty', text: '播放列表为空，点击「添加音乐」导入本地音频文件' }));
          return;
        }
        tracks.forEach((t, i) => {
          const item = el('div', { class: 'music-item' + (i === current ? ' active' : '') }, [
            el('span', { class: 'music-idx', text: String(i + 1) }),
            el('span', { class: 'music-name', text: t.name }),
            el('button', { class: 'music-del', html: '×' }, null)
          ]);
          item.querySelector('.music-del').addEventListener('click', e => { e.stopPropagation(); tracks.splice(i, 1); saveList(tracks); if (current === i) { current = -1; audio.pause(); } else if (current > i) current--; renderList(); });
          item.addEventListener('click', () => play(i));
          listEl.appendChild(item);
        });
      }
      function play(i) {
        if (i < 0 || i >= tracks.length) return;
        current = i;
        audio.src = tracks[i].dataUrl;
        audio.play().then(() => { playing = true; playBtn.textContent = '⏸'; }).catch(() => {});
        titleEl.textContent = tracks[i].name;
        artistEl.textContent = tracks[i].name;
        renderList();
      }
      function togglePlay() {
        if (current < 0) { play(0); return; }
        if (playing) { audio.pause(); playBtn.textContent = '▶'; }
        else { audio.play(); playBtn.textContent = '⏸'; }
        playing = !playing;
      }

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) { progress.value = (audio.currentTime / audio.duration) * 100; curTime.textContent = fmt(audio.currentTime); }
      });
      audio.addEventListener('loadedmetadata', () => { durTime.textContent = fmt(audio.duration); });
      audio.addEventListener('ended', () => { if (current < tracks.length - 1) play(current + 1); else { playing = false; playBtn.textContent = '▶'; } });
      progress.addEventListener('input', () => { if (audio.duration) audio.currentTime = (progress.value / 100) * audio.duration; });
      volSlider.addEventListener('input', () => { audio.volume = volSlider.value / 100; });
      playBtn.addEventListener('click', togglePlay);
      prevBtn.addEventListener('click', () => { if (current > 0) play(current - 1); });
      nextBtn.addEventListener('click', () => { if (current < tracks.length - 1) play(current + 1); });

      const addBtn = el('button', { class: 'btn primary', text: '＋ 添加音乐' });
      const fileInput = el('input', { type: 'file', accept: 'audio/*', multiple: true, style: { display: 'none' } });
      addBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        Array.from(fileInput.files).forEach(f => {
          const reader = new FileReader();
          reader.onload = () => { tracks.push({ name: f.name, dataUrl: reader.result }); saveList(tracks); renderList(); };
          reader.readAsDataURL(f);
        });
        fileInput.value = '';
      });

      const header = el('div', { class: 'music-header' }, [
        el('h2', { text: '音乐' }),
        addBtn, fileInput
      ]);
      const nowPlaying = el('div', { class: 'music-now' }, [titleEl, artistEl]);
      const controls = el('div', { class: 'music-controls' }, [prevBtn, playBtn, nextBtn]);
      const progRow = el('div', { class: 'music-prog-row' }, [curTime, progress, durTime]);
      const volRow = el('div', { class: 'music-vol-row' }, [el('span', { text: '🔊' }), volSlider]);
      const player = el('div', { class: 'music-player' }, [nowPlaying, progRow, controls, volRow]);
      const root = el('div', { class: 'app-col music-root' }, [header, listEl, player]);
      win.body.appendChild(root);
      renderList();

      win.onClose = () => { audio.pause(); };
    }
  });
})();
