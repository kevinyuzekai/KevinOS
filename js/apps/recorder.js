/* ============================================================
 * KevinOS · 屏幕录制（可安装应用）
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;

  K.registerApp({
    id: 'recorder', name: '录屏', icon: 'media', installable: true,
    gradient: ['#BE123C', '#FB7185'], category: '媒体',
    size: { w: 640, h: 520 },
    mount(win) {
      const video = el('video', { class: 'rec-video', autoplay: 'autoplay', muted: 'muted' });
      const statusEl = el('div', { class: 'rec-status', text: '点击「开始录制」选择要录制的屏幕' });
      const startBtn = el('button', { class: 'btn primary', text: '● 开始录制' });
      const stopBtn = el('button', { class: 'btn', text: '■ 停止', disabled: 'disabled' });
      const downloadBtn = el('button', { class: 'btn', text: '↓ 下载视频', disabled: 'disabled' });

      let stream = null, recorder = null, chunks = [], blobUrl = null;

      startBtn.addEventListener('click', async () => {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          video.srcObject = stream;
          recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
          chunks = [];
          recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            blobUrl = URL.createObjectURL(blob);
            downloadBtn.disabled = false;
            statusEl.textContent = `录制完成，视频大小: ${(blob.size / 1024 / 1024).toFixed(2)} MB`;
          };
          recorder.start();
          startBtn.disabled = true; stopBtn.disabled = false;
          statusEl.textContent = '录制中…';
          stream.getVideoTracks()[0].onended = () => stopBtn.click();
        } catch (e) {
          statusEl.textContent = '录制失败：' + e.message;
        }
      });

      stopBtn.addEventListener('click', () => {
        if (recorder && recorder.state !== 'inactive') recorder.stop();
        if (stream) stream.getTracks().forEach(t => t.stop());
        startBtn.disabled = false; stopBtn.disabled = true;
        video.srcObject = null;
      });

      downloadBtn.addEventListener('click', () => {
        if (blobUrl) {
          const a = el('a', { href: blobUrl, download: 'kevinos-recording-' + Date.now() + '.webm' });
          a.click();
        }
      });

      const controls = el('div', { class: 'rec-controls' }, [startBtn, stopBtn, downloadBtn]);
      const root = el('div', { class: 'app-col rec-root' }, [video, statusEl, controls]);
      win.body.appendChild(root);
    }
  });
})();
