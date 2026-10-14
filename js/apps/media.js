/* ============================================================
 * KevinOS · 媒体播放器（Web Audio 合成 + 可视化）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;
  const FS = K.FS;

  // 合成曲目定义（简单音阶循环）
  const TRACKS = [
    { title: 'Navy Dawn', artist: 'KevinOS Synth', scale: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25], bpm: 132, color: ['#4f7cff', '#22d3ee'] },
    { title: 'Hexagon Dreams', artist: 'KevinOS Synth', scale: [220.0, 246.94, 293.66, 329.63, 392.0, 440.0], bpm: 96, color: ['#9b6bff', '#d38fff'] },
    { title: 'Silicon Rain', artist: 'KevinOS Synth', scale: [196.0, 233.08, 261.63, 311.13, 349.23, 392.0], bpm: 150, color: ['#10b981', '#34d399'] }
  ];

  let ACTX = null;
  function audioCtx() {
    if (!ACTX) ACTX = new (window.AudioContext || window.webkitAudioContext)();
    if (ACTX.state === 'suspended') ACTX.resume();
    return ACTX;
  }

  K.registerApp({
    id: 'media', name: '媒体播放器', icon: 'media',
    gradient: ['#BE123C', '#FB7185'], pinned: false, category: '媒体',
    size: { w: 420, h: 620 },
    mount(win, args) {
      let current = 0, playing = false, progress = 0, duration = 30;
      let timer = null, noteTimer = null, step = 0;
      let analyser = null, gainNode = null, srcNode = null;

      const disc = el('div', { class: 'media-disc' });
      const art = el('div', { class: 'media-art' }, [disc]);
      const titleEl = el('div', { class: 'mt' });
      const artistEl = el('div', { class: 'ma' });
      const info = el('div', { class: 'media-info' }, [titleEl, artistEl]);

      const barFill = el('div', { class: 'media-progress-bar' });
      const progressEl = el('div', { class: 'media-progress' }, [barFill]);
      const tCur = el('span', { text: '0:00' });
      const tDur = el('span', { text: '0:30' });
      const times = el('div', { class: 'media-times' }, [tCur, tDur]);

      const prevBtn = el('button', { html: '<svg viewBox="0 0 24 24" class="ico"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>' });
      const playBtn = el('button', { class: 'play', html: '<svg viewBox="0 0 24 24" class="ico"><path d="M8 5v14l11-7z"/></svg>' });
      const nextBtn = el('button', { html: '<svg viewBox="0 0 24 24" class="ico"><path d="M16 6h2v12h-2zM6 6v12l8.5-6z"/></svg>' });
      const btns = el('div', { class: 'media-btns' }, [prevBtn, playBtn, nextBtn]);

      const visual = el('div', { class: 'media-vis' });
      const bars = [];
      for (let i = 0; i < 28; i++) { const b = el('span'); bars.push(b); visual.appendChild(b); }

      const root = el('div', { class: 'app-col media' }, [art, info, el('div', { class: 'media-ctrl' }, [progressEl, times]), btns, visual]);

      function fmt(s) { const m = Math.floor(s / 60); const x = Math.floor(s % 60); return m + ':' + String(x).padStart(2, '0'); }

      function loadTrack(i) {
        current = (i + TRACKS.length) % TRACKS.length;
        const tr = TRACKS[current];
        titleEl.textContent = tr.title;
        artistEl.textContent = tr.artist;
        disc.style.background = `conic-gradient(from 0deg, ${tr.color[0]}, ${tr.color[1]}, ${tr.color[0]})`;
        progress = 0; barFill.style.width = '0%'; tCur.textContent = '0:00'; tDur.textContent = '0:30';
        win.setTitle('媒体播放器');
        win.setSub(tr.title);
      }

      /* ---- 合成发声 ---- */
      function startSynth() {
        const ctx = audioCtx();
        analyser = ctx.createAnalyser(); analyser.fftSize = 64;
        gainNode = ctx.createGain(); gainNode.gain.value = 0.16;
        gainNode.connect(analyser); analyser.connect(ctx.destination);
        const tr = TRACKS[current];
        const beat = 60 / tr.bpm / 2;
        step = 0;
        noteTimer = setInterval(() => {
          if (!playing) return;
          const t = ctx.currentTime;
          const freq = tr.scale[Math.floor(Math.random() * tr.scale.length)] * (Math.random() < 0.3 ? 2 : 1);
          const osc = ctx.createOscillator();
          const env = ctx.createGain();
          osc.type = 'triangle'; osc.frequency.value = freq;
          env.gain.setValueAtTime(0, t);
          env.gain.linearRampToValueAtTime(0.5, t + 0.02);
          env.gain.exponentialRampToValueAtTime(0.001, t + beat * 1.6);
          osc.connect(env); env.connect(gainNode);
          osc.start(t); osc.stop(t + beat * 1.8);
          // 低音
          if (step % 4 === 0) {
            const bass = ctx.createOscillator(); const benv = ctx.createGain();
            bass.type = 'sine'; bass.frequency.value = tr.scale[0] / 2;
            benv.gain.setValueAtTime(0.4, t); benv.gain.exponentialRampToValueAtTime(0.001, t + beat * 3);
            bass.connect(benv); benv.connect(gainNode); bass.start(t); bass.stop(t + beat * 3);
          }
          step++;
        }, beat * 1000);
      }
      function stopSynth() {
        if (noteTimer) { clearInterval(noteTimer); noteTimer = null; }
      }

      function drawVis() {
        bars.forEach((b, i) => {
          let v;
          if (playing && analyser) {
            const data = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(data);
            v = (data[i % data.length] || 0) / 255;
          } else v = 0.12 + Math.random() * 0.06;
          b.style.height = Math.max(6, v * 100) + '%';
        });
        requestAnimationFrame(drawVis);
      }
      requestAnimationFrame(drawVis);

      function tick() {
        if (!playing) return;
        progress += 0.1;
        if (progress >= duration) { progress = 0; next(); return; }
        barFill.style.width = (progress / duration * 100) + '%';
        tCur.textContent = fmt(progress);
      }

      function play() {
        if (playing) return;
        playing = true;
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" class="ico"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
        disc.classList.add('spin');
        startSynth();
        timer = setInterval(tick, 100);
      }
      function pause() {
        playing = false;
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" class="ico"><path d="M8 5v14l11-7z"/></svg>';
        disc.classList.remove('spin');
        stopSynth();
        clearInterval(timer); timer = null;
      }
      function next() { const p = playing; pause(); loadTrack(current + 1); if (p) play(); }
      function prev() { const p = playing; pause(); loadTrack(current - 1); if (p) play(); }

      playBtn.addEventListener('click', () => playing ? pause() : play());
      nextBtn.addEventListener('click', next);
      prevBtn.addEventListener('click', prev);
      progressEl.addEventListener('click', e => {
        const r = progressEl.getBoundingClientRect();
        progress = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration;
        barFill.style.width = (progress / duration * 100) + '%'; tCur.textContent = fmt(progress);
      });

      win.cleanups.push(() => { pause(); });
      win.body.appendChild(root);
      loadTrack(0);
    }
  });
})();