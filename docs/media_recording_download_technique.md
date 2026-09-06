# Media Recording Download Technique

## วัตถุประสงค์
เก็บเทคนิคการบันทึก MediaStream จาก `<video>` ใน browser ไว้เป็นแนวทางสำหรับระบบอื่น โดยไม่ใช้เป็น Downloader หลักของ YouTube Extension ในปัจจุบัน

## แนวคิดหลัก
ใช้ `HTMLVideoElement.captureStream()` เพื่อขอ `MediaStream` จากวิดีโอที่กำลังเล่น จากนั้นใช้ `MediaRecorder` บันทึก stream เป็นชิ้นข้อมูล (`Blob`) แล้วรวมเป็นไฟล์เมื่อหยุดบันทึก

```js
const video = document.querySelector('video');
const stream = video.captureStream();
const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
const chunks = [];

recorder.ondataavailable = event => {
  if (event.data.size) chunks.push(event.data);
};

recorder.onstop = () => {
  const blob = new Blob(chunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'recording.webm';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

recorder.start(1000);
```

## ลำดับการทำงาน
1. ค้นหา `<video>` ที่ต้องการบันทึก
2. เรียก `captureStream()` เพื่อสร้าง `MediaStream`
3. ตรวจสอบ codec ด้วย `MediaRecorder.isTypeSupported()`
4. สร้าง `MediaRecorder`
5. รับข้อมูลจาก `dataavailable`
6. หยุด recorder เมื่อผู้ใช้กด Stop หรือ media จบ
7. รวม chunks เป็น `Blob`
8. สร้าง Object URL
9. เรียก browser download ผ่าน `<a download>`
10. `URL.revokeObjectURL()` หลังใช้งานเพื่อคืนหน่วยความจำ

## ข้อดี
- ไม่ต้องใช้ URL ต้นฉบับของ media
- ไม่ต้องพึ่งเมนู Download ของเว็บไซต์
- เหมาะกับระบบบันทึก live preview, demo, canvas/video pipeline และเครื่องมือ capture ใน browser
- สามารถทำ progress ตามเวลาที่ media เล่นได้

## ข้อจำกัดสำคัญ
- **ต้องเล่น media ไปตามเวลาที่ต้องการบันทึก** จึงจะได้ข้อมูลครบช่วงนั้น
- ไม่ใช่การดาวน์โหลดไฟล์ต้นฉบับแบบทันที
- ไฟล์ที่ได้ขึ้นกับ codec/container ที่ browser รองรับ โดย WebM มักรองรับได้ง่ายกว่า MP4
- ความละเอียด/คุณภาพอาจไม่เท่ากับไฟล์ต้นฉบับ ขึ้นกับ MediaStream และ encoder
- หาก media หรือ pipeline ถูกป้องกันด้วยระบบ DRM ไม่ควรพยายามหลบเลี่ยงหรือถอดการป้องกัน
- การ pause, seek หรือเปลี่ยนแหล่ง media ระหว่างบันทึกต้องออกแบบ state handling เพิ่ม
- วิดีโอยาวมากทำให้ `chunks` ใช้หน่วยความจำสูง ควรออกแบบการจัดเก็บ/ส่งออกแบบ streaming เมื่อเหมาะสม

## แนวทาง UX ที่เหมาะสม
สำหรับระบบทั่วไปควรมีปุ่ม:

`Record → กำลังบันทึก → Stop → Save`

ไม่ควรแสดงเป็นปุ่ม `Download` หากเบื้องหลังเป็นการอัด เพราะผู้ใช้อาจเข้าใจว่าจะได้ไฟล์ทันที

## การเลือก MIME type
ตรวจสอบก่อนใช้งาน เช่น:

```js
const candidates = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm'
];
const mimeType = candidates.find(type => MediaRecorder.isTypeSupported(type));
```

ควร fallback ตามลำดับและเก็บ MIME type จริงไว้ตอนสร้าง `Blob`

## Error handling
ควรจัดการกรณีเหล่านี้:
- ไม่มี `<video>`
- ไม่มี `captureStream()`
- browser ไม่รองรับ `MediaRecorder`
- ไม่มี MIME type ที่รองรับ
- `MediaRecorder.onerror`
- media ถูกเปลี่ยนหรือหยุดก่อน recorder
- ผู้ใช้ปิดหน้าเว็บก่อนบันทึกเสร็จ

## ใช้ในโปรเจกต์อื่นอย่างไร
เทคนิคนี้เหมาะกับ:
- Web video recorder
- Live stream recorder แบบ client-side
- การบันทึก preview/demo
- การจับผลลัพธ์จาก media pipeline
- การทำ browser-based capture tool

ไม่ควรถือเป็นวิธีหลักสำหรับระบบที่ต้องการดาวน์โหลดไฟล์ต้นฉบับอย่างรวดเร็ว

## บทเรียนจาก YT-Extension
ระบบที่นำเทคนิคนี้ไปใช้เป็น Downloader จะต้องระบุให้ชัดว่าเป็น **Recording-based Download** เพราะการกด Download แล้วต้องรอวิดีโอเล่นจนจบเป็นพฤติกรรมของ recorder ไม่ใช่ file downloader
