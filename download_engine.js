(() => {
  'use strict';

  const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
  const MAX_RETRIES = 2;
  const CONNECT_TIMEOUT_MS = 15000;
  const MIME_OK = /^(video\/|audio\/|application\/octet-stream)/i;

  window.YTDownloadEngine = {
    version: '2.0.0',
    async download(options) {
      const { url, filename, onProgress, onBytes } = options || {};
      validateUrl(url);
      let lastError = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          return await fetchAndSave(url, filename, onProgress, onBytes, attempt);
        } catch (error) {
          lastError = error;
          if (!shouldRetry(error, attempt)) throw error;
          await delay(600 * (attempt + 1));
        }
      }
      throw lastError || new Error('ดาวน์โหลดไม่สำเร็จ');
    }
  };

  async function fetchAndSave(url, filename, onProgress, onBytes, attempt) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        referrer: 'https://www.youtube.com/',
        referrerPolicy: 'strict-origin-when-cross-origin',
        headers: {
          Range: 'bytes=0-',
          Accept: 'video/*,audio/*,application/octet-stream;q=0.9,*/*;q=0.1'
        },
        signal: controller.signal
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('หมดเวลารอเซิร์ฟเวอร์สตรีม (15 วินาที)');
      throw new Error(`เชื่อมต่อสตรีมไม่ได้: ${error?.message || error}`);
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new DownloadHttpError(response.status);
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (!MIME_OK.test(type) || type.includes('text/html') || type.includes('text/plain')) {
      throw new Error(`ปลายทางส่งข้อมูลไม่ใช่สื่อ (${type || 'unknown'})`);
    }
    if (!response.body) throw new Error('เบราว์เซอร์ไม่พบข้อมูลสตรีม');

    const total = parseTotal(response);
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    let lastPercent = -1;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value?.byteLength) continue;
        chunks.push(value);
        received += value.byteLength;
        if (total) {
          const percent = Math.min(100, Math.floor(received * 100 / total));
          if (percent !== lastPercent) {
            lastPercent = percent;
            onProgress?.(percent, received, total, attempt);
          }
        } else {
          onBytes?.(received, attempt);
        }
      }
    } catch (error) {
      try { await reader.cancel(); } catch (_) {}
      throw new Error(`รับข้อมูลสตรีมไม่ครบ: ${error?.message || error}`);
    }

    if (!received) throw new Error('สตรีมว่างเปล่า');
    if (total && received < total) throw new Error(`ดาวน์โหลดไม่ครบ (${received}/${total} bytes)`);

    const blob = new Blob(chunks, { type: type || 'video/mp4' });
    if (!blob.size) throw new Error('สร้างไฟล์จากสตรีมไม่สำเร็จ');
    await saveBlob(blob, filename);
    onProgress?.(100, received, total || received, attempt);
    return { bytes: received, contentType: type, attempt };
  }

  async function saveBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename || 'youtube-video.mp4';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    }
  }
  function parseTotal(response) {
    const range = response.headers.get('content-range') || '';
    const match = /\/([0-9]+)$/.exec(range);
    if (match) return Number(match[1]);
    return Number(response.headers.get('content-length')) || 0;
  }

  function validateUrl(url) {
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' || !/(^|\.)googlevideo\.com$/.test(u.hostname)) {
        throw new Error('URL สตรีมไม่ได้มาจาก googlevideo.com');
      }
      if (!u.pathname.includes('/videoplayback')) throw new Error('URL ไม่ใช่ playback stream');
    } catch (error) {
      throw new Error(error?.message || 'URL สตรีมไม่ถูกต้อง');
    }
  }

  function shouldRetry(error, attempt) {
    if (attempt >= MAX_RETRIES) return false;
    if (error instanceof DownloadHttpError) return RETRYABLE.has(error.status);
    return /หมดเวลา|เชื่อมต่อ|รับข้อมูล|network|failed|networkerror/i.test(error?.message || '');
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  class DownloadHttpError extends Error {
    constructor(status) {
      super(`HTTP ${status}`);
      this.name = 'DownloadHttpError';
      this.status = status;
    }
  }
})();
