# Prompt History — YT-Extension

## 2026-09-06 — กฎการบันทึก Prompt และคำตอบ

### Prompt จากผู้ใช้
เขียน prompt และคำตอบลง prompt.md ทุกครั้ง

### คำตอบ / กฎที่กำหนด
สำหรับโปรเจกต์ YT-Extension ทุกครั้งที่มีการร้องขอให้แก้ไข เพิ่ม หรือต่อยอดงาน ให้บันทึก Prompt ของผู้ใช้และคำตอบหรือผลการดำเนินงานของ AI ลงใน `prompt.md` ทุกครั้ง

### ขั้นตอนบังคับ
1. รับและตีความ Prompt ของผู้ใช้
2. ดำเนินงานตาม Prompt
3. บันทึก Prompt และคำตอบหรือผลการดำเนินงานลง `prompt.md`
4. Commit การเปลี่ยนแปลง
5. Push ไปยัง GitHub
6. บันทึกประวัติ Push และ Commit ID ลง `git_history.md`
7. Push การอัปเดต `git_history.md` อีกครั้ง
8. ตรวจสอบ Git status ให้ working tree สะอาด

ห้ามถือว่างานเสร็จสมบูรณ์ หากยังไม่ได้บันทึก Prompt/คำตอบและยังไม่ได้ Push ตามขั้นตอนข้างต้น

## 2026-09-06 — Playback Speed

### Prompt จากผู้ใช้
ทำ extesion ให้สามารถเข้าถึงปุ่มปรับ speed ได้ง่ายขึ้น

### คำตอบ / ผลการดำเนินงาน
เพิ่มปุ่ม Playback Speed แบบเข้าถึงได้ทันทีบนแถบควบคุมวิดีโอ YouTube พร้อมตัวเลือก 0.5×, 0.75×, 1×, 1.25×, 1.5×, 1.75× และ 2× รองรับการเปลี่ยนวิดีโอแบบ YouTube SPA และแสดงค่าความเร็วปัจจุบัน

## 2026-09-06 — Automatic Ad Skip

### Prompt จากผู้ใช้
[Message sent at 2026-09-06T02:13:33Z]
ต้องการให้ skip   โฆษณา อัตโนมัติ

### คำตอบ / ผลการดำเนินงาน
เพิ่มระบบตรวจจับโฆษณาบนหน้า YouTube และกดปุ่ม Skip Ad อัตโนมัติเมื่อปุ่มข้ามโฆษณาปรากฏขึ้น พร้อมปิด overlay โฆษณาที่มีปุ่มปิด และปรับการ mount ให้ระบบจัดการโฆษณาแยกจากปุ่ม Dislike/Playback Speed เพื่อให้ทำงานกับ YouTube SPA ได้เสถียรมากขึ้น ทั้งนี้โฆษณาที่ YouTube ไม่อนุญาตให้ข้ามจะยังต้องรอจนกว่าจะข้ามได้ตามปกติ

## 2026-09-06 — ระบบ Block โฆษณา

### Prompt จากผู้ใช้
[Message sent at 2026-09-06T02:18:19Z]
ต้องการให้ skip   โฆษณา อัตโนมัติ
ทำระบบ block โฆษณา

### คำตอบ / ผลการดำเนินงาน
เพิ่มระบบบล็อกโฆษณาแบบหลายชั้นให้ Extension โดยใช้ Declarative Net Request สำหรับบล็อกคำขอจากเครือข่ายโฆษณาภายนอกที่ระบุ และเพิ่ม cosmetic cleanup สำหรับ overlay โฆษณาบน YouTube รวมถึงคงระบบ Skip Ad อัตโนมัติเดิมไว้ ระบบไม่บล็อกโดเมน YouTube แบบกว้างเพื่อหลีกเลี่ยงการทำให้การเล่นวิดีโอปกติเสียหาย

## 2026-09-06 — YouTube Ad Blocker รุ่นเข้มขึ้น

### Prompt จากผู้ใช้
[Message sent at 2026-09-06T02:20:41Z]
ทำ Ad Blocker รุ่นเข้มขึ้นสำหรับ YouTube โดยเฉพาะ

### คำตอบ / ผลการดำเนินงาน
ปรับระบบ Ad Blocker ให้เน้น YouTube โดยเฉพาะ เพิ่มกฎ Declarative Net Request สำหรับโดเมนโฆษณาที่เกี่ยวข้องเพิ่มเติมและเพิ่ม priority ของกฎเดิม พร้อมขยาย cosmetic cleanup สำหรับองค์ประกอบโฆษณาในตัวเล่น YouTube และคง Auto Skip Ad เดิมไว้ ระบบยังหลีกเลี่ยงการบล็อกโดเมน YouTube แบบกว้างเพื่อไม่ให้กระทบวิดีโอปกติ

## 2026-09-06 — Aggressive YouTube Ad Blocker รุ่น Local/Private

### Prompt จากผู้ใช้
[Message sent at 2026-09-06T02:25:25Z]
ดำเนินการ

### คำตอบ / ผลการดำเนินงาน
ยกระดับระบบบล็อกโฆษณา YouTube สำหรับการใช้งานแบบ Local/Private โดยเพิ่มการตรวจจับสถานะโฆษณาแบบถี่ขึ้น, MutationObserver สำหรับการเปลี่ยนแปลงของ player, การกด Skip/ปิด overlay แบบทันทีเมื่อองค์ประกอบปรากฏ, cosmetic cleanup ที่ครอบคลุมขึ้น และเพิ่มกฎ Declarative Net Request สำหรับ endpoint/รูปแบบ URL โฆษณาที่เจาะจง โดยหลีกเลี่ยงการบล็อกโดเมน YouTube ทั้งหมดเพื่อไม่ให้กระทบการเล่นวิดีโอปกติ

## 2026-09-06 � Fix Playback Speed Menu Text

### Prompt �ҡ�����
��Ѻ��������/Ŵ ������������ ��ͤ����ѹ�š

### �ӵͺ / �š�ô��Թ�ҹ
���ͤ��� Playback Speed ����ʴ��Դ encoding �ҡ × �� ? 㹻��������¡�ä������� �������������͡�������� 2.5? ��� 3?

## 2026-09-06 � Multi-layer Ad Detection Engine

### User Prompt
��Ѻ�ç���ҧ����� Engine ��������к���Ǩ�Ѻ���ª�� ���Ш��Ѻ��͡Ѻ�������¹�ŧ�ͧ YouTube ��

### AI Result
��Ѻ�ç���ҧ�к� Ad Blocker �� YouTube Ad Detection Engine �¡� adblock/ad_engine.js ������õ�Ǩ�Ѻ�����ѭ�ҳ�ҡ player state, DOM ad modules/overlays, Skip/Close controls, MutationObserver ��� polling ����� bridge ����Ѻ SPA navigation ������¤����Ѻ�Դ�ͺ��ҹ�ɳ��͡�ҡ content.js.


## 2026-09-06 — Ad Detection Scoring Engine

### User Prompt
ตกลง

### AI Result
เพิ่มระบบ Ad Detection Scoring Engine ให้แต่ละสัญญาณมีน้ำหนักคะแนน และใช้ threshold รวมในการตัดสินว่าเป็นโฆษณา แทนการพึ่งสัญญาณเดียว โดยยังคง DOM detection, player state, Skip/Close detection, MutationObserver และ polling ไว้เป็นหลายชั้น

## 2026-09-06 — Redesign Popup as Control Center

### User Prompt
ตกลง

### AI Result
ปรับ Popup จากหน้า YouTube Dislike Settings เป็น YouTube Extension Control Center รวมการควบคุม Ad Blocker, Playback Speed และ Google OAuth/Dislike ไว้ในหน้าเดียว พร้อมเพิ่มสวิตช์เปิด-ปิด Ad Blocker และค่า Playback Speed เริ่มต้น


## 2026-09-06 — Engine Performance & Code Cleanup

### Prompt จากผู้ใช้
ปรับปรุง

### คำตอบ / ผลการดำเนินงาน
ปรับปรุงโครงสร้าง YT-Extension ตามผลสำรวจ โดยยกระดับ `adblock/ad_engine.js` ให้เป็น Engine หลักแบบ scheduled/debounced ลดการเรียกตรวจจับซ้ำจาก MutationObserver และลด polling จาก 150ms เป็น fallback 500ms พร้อมคง multi-signal scoring, threshold, Auto Skip และ Auto Close ไว้

ปรับ `content.js` ให้โค้ด UI/Dislike/Playback Speed แยกจากระบบโฆษณาชัดเจนขึ้น และแก้ข้อความ error ภาษาไทยที่มีปัญหา encoding ให้เป็น UTF-8 ที่อ่านได้ปกติ รวมถึงปรับการจัดการ Playback Speed ให้กระชับขึ้น

ย้าย `ad_blocker.js` เดิมออกจาก root ไปเป็น `adblock/ad_blocker_legacy.js` เพื่อไม่ให้สับสนกับ Engine หลัก โดยไม่โหลดไฟล์ legacy ผ่าน manifest

## 2026-09-06 — Single Playback Speed Button

### Prompt จากผู้ใช้
ตั้งความเร็ว หน้า youtube เอาไว้ปุ่มเดียวพอ

### คำตอบ / ผลการดำเนินงาน
ปรับ Playback Speed บนหน้า YouTube ให้เหลือปุ่มเดียว โดยคลิกแต่ละครั้งจะวนความเร็วตามลำดับ 0.5×, 0.75×, 1×, 1.25×, 1.5×, 1.75×, 2×, 2.5× และ 3× พร้อมแสดงค่าปัจจุบันบนปุ่ม และป้องกันการสร้างปุ่มซ้ำบน YouTube SPA

## 2026-09-06 — Ad Blocker Toggle Controls DNR

### Prompt จากผู้ใช้
แก้เรื่อง Ad Blocker toggle ให้ควบคุม DNR rules ได้จริงด้วย

### คำตอบ / ผลการดำเนินงาน
ปรับ `background.js` ให้ Ad Blocker toggle ควบคุม Declarative Net Request ruleset `ad_block_rules` ด้วย `chrome.declarativeNetRequest.updateEnabledRulesets()` จริง พร้อมตรวจสถานะผ่าน `getEnabledRulesets()` และส่งสถานะ `adBlockEnabled`/`dnrEnabled` ให้ Control Center แสดงผลตรงกับการทำงานจริง

ปรับการ initialize ตอนติดตั้ง/อัปเดตไม่ให้เปิดกฎกลับเองโดยไม่คำนึงถึงค่าที่ผู้ใช้ตั้งไว้ และคงการ sync ตอน browser startup

ตรวจสอบ syntax ของ `background.js`, `content.js`, `popup.js`, `adblock/ad_engine.js` และตรวจว่า `rules.json` เป็น JSON ที่ถูกต้องแล้ว

## 2026-09-06 — Playback Speed เป็นรายการตัวเลือก

### Prompt จากผู้ใช้
คลิกแต่ละครั้งวน ไม่เอาแบบวน ให้ขึ้นเป็น list ตัวเลือก

### คำตอบ / ผลการดำเนินงาน
ปรับปุ่ม Playback Speed บนหน้า YouTube จากการคลิกเพื่อวนความเร็ว เป็นการคลิกปุ่มเดียวแล้วเปิดรายการตัวเลือกความเร็วโดยตรง ได้แก่ 0.5×, 0.75×, 1×, 1.25×, 1.5×, 1.75×, 2×, 2.5× และ 3× เมื่อเลือกแล้วเมนูจะปิดและปุ่มจะแสดงความเร็วปัจจุบัน พร้อมเน้นตัวเลือกที่กำลังใช้งานอยู่

## 2026-09-06 — เพิ่มปุ่ม Download

### Prompt จากผู้ใช้
เพิ่มปุ่ม download ให้ด้วย

### คำตอบ / ผลการดำเนินงาน
เพิ่มปุ่ม Download บนแถบควบคุมวิดีโอ YouTube เพียงหนึ่งปุ่มต่อ player และให้ปุ่มพยายามเรียกใช้ Download ของ YouTube ที่มีอยู่ในหน้าโดยตรง โดยไม่สร้างตัวดาวน์โหลดหรือดึง URL สตรีมวิดีโอเอง หากวิดีโอหรือบัญชีไม่มี Download ของ YouTube ปุ่มจะแจ้งว่าไม่พบ Download ที่ใช้งานได้

## 2026-09-06 — หมายเหตุการทำงาน Download

ปุ่ม Download ที่เพิ่มให้ทำหน้าที่เรียก Download ของ YouTube ที่มีอยู่ในหน้าเท่านั้น ไม่ดึง URL สตรีมโดยตรง


## 2026-09-06 — Custom Download System

### Prompt จากผู้ใช้
Download ไม่ใช้ของ youtube สร้างระบบขึ้นมา

### คำตอบ / ผลการดำเนินงาน
เปลี่ยนปุ่ม Download ให้เป็นระบบของ Extension เอง ไม่เรียกเมนู Download ของ YouTube โดยเพิ่มการค้นหาสตรีม MP4 ที่หน้า YouTube เปิดเผย, แสดงรายการคุณภาพ/เฟรมเรตที่ดาวน์โหลดได้ และใช้ Chrome Downloads API ของ Extension เพื่อเริ่มดาวน์โหลดโดยตรง

ระบบจะใช้เฉพาะสตรีมที่มี URL โดยตรงและไม่พยายามถอด signatureCipher/ข้าม DRM หรือระบบป้องกันเนื้อหา

## 2026-09-06 — Fix Custom Download ไม่สามารถดาวน์โหลด

### Prompt จากผู้ใช้
Download ไม่ได้

### คำตอบ / ผลการดำเนินงาน
ตรวจพบว่า Custom Downloader เดิมพึ่ง `streamingData.formats[].url` ซึ่งปัจจุบันอาจไม่มี URL ตรงสำหรับสตรีมที่กำลังเล่น จึงทำให้รายการดาวน์โหลดว่างหรือเริ่มดาวน์โหลดไม่ได้

ปรับระบบให้เก็บ URL จาก `video.currentSrc` และ resource ที่ player โหลดจาก `googlevideo.com/videoplayback` แล้วส่งให้ background สำหรับสร้างรายการดาวน์โหลดโดยตรง พร้อมทำความสะอาด query ที่เป็น range ของ segment ก่อนส่งเข้า Chrome Downloads API

เพิ่ม `googlevideo.com` ใน host permissions และตรวจสอบ syntax ของ `content.js`, `background.js` และ JSON ของ `manifest.json` แล้ว
