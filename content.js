(() => {
  'use strict';
  let lastVideoId = null;
  let button = null;
  let speedControl = null;
  let speedButton = null;
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
      cyclePlaybackRate();
    });
    wrap.append(speedButton);
    return wrap;
  }

  function updateSpeed(rate) {
    if (!speedButton) return;
    speedButton.querySelector('.yt-speed-value').textContent = formatSpeed(rate);
    speedButton.title = `ความเร็ว ${formatSpeed(rate)} • คลิกเพื่อเปลี่ยน`;
    speedButton.setAttribute('aria-label', `ความเร็ว ${formatSpeed(rate)} • คลิกเพื่อเปลี่ยน`);
  }

  function setPlaybackRate(rate) {
    const v = video();
    if (!v) return;
    const normalized = Number(rate);
    if (!Number.isFinite(normalized)) return;
    v.playbackRate = normalized;
    updateSpeed(normalized);
  }

  function cyclePlaybackRate() {
    const v = video();
    if (!v) return;
    const current = Number(v.playbackRate) || 1;
    const index = SPEEDS.findIndex(rate => Math.abs(rate - current) < 0.01);
    const next = SPEEDS[(index + 1) % SPEEDS.length];
    setPlaybackRate(next);
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
    setTimeout(scheduleMount, 100);
  });
  window.addEventListener('popstate', scheduleMount);
  setInterval(scheduleMount, 1000);
  scheduleMount();
})();
