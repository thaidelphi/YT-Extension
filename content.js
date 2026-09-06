(() => {
  'use strict';
  let lastVideoId = null;
  let button = null;
  let speedControl = null;
  let speedButton = null;
  let downloadButton = null;
  let mountScheduled = false;
  let errorTimer = null;

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const getVideoId = () => new URL(location.href).searchParams.get('v');
  const video = () => document.querySelector('video.html5-main-video, video');

  function createButton() {
    const el = document.createElement('button');
    el.id = 'yt-dislike-restorer';
    el.type = 'button';
    el.className = 'yt-dr-button';
    el.title = 'Dislike';
    el.setAttribute('aria-label', 'Dislike');
    el.setAttribute('aria-pressed', 'false');
    el.innerHTML = '<svg class="yt-dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 10V21H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3Zm2 0h6.7c1.2 0 2.1 1.1 1.8 2.3l-1.2 5.1A3 3 0 0 1 15.4 20H11V10Zm0-1.5V4.2A2.2 2.2 0 0 1 13.2 2c.9 0 1.6.7 1.6 1.6v1.1c0 .9-.2 1.7-.6 2.5L13 8.5H11Z"/></svg><span>Dislike</span>';
    el.addEventListener('click', () => toggleDislike(el));
    return el;
  }

  function formatSpeed(rate) {
    const value = Number(rate) || 1;
    return `${Number.isInteger(value) ? value : value}×`;
  }

  function createDownloadButton() {
    const wrap = document.createElement('div');
    wrap.id = 'yt-extension-download';
    wrap.className = 'yt-download-control';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'yt-extension-download';
    button.textContent = 'Download';
    button.title = 'ดาวน์โหลดวิดีโอ';
    button.setAttribute('aria-label', 'ดาวน์โหลดวิดีโอ');
    button.setAttribute('aria-expanded', 'false');

    const menu = document.createElement('div');
    menu.className = 'yt-download-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = '<div class="yt-download-status">กำลังค้นหาสตรีม...</div>';

    button.addEventListener('click', async event => {
      event.stopPropagation();
      const open = wrap.classList.toggle('yt-download-open');
      button.setAttribute('aria-expanded', String(open));
      if (open) await loadDownloadFormats(menu);
    });

    wrap.append(button, menu);
    return wrap;
  }

  async function loadDownloadFormats(menu) {
    menu.innerHTML = '<div class="yt-download-status">กำลังค้นหาสตรีม...</div>';
    try {
      const playbackUrls = collectPlaybackUrls();
      const result = await chrome.runtime.sendMessage({
        type: 'GET_DOWNLOAD_FORMATS',
        videoUrl: location.href,
        playbackUrls
      });
      if (!result?.ok) throw new Error(result?.error || 'ไม่สามารถค้นหาสตรีมได้');
      const formats = (result.formats || []).filter(item => item.url && !/[?&](?:range|rn|rbuf)=/.test(item.url));
      if (!formats.length) throw new Error('วิดีโอนี้ไม่มีสตรีมไฟล์เดี่ยวที่ดาวน์โหลดได้');

      menu.textContent = '';
      formats.forEach(format => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'yt-download-option';
        item.setAttribute('role', 'menuitem');
        const size = format.contentLength ? ` • ${formatBytes(format.contentLength)}` : '';
        item.textContent = `${format.qualityLabel || 'Video'}${format.fps ? ` • ${format.fps}fps` : ''}${size}`;
        item.addEventListener('click', async event => {
          event.stopPropagation();
          item.disabled = true;
          item.textContent = `กำลังดาวน์โหลด ${format.qualityLabel || 'Video'}... 0%`;
          try {
            const filename = `${sanitizeDownloadName(result.title)}-${format.qualityLabel || 'video'}.mp4`;
            await downloadStreamToFile(format.url, filename, item);
          } catch (error) {
            item.disabled = false;
            item.textContent = `ดาวน์โหลดไม่สำเร็จ: ${error.message}`;
          }
        });
        menu.appendChild(item);
      });
    } catch (error) {
      menu.innerHTML = `<div class="yt-download-status yt-download-error">${escapeHtml(error.message)}</div>`;
    }
  }

  async function downloadStreamToFile(streamUrl, filename, statusItem) {
    const response = await fetch(streamUrl, { credentials: 'include', cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html') || contentType.includes('text/plain')) {
      throw new Error('เซิร์ฟเวอร์ส่งข้อมูลที่ไม่ใช่วิดีโอ');
    }
    if (!response.body) throw new Error('เบราว์เซอร์ไม่รองรับการอ่านสตรีม');

    const total = Number(response.headers.get('content-length')) || 0;
    const chunks = [];
    const reader = response.body.getReader();
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (total) statusItem.textContent = `กำลังดาวน์โหลด... ${Math.min(100, Math.floor(received * 100 / total))}%`;
      else statusItem.textContent = `กำลังดาวน์โหลด... ${formatBytes(received)}`;
    }

    const blob = new Blob(chunks, { type: contentType || 'video/mp4' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.documentElement.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    statusItem.disabled = false;
    statusItem.textContent = 'ดาวน์โหลดเสร็จแล้ว ✓';
  }

  function sanitizeDownloadName(name) {
    return String(name || 'youtube-video').replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 120) || 'youtube-video';
  }

  async function recordCurrentPlayback(item, wrap) {
    const v = video();
    if (!v || typeof v.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      item.textContent = 'Chrome ไม่รองรับการบันทึกวิดีโอ';
      return;
    }
    if (v.ended) v.currentTime = 0;
    const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      item.textContent = 'ไม่พบรูปแบบ WebM ที่รองรับ';
      return;
    }

    const chunks = [];
    const recorder = new MediaRecorder(v.captureStream(), { mimeType });
    const originalText = item.textContent;
    const startedAt = v.currentTime;
    let timer = null;

    item.disabled = true;
    wrap.classList.add('yt-download-recording');
    item.textContent = 'กำลังบันทึก... 0:00';
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => {
      clearInterval(timer);
      item.disabled = false;
      item.textContent = 'บันทึกไม่สำเร็จ';
      wrap.classList.remove('yt-download-recording');
    };
    recorder.onstop = () => {
      clearInterval(timer);
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sanitizeDownloadName(document.title)}.webm`;
      document.documentElement.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      item.disabled = false;
      item.textContent = originalText;
      wrap.classList.remove('yt-download-recording');
      wrap.classList.remove('yt-download-open');
    };

    const stop = () => { if (recorder.state !== 'inactive') recorder.stop(); };
    v.addEventListener('ended', stop, { once: true });
    timer = setInterval(() => {
      const elapsed = Math.max(0, Math.floor(v.currentTime - startedAt));
      item.textContent = `กำลังบันทึก... ${formatDuration(elapsed)}`;
    }, 1000);
    recorder.start(1000);
    try { await v.play(); } catch (_) {}
  }

  function sanitizeDownloadName(name) {
    return String(name || 'youtube-video').replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 120) || 'youtube-video';
  }

  function formatDuration(seconds) {
    const value = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(value / 60);
    const secs = String(value % 60).padStart(2, '0');
    return `${minutes}:${secs}`;
  }

  function collectPlaybackUrls() {
    const urls = [];
    const current = video()?.currentSrc;
    if (current && /^https:\/\//.test(current)) urls.push(current);
    for (const entry of performance.getEntriesByType('resource')) {
      const name = entry.name || '';
      if (/^https:\/\/[^/]*googlevideo\.com\//.test(name) && /videoplayback/.test(name)) urls.push(name);
    }
    return [...new Set(urls)].slice(-20);
  }

  function formatBytes(bytes) {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = Number(bytes);
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
    return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
  }

  function createSpeedControl() {
    const wrap = document.createElement('div');
    wrap.id = 'yt-speed-control';
    wrap.className = 'yt-speed-control';
    speedButton = document.createElement('button');
    speedButton.type = 'button';
    speedButton.className = 'yt-speed-button';
    speedButton.title = 'เปลี่ยนความเร็วการเล่น';
    speedButton.setAttribute('aria-label', 'เปลี่ยนความเร็วการเล่น');
    speedButton.innerHTML = '<span class="yt-speed-value">1×</span>';
    speedButton.addEventListener('click', event => {
      event.stopPropagation();
      const open = wrap.classList.toggle('yt-speed-open');
      speedButton.setAttribute('aria-expanded', String(open));
    });

    const menu = document.createElement('div');
    menu.className = 'yt-speed-menu';
    menu.setAttribute('role', 'menu');
    SPEEDS.forEach(rate => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'yt-speed-option';
      item.dataset.rate = String(rate);
      item.textContent = formatSpeed(rate);
      item.setAttribute('role', 'menuitem');
      item.addEventListener('click', event => {
        event.stopPropagation();
        setPlaybackRate(rate);
        wrap.classList.remove('yt-speed-open');
        speedButton.setAttribute('aria-expanded', 'false');
      });
      menu.appendChild(item);
    });

    wrap.append(speedButton, menu);
    return wrap;
  }

  function updateSpeed(rate) {
    if (!speedButton) return;
    const value = formatSpeed(rate);
    speedButton.querySelector('.yt-speed-value').textContent = value;
    speedButton.title = `ความเร็ว ${value} • คลิกเพื่อเลือก`;
    speedButton.setAttribute('aria-label', `ความเร็ว ${value} • คลิกเพื่อเลือก`);
    speedControl?.querySelectorAll('.yt-speed-option').forEach(item => {
      item.classList.toggle('yt-speed-selected', Number(item.dataset.rate) === Number(rate));
    });
  }

  function setPlaybackRate(rate) {
    const v = video();
    if (!v) return;
    const normalized = Number(rate);
    if (!Number.isFinite(normalized)) return;
    v.playbackRate = normalized;
    updateSpeed(normalized);
  }

  async function applyDefaultSpeed() {
    const data = await chrome.storage.local.get(['defaultSpeed']);
    const rate = Number(data.defaultSpeed || 1);
    const v = video();
    if (v && Number.isFinite(rate)) setPlaybackRate(rate);
  }
  function updateButton(rating) {
    if (!button) return;
    const active = rating === 'dislike';
    button.classList.toggle('yt-dr-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.title = active ? 'Remove Dislike' : 'Dislike';
    button.setAttribute('aria-label', button.title);
  }

  function showError(message) {
    if (!message || !button) return;
    button.setAttribute('data-error', message);
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => button?.removeAttribute('data-error'), 5000);
  }

  async function toggleDislike(el) {
    const videoId = getVideoId();
    if (!videoId || el.disabled) return;
    el.disabled = true;
    el.classList.add('yt-dr-loading');
    try {
      const result = await chrome.runtime.sendMessage({ type: 'TOGGLE_DISLIKE', videoId });
      if (!result?.ok) throw new Error(result?.error || 'ไม่สามารถส่ง Dislike ได้');
      updateButton(result.rating);
    } catch (error) {
      console.error('[YT Dislike]', error);
      showError(error.message || 'เกิดข้อผิดพลาดในการส่ง Dislike');
    } finally {
      el.disabled = false;
      el.classList.remove('yt-dr-loading');
    }
  }

  async function refreshRating(videoId) {
    if (!button || !videoId) return;
    try {
      const result = await chrome.runtime.sendMessage({ type: 'GET_RATING', videoId });
      if (result?.ok && videoId === getVideoId()) updateButton(result.rating);
      else if (!result?.ok) showError(result?.error);
    } catch (error) {
      console.debug('[YT Dislike] rating check failed', error);
    }
  }

  function mount() {
    mountScheduled = false;
    if (!location.pathname.startsWith('/watch')) return;

    const container = document.querySelector('#top-level-buttons-computed');
    if (container) {
      const existing = container.querySelector('#yt-dislike-restorer');
      if (existing && existing !== button) button = existing;
      if (!button || !document.contains(button)) button = createButton();
      if (!container.contains(button)) container.appendChild(button);
    }

    const controls = document.querySelector('.ytp-right-controls');
    if (controls) {
      const existingSpeed = controls.querySelector('#yt-speed-control');
      if (existingSpeed) {
        speedControl = existingSpeed;
        speedButton = existingSpeed.querySelector('.yt-speed-button');
      } else {
        speedControl = createSpeedControl();
        controls.prepend(speedControl);
      }

      const existingDownload = controls.querySelector('#yt-extension-download');
      if (existingDownload) {
        downloadButton = existingDownload;
      } else {
        downloadButton = createDownloadButton();
        controls.prepend(downloadButton);
      }

      const v = video();
      if (v) updateSpeed(v.playbackRate);
    }

    const id = getVideoId();
    if (id && id !== lastVideoId) {
      lastVideoId = id;
      updateButton('none');
      applyDefaultSpeed();
      refreshRating(id);
    }
  }

  function scheduleMount() {
    if (mountScheduled) return;
    mountScheduled = true;
    requestAnimationFrame(mount);
  }

  document.addEventListener('click', event => {
    if (speedControl && !speedControl.contains(event.target)) return;
  }, true);

  new MutationObserver(scheduleMount).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener('yt-navigate-finish', () => {
    lastVideoId = null;
    button = null;
    speedControl = null;
    speedButton = null;
    downloadButton = null;
    setTimeout(scheduleMount, 100);
  });
  window.addEventListener('popstate', scheduleMount);
  setInterval(scheduleMount, 1000);
  scheduleMount();
})();
