(() => {
  let lastVideoId = null;
  let button = null;
  let refreshTimer = null;
  let mountScheduled = false;

  const getVideoId = () => new URL(location.href).searchParams.get('v');

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

  function updateButton(rating) {
    if (!button) return;
    const active = rating === 'dislike';
    button.classList.toggle('yt-dr-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.title = active ? 'Remove Dislike' : 'Dislike';
    button.setAttribute('aria-label', active ? 'Remove Dislike' : 'Dislike');
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
      showError(error.message || 'เกิดข้อผิดพลาด');
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

  function showError(message) {
    if (!message) return;
    button?.setAttribute('data-error', message);
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => button?.removeAttribute('data-error'), 5000);
  }

  function mount() {
    mountScheduled = false;
    if (!location.pathname.startsWith('/watch')) return;
    const container = document.querySelector('#top-level-buttons-computed');
    if (!container) return;
    if (!button || !document.contains(button)) button = createButton();
    if (!container.contains(button)) container.appendChild(button);
    const videoId = getVideoId();
    if (videoId && videoId !== lastVideoId) {
      lastVideoId = videoId;
      updateButton('none');
      refreshRating(videoId);
    }
  }

  function scheduleMount() {
    if (mountScheduled) return;
    mountScheduled = true;
    requestAnimationFrame(mount);
  }

  const observer = new MutationObserver(scheduleMount);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('yt-navigate-finish', () => {
    lastVideoId = null;
    button = null;
    setTimeout(scheduleMount, 100);
  });
  window.addEventListener('popstate', scheduleMount);
  setInterval(scheduleMount, 3000);
  scheduleMount();
})();