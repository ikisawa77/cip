# Handoff

## ทำอะไรไปแล้ว
- เพิ่มระบบแก้ข้อความหน้าแรกจากหลังบ้านใน [D:\cip\apps\web\src\pages\AdminPage.tsx](D:\cip\apps\web\src\pages\AdminPage.tsx)
- เพิ่มระบบแก้ footer จากหลังบ้านใน [D:\cip\apps\web\src\pages\AdminPage.tsx](D:\cip\apps\web\src\pages\AdminPage.tsx)
- ปรับ [D:\cip\apps\web\src\pages\HomePage.tsx](D:\cip\apps\web\src\pages\HomePage.tsx) ให้ใช้ content จากระบบจริง
- ยก [D:\cip\apps\web\src\components\Layout.tsx](D:\cip\apps\web\src\components\Layout.tsx) ให้มี footer แบบใหม่ที่แก้ได้จาก backend
- ขยาย backend ให้มี public/admin API สำหรับ `homepage` และ `footer` content ใน [D:\cip\apps\api\src\index.ts](D:\cip\apps\api\src\index.ts)
- เพิ่ม storage สำหรับ content ชุดนี้ใน [D:\cip\apps\api\src\db\schema.ts](D:\cip\apps\api\src\db\schema.ts) และ [D:\cip\apps\api\src\services\store.ts](D:\cip\apps\api\src\services\store.ts)

## ผลทดสอบล่าสุด
- `corepack pnpm --filter @cip/shared check` ผ่าน
- `corepack pnpm --filter @cip/api check` ผ่าน
- `corepack pnpm --filter @cip/api build` ผ่าน
- `corepack pnpm --filter @cip/web check` ผ่าน
- `corepack pnpm --filter @cip/web build` ผ่าน

## ตอนนี้ระบบอยู่ตรงไหน
- หน้าแรกใช้ข้อความจากระบบหลังบ้านแล้ว
- footer ใหม่ถูกแสดงทุกหน้า และใช้ข้อความจากระบบหลังบ้านเช่นกัน
- หลังบ้านมี 2 ส่วนใหม่ที่ใช้แก้ copy ได้จริง คือ `ข้อความหน้าแรก` และ `ข้อความ footer`

## ต้องทำอะไรต่อ
1. ทดสอบ save content จริงจาก `/admin` แล้วตรวจที่หน้าเว็บ
2. เก็บ responsive/spacing ของ footer บนมือถือถ้าพบจุดแน่นเกินไป
3. เดินต่อเชื่อม provider จริงตัวแรก

## ถ้าจะทำต่อจากเครื่องอื่น
- pull ล่าสุดจาก `main`
- รัน `run-localhost.bat`
- ล็อกอิน admin แล้วเข้า [http://127.0.0.1:5173/admin](http://127.0.0.1:5173/admin)
- อ่าน [D:\cip\PROGRESS_TH.md](D:\cip\PROGRESS_TH.md) และ [D:\cip\NEXT_STEPS_TH.md](D:\cip\NEXT_STEPS_TH.md) ก่อนเริ่มรอบใหม่

## ข้อควรระวัง
- ฐาน local เครื่องนี้มีตาราง `site_contents` แล้ว แต่ถ้าเครื่องใหม่ยังไม่มี อาจต้องสร้างตารางนี้ก่อนหรือใช้ seed/migration รอบถัดไป
- bundle ฝั่งเว็บยังมี warning เรื่องขนาด แต่ build ผ่าน
