# YT-Extension

Chrome/Chromium Manifest V3 extension สำหรับเพิ่มปุ่ม Dislike บน YouTube
และส่ง rating จริงของบัญชีผู้ใช้ผ่าน YouTube Data API

## โครงสร้าง

- `manifest.json` — Manifest V3
- `background.js` — OAuth 2.0 + YouTube Data API
- `content.js` — เพิ่มปุ่มและตรวจ rating บนหน้า watch
- `content.css` — รูปแบบปุ่ม
- `popup.html` / `popup.js` — ตั้งค่า OAuth Client ID และ Login

## วิธีติดตั้ง

1. เปิด `chrome://extensions/`
2. เปิด **Developer mode**
3. เลือก **Load unpacked**
4. เลือกโฟลเดอร์ `D:\myproject1\YT-Extension`

Manifest V3 เป็นรูปแบบหลักที่ Chrome รองรับสำหรับ Extensions รุ่นปัจจุบัน

## Google OAuth

ต้องสร้าง OAuth Client ID สำหรับแอปที่ใช้งานบนเครื่องผู้ใช้ และกำหนด redirect URI
ตามค่าที่ `chrome.identity.getRedirectURL()` ของ extension ใช้ จากนั้นนำ Client ID
มาใส่ใน popup แล้วกดบันทึกและ Login

Extension ขอ scope:
`https://www.googleapis.com/auth/youtube.force-ssl`

## การทำงาน

- เปิดวิดีโอ YouTube แล้วจะมีปุ่ม **Dislike** เพิ่มในแถบปุ่ม
- ถ้ายังไม่ได้ Dislike → กดแล้วส่ง `rating=dislike`
- ถ้า Dislike อยู่แล้ว → กดอีกครั้งส่ง `rating=none`
- เมื่อเปิดวิดีโอจะอ่าน rating ของบัญชีปัจจุบันด้วย `videos.getRating`

## ข้อจำกัดสำคัญ

YouTube Data API สามารถบันทึก rating ของผู้ใช้ที่ authenticate ได้ แต่การเรียก
`videos.rate` ไม่ได้เปลี่ยนยอด Like/Dislike สาธารณะของวิดีโอ ดังนั้น extension นี้
คือการทำให้ผู้ใช้ส่ง Dislike ของตัวเองจริง ไม่ใช่การกู้คืนยอด Dislike สาธารณะ

## ความปลอดภัย

- ไม่เก็บรหัสผ่าน Google
- ไม่อ่านหรือเก็บ YouTube cookie
- ใช้ OAuth access token สำหรับเรียก API
- มีปุ่ม Logout เพื่อลบ token ที่ extension เก็บไว้

## UI / SPA Stability Update

เวอร์ชันนี้ปรับปุ่ม Dislike ให้ใกล้เคียงปุ่ม action ของ YouTube มากขึ้น โดยใช้ SVG icon, hover/focus state และรองรับ dark mode

การตรวจจับหน้า Watch ปรับให้เหมาะกับ YouTube SPA มากขึ้น ใช้ `yt-navigate-finish`, `popstate`, MutationObserver แบบ schedule และตรวจ Video ID ก่อน refresh rating

เพิ่มการจัดการข้อผิดพลาด OAuth/API ได้แก่ ตรวจ Client ID เบื้องต้น, ตรวจ OAuth state/error, แปลง API error ให้เข้าใจง่าย และ retry หนึ่งครั้งเมื่อ access token หมดอายุหรือถูกปฏิเสธ

ปุ่มใน popup มี loading state และแสดงสถานะสำเร็จ/ผิดพลาดโดยไม่ใช้ alert
