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
    const el = document.createElement('button');
    el.id = 'yt-extension-download';
    el.type = 'button';
    el.className = 'yt-extension-download';
    el.textContent = 'Download';
    el.title = 'เปิด Download ของ YouTube';
    el.setAttribute('aria-label', 'เปิด Download ของ YouTube');
    el.addEventListener('click', event => {
      event.stopPropagation();
      const native = [...document.querySelectorAll('button, tp-yt-paper-item, ytd-menu-service-item-renderer')]
        .find(item => /download/i.test(`${item.getAttribute('aria-label') || ''} ${item.getAttribute('title') || ''} ${item.textContent || ''}`));
      if (native) native.click();
      else {
        el.title = 'ไม่พบ Download ของ YouTube สำหรับวิดีโอนี้';
        el.setAttribute('aria-label', el.title);
        setTimeout(() => {
          el.title = 'เปิด Download ของ YouTube';
          el.setAttribute('aria-label', 'เปิด Download ของ YouTube');
        }, 2500);
      }
    });
    return el;
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
