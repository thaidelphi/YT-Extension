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
    notify(jobId, { ok: true, phase: 'connecting', progress: 0 });
    try {
      const result = await window.YTDownloadEngine.download({
        url,
        filename,
        onProgress: (progress, received, total, attempt) => {
          notify(jobId, { ok: true, phase: 'downloading', progress, bytes: received, total, attempt });
        },
        onBytes: (received, attempt) => {
          notify(jobId, { ok: true, phase: 'downloading', bytes: received, attempt });
        }
      });
      notify(jobId, { ok: true, done: true, phase: 'completed', bytes: result.bytes, contentType: result.contentType, attempt: result.attempt });
    } catch (error) {
      const message = error?.message || String(error);
      notify(jobId, { ok: false, phase: 'failed', error: message });
      throw error;
    }
  }

  function notify(jobId, payload) {
    return chrome.runtime.sendMessage({ type: 'OFFSCREEN_DOWNLOAD_STATUS', jobId, ...payload }).catch(() => {});
  }
})();
