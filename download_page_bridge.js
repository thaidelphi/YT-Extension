(() => {
  'use strict';
  if (window.__YT_DOWNLOAD_PAGE_BRIDGE__) return;
  window.__YT_DOWNLOAD_PAGE_BRIDGE__ = true;
  window.addEventListener('YT_EXTENSION_DOWNLOAD', async event => {
    const detail = event.detail || {};
    if (!detail.url || !detail.jobId) return;
    const post = payload => window.dispatchEvent(new CustomEvent('YT_EXTENSION_DOWNLOAD_STATUS', {
      detail: { jobId: detail.jobId, ...payload }
    }));
    try {
      post({ phase: 'connecting', progress: 0 });
      const response = await fetch(detail.url, {
        method: 'GET', credentials: 'include', cache: 'no-store',
        headers: { Range: 'bytes=0-' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const type = (response.headers.get('content-type') || '').toLowerCase();
      if (!/^(video\/|audio\/|application\/octet-stream)/i.test(type)) {
        throw new Error(`ปลายทางส่งข้อมูลไม่ใช่สื่อ (${type || 'unknown'})`);
      }
      if (!response.body) throw new Error('ไม่พบข้อมูลสตรีม');
      const total = Number(response.headers.get('content-length')) || 0;
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value?.byteLength) continue;
        chunks.push(value);
        received += value.byteLength;
        post({ phase: 'downloading', progress: total ? Math.floor(received * 100 / total) : null, bytes: received, total });
      }
      if (!received) throw new Error('สตรีมว่างเปล่า');
      const blob = new Blob(chunks, { type: type || 'video/mp4' });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = detail.filename || 'youtube-video.mp4';
      anchor.style.display = 'none';
      document.documentElement.appendChild(anchor);
      anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      post({ phase: 'completed', done: true, bytes: received, contentType: type });
    } catch (error) {
      post({ phase: 'failed', error: error?.message || String(error) });
    }
  });
})();
