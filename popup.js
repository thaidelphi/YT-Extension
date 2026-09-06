const clientIdInput = document.getElementById('clientId');
const status = document.getElementById('status');
const adEnabled = document.getElementById('adEnabled');
const adBadge = document.getElementById('adBadge');
const engineInfo = document.getElementById('engineInfo');
const defaultSpeed = document.getElementById('defaultSpeed');
const loginStatus = document.getElementById('loginStatus');
const buttons = [...document.querySelectorAll('button')];

async function send(type, payload = {}) {
  try {
    const result = await chrome.runtime.sendMessage({ type, ...payload });
    if (!result?.ok) throw new Error(result?.error || 'เกิดข้อผิดพลาด');
    return result;
  } catch (error) {
    throw new Error(error.message || 'ติดต่อ Extension ไม่สำเร็จ');
  }
}

function setStatus(text, kind = '') {
  status.textContent = text;
  status.className = kind;
}

function setBusy(busy) {
  buttons.forEach(button => button.disabled = busy);
}

async function refresh() {
  const data = await chrome.storage.local.get(['clientId', 'adBlockEnabled', 'defaultSpeed']);
  clientIdInput.value = data.clientId || '';
  adEnabled.checked = data.adBlockEnabled !== false;
  defaultSpeed.value = String(data.defaultSpeed || 1);
  updateAdBadge(adEnabled.checked);
  try {
    const result = await send('STATUS');
    loginStatus.textContent = result.loggedIn ? 'Google: เข้าสู่ระบบแล้ว ✓' : 'Google: ยังไม่ได้เข้าสู่ระบบ';
    setStatus('การตั้งค่าพร้อมใช้งาน ✓', 'ok');
  } catch (error) {
    loginStatus.textContent = `Google: ${error.message}`;
    setStatus(`สถานะ: ${error.message}`, 'error');
  }
}

function updateAdBadge(enabled) {
  adBadge.textContent = enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
  adBadge.className = `badge ${enabled ? 'on' : 'off'}`;
  engineInfo.textContent = enabled ? 'Engine: Multi-layer scoring • threshold 3' : 'Engine: หยุดการบังคับใช้ชั่วคราว';
}

adEnabled.addEventListener('change', async () => {
  try {
    await send('SET_ADBLOCK', { enabled: adEnabled.checked });
    updateAdBadge(adEnabled.checked);
    setStatus(adEnabled.checked ? 'เปิด Ad Blocker แล้ว ✓' : 'ปิด Ad Blocker แล้ว', adEnabled.checked ? 'ok' : '');
  } catch (error) {
    adEnabled.checked = !adEnabled.checked;
    setStatus(`เปลี่ยนสถานะไม่ได้: ${error.message}`, 'error');
  }
});

defaultSpeed.addEventListener('change', async () => {
  const value = Number(defaultSpeed.value);
  await chrome.storage.local.set({ defaultSpeed: value });
  setStatus(`ตั้งความเร็วเริ่มต้นเป็น ${value}× แล้ว ✓`, 'ok');
});

document.getElementById('save').addEventListener('click', async () => {
  const clientId = clientIdInput.value.trim();
  if (!clientId) return setStatus('กรุณาระบุ Client ID', 'error');
  if (!clientId.endsWith('.apps.googleusercontent.com')) return setStatus('Client ID ไม่ถูกต้อง', 'error');
  await chrome.storage.local.set({ clientId });
  setStatus('บันทึก Client ID แล้ว ✓', 'ok');
});

document.getElementById('login').addEventListener('click', async () => {
  setBusy(true);
  setStatus('กำลังเปิด Google Login…');
  try { await send('LOGIN'); setStatus('เข้าสู่ระบบสำเร็จ ✓', 'ok'); }
  catch (error) { setStatus(`Login ไม่สำเร็จ: ${error.message}`, 'error'); }
  finally { setBusy(false); }
});

document.getElementById('logout').addEventListener('click', async () => {
  setBusy(true);
  try { await send('LOGOUT'); setStatus('ออกจากระบบแล้ว ✓', 'ok'); }
  catch (error) { setStatus(`Logout ไม่สำเร็จ: ${error.message}`, 'error'); }
  finally { setBusy(false); }
});

refresh();