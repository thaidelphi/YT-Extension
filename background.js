const API_BASE = 'https://www.googleapis.com/youtube/v3';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = 'https://www.googleapis.com/auth/youtube.force-ssl';
const AD_RULESET_ID = 'ad_block_rules';

const downloadJobs = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(error => {
    sendResponse({ ok: false, error: normalizeError(error) });
  });
  return true;
});

async function handleMessage(message, sender) {
  switch (message?.type) {
    case 'GET_RATING': return { ok: true, rating: await getRating(message.videoId) };
    case 'TOGGLE_DISLIKE': return { ok: true, rating: await toggleDislike(message.videoId) };
    case 'LOGIN': await login(); return { ok: true };
    case 'LOGOUT': await logout(); return { ok: true };
    case 'STATUS': return await getStatus();
    case 'SET_ADBLOCK': return await setAdBlockEnabled(message.enabled !== false);
    case 'GET_DOWNLOAD_FORMATS': return await getDownloadFormats(message.videoUrl, message.playbackUrls || []);
    case 'START_OFFSCREEN_DOWNLOAD': return await startOffscreenDownload(message.url, message.filename, sender);
    case 'DOWNLOAD_JOB_READY': return await markDownloadJobReady(message.jobId);
    case 'OFFSCREEN_DOWNLOAD_STATUS': return await forwardDownloadStatus(message);
    case 'START_DOWNLOAD': return await startDownload(message.url, message.filename);
    default: throw new Error('ไม่รู้จักคำสั่งจาก Extension');
  }
}

async function getStatus() {
  const data = await chrome.storage.local.get(['adBlockEnabled']);
  let ruleEnabled = false;
  try {
    const rules = await chrome.declarativeNetRequest.getEnabledRulesets();
    ruleEnabled = rules.includes(AD_RULESET_ID);
  } catch (error) {
    console.debug('[YT AdBlock] ruleset status unavailable', error);
  }
  return {
    ok: true,
    loggedIn: !!(await getAccessToken(false)),
    adBlockEnabled: data.adBlockEnabled !== false,
    dnrEnabled: ruleEnabled
  };
}

async function setAdBlockEnabled(enabled) {
  const value = enabled === true;
  if (value) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [AD_RULESET_ID] });
  } else {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: [AD_RULESET_ID] });
  }
  await chrome.storage.local.set({ adBlockEnabled: value });
  return getStatus();
}

chrome.runtime.onInstalled.addListener(async details => {
  try {
    const data = await chrome.storage.local.get(['adBlockEnabled']);
    if (details.reason === 'install' && data.adBlockEnabled === undefined) {
      await setAdBlockEnabled(true);
    } else if (data.adBlockEnabled !== undefined) {
      await setAdBlockEnabled(data.adBlockEnabled === true);
    }
  } catch (error) {
    console.error('[YT AdBlock] install/update sync failed', error);
  }
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['adBlockEnabled']).then(data => {
    setAdBlockEnabled(data.adBlockEnabled !== false).catch(error => console.error('[YT AdBlock] startup sync failed', error));
  });
});

async function getClientId() {
  const data = await chrome.storage.local.get(['clientId']);
  const clientId = data.clientId?.trim();
  if (!clientId) throw new Error('ยังไม่ได้ตั้ง Google OAuth Client ID');
  if (!clientId.endsWith('.apps.googleusercontent.com')) throw new Error('Google OAuth Client ID ไม่ถูกต้อง');
  return clientId;
}

async function getAccessToken(interactive = true) {
  const data = await chrome.storage.local.get(['accessToken', 'expiresAt']);
  if (data.accessToken && data.expiresAt && Date.now() < data.expiresAt - 60000) return data.accessToken;
  if (!interactive) return null;
  return login();
}

async function login() {
  const clientId = await getClientId();
  const verifier = randomString(64);
  const challenge = await sha256Base64Url(verifier);
  const redirectUri = chrome.identity.getRedirectURL();
  const state = randomString(32);
  const params = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri,
    scope: SCOPES, access_type: 'offline', prompt: 'consent', code_challenge: challenge,
    code_challenge_method: 'S256', state });
  let resultUrl;
  try {
    resultUrl = await chrome.identity.launchWebAuthFlow({ url: `${AUTH_ENDPOINT}?${params}`, interactive: true });
  } catch (error) {
    throw new Error(`เปิด Google Login ไม่สำเร็จ: ${normalizeError(error)}`);
  }
  if (!resultUrl) throw new Error('Google OAuth ไม่ได้ส่งผลลัพธ์กลับมา');
  const callback = new URL(resultUrl);
  if (callback.searchParams.get('state') !== state) throw new Error('OAuth state ไม่ตรงกัน');
  const error = callback.searchParams.get('error');
  if (error) throw new Error(`Google OAuth: ${error}${callback.searchParams.get('error_description') ? ` - ${callback.searchParams.get('error_description')}` : ''}`);
  const code = callback.searchParams.get('code');
  if (!code) throw new Error('ไม่พบ authorization code จาก Google');
  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, code, code_verifier: verifier,
      grant_type: 'authorization_code', redirect_uri: redirectUri })
  });
  const tokens = await safeJson(tokenResponse);
  if (!tokenResponse.ok || !tokens.access_token) throw new Error(tokens.error_description || tokens.error || `Google token error (${tokenResponse.status})`);
  await chrome.storage.local.set({ accessToken: tokens.access_token, expiresAt: Date.now() + ((tokens.expires_in || 3600) * 1000) });
  return tokens.access_token;
}

async function logout() {
  const data = await chrome.storage.local.get(['accessToken']);
  if (data.accessToken) {
    try { await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(data.accessToken)}`, { method: 'POST' }); } catch (_) {}
  }
  await chrome.storage.local.remove(['accessToken', 'expiresAt']);
}

async function apiFetch(path, options = {}) {
  let token = await getAccessToken(true);
  let response = await authorizedFetch(path, options, token);
  if (response.status === 401) {
    await chrome.storage.local.remove(['accessToken', 'expiresAt']);
    token = await getAccessToken(true);
    response = await authorizedFetch(path, options, token);
  }
  if (!response.ok) {
    const body = await safeJson(response);
    const reason = body.error?.errors?.[0]?.reason || body.error?.message;
    throw new Error(`YouTube API ${response.status}: ${reason || 'คำขอไม่สำเร็จ'}`);
  }
  return response;
}

async function authorizedFetch(path, options, token) {
  return fetch(`${API_BASE}${path}`, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
}

async function getRating(videoId) {
  if (!videoId) throw new Error('ไม่พบ Video ID');
  const response = await apiFetch(`/videos/getRating?${new URLSearchParams({ id: videoId })}`);
  const data = await safeJson(response);
  return data.items?.[0]?.rating || 'none';
}

async function toggleDislike(videoId) {
  if (!videoId) throw new Error('ไม่พบ Video ID');
  const current = await getRating(videoId);
  const rating = current === 'dislike' ? 'none' : 'dislike';
  await apiFetch(`/videos/rate?${new URLSearchParams({ id: videoId, rating })}`, { method: 'POST' });
  return rating;
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch (_) { return { error: { message: text.slice(0, 500) } }; }
}

function normalizeError(error) {
  if (!error) return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
  if (error.message) return error.message;
  return String(error);
}

function randomString(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => (b % 36).toString(36)).join('');
}

async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const bytes = new Uint8Array(digest);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getDownloadFormats(videoUrl, playbackUrls = []) {
  if (!videoUrl || !/^https:\/\/www\.youtube\.com\/watch\?/.test(videoUrl)) {
    throw new Error('URL YouTube ไม่ถูกต้อง');
  }

  const direct = normalizePlaybackUrls(playbackUrls)
    .map(parsePlaybackFormat)
    .filter(Boolean);
  const directFormats = uniqueFormats(direct);

  let title = 'YouTube Video';
  try {
    const response = await fetch(videoUrl, { credentials: 'include' });
    if (response.ok) {
      const html = await response.text();
      const player = extractPlayerResponse(html);
      title = player.videoDetails?.title || title;
      const formats = [...(player?.streamingData?.formats || [])]
        .filter(f => f.url && /^video\/mp4(?:;|$)/.test(f.mimeType || '') && f.hasAudio !== false)
        .map(f => ({
          itag: f.itag,
          url: f.url,
          qualityLabel: f.qualityLabel || `${f.height || 0}p`,
          height: Number(f.height || 0),
          fps: Number(f.fps || 0),
          contentLength: Number(f.contentLength || 0)
        }));
      return { ok: true, title, formats: uniqueFormats(formats.concat(directFormats)).slice(0, 8) };
    }
  } catch (_) {}

  return { ok: true, title, formats: directFormats.slice(0, 8) };
}

function normalizePlaybackUrls(urls) {
  return [...new Set((Array.isArray(urls) ? urls : []).filter(url => {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' && /(^|\.)googlevideo\.com$/.test(u.hostname) &&
        u.pathname.includes('/videoplayback') && !u.searchParams.has('range');
    } catch (_) { return false; }
  }))];
}

function parsePlaybackFormat(url) {
  try {
    const u = new URL(url);
    const mime = u.searchParams.get('mime') || '';
    if (!mime.startsWith('video/mp4')) return null;
    const itag = Number(u.searchParams.get('itag') || 0);
    const height = Number(u.searchParams.get('height') || 0);
    const fps = Number(u.searchParams.get('fps') || 0);
    const contentLength = Number(u.searchParams.get('clen') || 0);
    return {
      itag,
      url: u.toString(),
      qualityLabel: height ? `${height}p` : (itag ? `itag ${itag}` : 'Video'),
      height,
      fps,
      contentLength
    };
  } catch (_) { return null; }
}

function uniqueFormats(formats) {
  const unique = [];
  for (const item of formats.sort((a, b) => b.height - a.height || b.fps - a.fps)) {
    const key = item.height ? `${item.height}:${item.fps}` : item.url;
    if (!unique.some(x => (x.height ? `${x.height}:${x.fps}` : x.url) === key)) unique.push(item);
  }
  return unique;
}

async function startOffscreenDownload(url, filename, sender) {
  if (!url || !/^https:\/\/(?:[^/]+\.)?googlevideo\.com\//.test(url)) {
    throw new Error('Download URL จากสตรีมวิดีโอไม่ถูกต้อง');
  }
  if (!sender?.tab?.id) throw new Error('ไม่พบแท็บ YouTube สำหรับรายงานสถานะดาวน์โหลด');

  await ensureOffscreenDocument();
  const jobId = crypto.randomUUID();
  downloadJobs.set(jobId, { tabId: sender.tab.id, createdAt: Date.now(), ready: false, pending: [] });
  chrome.runtime.sendMessage({
    type: 'OFFSCREEN_DOWNLOAD',
    url,
    filename: sanitizeFilename(filename || 'youtube-video.mp4'),
    jobId
  }).catch(error => {
    console.debug('[YT Download] offscreen job ended', normalizeError(error));
    forwardDownloadStatus({ jobId, error: `เริ่มดาวน์โหลดไม่ได้: ${normalizeError(error)}` });
  });
  return { ok: true, jobId };
}

async function markDownloadJobReady(jobId) {
  const job = downloadJobs.get(jobId);
  if (!job) return { ok: false, error: 'ไม่พบงานดาวน์โหลด' };
  job.ready = true;
  const pending = job.pending.splice(0);
  for (const message of pending) await relayDownloadStatus(job, message);
  if (pending.some(message => message.done || message.error)) downloadJobs.delete(jobId);
  return { ok: true };
}

async function forwardDownloadStatus(message) {
  const job = downloadJobs.get(message.jobId);
  if (!job) return { ok: true };
  if (!job.ready) {
    job.pending.push(message);
    return { ok: true };
  }
  await relayDownloadStatus(job, message);
  if (message.done || message.error) downloadJobs.delete(message.jobId);
  return { ok: true };
}

async function relayDownloadStatus(job, message) {
  try {
    await chrome.tabs.sendMessage(job.tabId, message);
  } catch (error) {
    console.debug('[YT Download] status relay failed', normalizeError(error));
  }
}

async function ensureOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen.html')]
  });
  if (contexts.length) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['BLOBS'],
    justification: 'Fetch and save a user-selected YouTube media stream as a local file.'
  });
}

async function startDownload(url, filename) {
  if (!url || !/^https?:\/\/(?:[^/]+\.)?googlevideo\.com\//.test(url)) {
    throw new Error('Download URL จากสตรีมวิดีโอไม่ถูกต้อง');
  }
  let probe;
  try {
    probe = await fetch(url, {
      headers: { Range: 'bytes=0-1023' },
      referrer: 'https://www.youtube.com/',
      referrerPolicy: 'strict-origin-when-cross-origin',
      credentials: 'include',
      cache: 'no-store'
    });
  } catch (_) {
    throw new Error('เชื่อมต่อสตรีมวิดีโอไม่ได้ กรุณาเปิดวิดีโอและลองใหม่');
  }
  const contentType = (probe.headers.get('content-type') || '').toLowerCase();
  if (!probe.ok || (!contentType.startsWith('video/') && !contentType.includes('application/octet-stream'))) {
    throw new Error(`สตรีมไม่พร้อมสำหรับดาวน์โหลด (${probe.status} ${contentType || 'unknown'})`);
  }
  await probe.body?.cancel();
  const id = await chrome.downloads.download({
    url,
    filename: sanitizeFilename(filename || 'youtube-video.mp4'),
    headers: [{ name: 'Referer', value: 'https://www.youtube.com/' }],
    saveAs: true
  });
  return { ok: true, downloadId: id };
}

function sanitizeFilename(name) {
  return String(name).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 180);
}

function extractPlayerResponse(html) {
  const markers = ['ytInitialPlayerResponse = ', 'ytInitialPlayerResponse='];
  for (const marker of markers) {
    const start = html.indexOf(marker);
    if (start < 0) continue;
    const brace = html.indexOf('{', start + marker.length);
    if (brace < 0) continue;
    const text = readJsonObject(html, brace);
    if (text) {
      try { return JSON.parse(text); } catch (_) {}
    }
  }
  throw new Error('ไม่พบข้อมูลสตรีมที่ดาวน์โหลดได้จากวิดีโอนี้');
}

function readJsonObject(text, start) {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}
