# Handoff

## ทำอะไรไปแล้ว
- เพิ่ม backend CRUD สำหรับหมวดหมู่ใน [apps/api/src/services/store.ts](D:\cip\apps\api\src\services\store.ts) และ [apps/api/src/index.ts](D:\cip\apps\api\src\index.ts)
- เพิ่ม backend CRUD สำหรับ inventory item รายชิ้น รวมการถอดรหัส payload ให้ดูและแก้จากหลังบ้านได้
- ปรับหน้า [apps/web/src/pages/AdminPage.tsx](D:\cip\apps\web\src\pages\AdminPage.tsx) ให้มีเมนูภายในหน้าและส่วนจัดการหมวดหมู่/คลังโค้ดครบ
- ทำให้แอดมินเพิ่ม แก้ไข ลบ code ได้จริง และยังมี bulk import ไว้ใช้งานต่อ

## ตอนนี้ระบบอยู่ตรงไหน
- หน้า `/admin` พร้อมทดสอบหมวดหมู่และคลังโค้ดแล้ว
- API ใหม่ที่เพิ่มคือ:
  - `GET/POST/PUT/DELETE /api/admin/categories`
  - `GET/POST/PUT/DELETE /api/admin/inventory/items`
- build และ type-check ของ `@cip/api` และ `@cip/web` ผ่านแล้ว

## ต้องทำอะไรต่อ
1. เปิด `run-localhost.bat`
2. เข้าระบบแอดมินที่ `http://127.0.0.1:5173/admin`
3. สร้างหมวดหมู่จริงตามรูปแบบการขายของร้าน
4. เพิ่มสินค้าให้ผูกกับหมวดหมู่เหล่านั้นถ้าต้องการแยกหน้าร้านต่อ
5. ทดสอบเพิ่ม/แก้ไข/ลบ code และ bulk import
6. ต่อ provider จริงตัวแรก

## ถ้าจะทำต่อจากเครื่องอื่น
- pull ล่าสุดจาก `main`
- ถ้ายังไม่เคยตั้งเครื่อง ให้รัน `first-time-setup.bat`
- ถ้าเคยตั้งแล้ว ให้ใช้ `run-localhost.bat`
- อ่าน `PROGRESS_TH.md` และ `NEXT_STEPS_TH.md` ก่อนเริ่มรอบใหม่

## บัญชีทดสอบ
- Admin: `admin@example.com` / `ChangeMe123!`
- Demo: `demo@example.com` / `DemoPass123!`

## ข้อควรระวัง
- `.env.local` เป็นค่าทดสอบเฉพาะเครื่อง ห้าม commit
- รายการ inventory ที่ถูกขายแล้วจะไม่อนุญาตให้แก้ไขหรือลบ
- หมวดหมู่ที่ยังมีสินค้าอยู่จะไม่อนุญาตให้ลบ
