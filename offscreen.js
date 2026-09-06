(() => {
  'use strict';

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== 'OFFSCREEN_DOWNLOAD') return;
    sendResponse({ ok: true });
    download(message).catch(error => {
      notify(message.jobId, { ok: false, error: error?.message || String(error) });
    });
  });

  async function download({ url, filename, jobId }) {
    let response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
        referrer: 'https://www.youtube.com/',
        referrerPolicy: 'strict-origin-when-cross-origin',
        signal: controller.signal
      });
    } catch (error) {
      const message = error?.name === 'AbortError'
        ? 'หมดเวลารอเซิร์ฟเวอร์สตรีม (20 วินาที)'
        : `เชื่อมต่อสตรีมไม่ได้: ${error.message || error}`;
      notify(jobId, { ok: false, error: message });
      throw new Error(message);
    } finally {
      clearTimeout(timeout);
    }

    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      notify(jobId, { ok: false, error: `ดาวน์โหลดไม่สำเร็จ: HTTP ${response.status}` });
      throw error;
    }
    if (type.includes('text/html') || type.includes('text/plain')) {
      const error = new Error('เซิร์ฟเวอร์ส่งข้อมูลที่ไม่ใช่วิดีโอ');
      notify(jobId, { ok: false, error: error.message });
      throw error;
    }
    if (!response.body) throw new Error('ไม่พบข้อมูลสตรีม');

    const total = Number(response.headers.get('content-length')) || 0;
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    let lastPercent = -1;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (total) {
        const percent = Math.min(100, Math.floor(received * 100 / total));
        if (percent !== lastPercent) {
          lastPercent = percent;
          notify(jobId, { ok: true, progress: percent });
        }
      } else {
        notify(jobId, { ok: true, bytes: received });
      }
    }

    const blob = new Blob(chunks, { type: type || 'video/mp4' });
    const objectUrl = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename || 'youtube-video.mp4';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      notify(jobId, { ok: true, done: true });
    } finally {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    }
  }

  function notify(jobId, payload) {
    return chrome.runtime.sendMessage({ type: 'OFFSCREEN_DOWNLOAD_STATUS', jobId, ...payload }).catch(() => {});
  }
})();
