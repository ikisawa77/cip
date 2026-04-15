# Handoff

## ทำอะไรไปแล้ว
- เพิ่มเมนูหมวดหมู่ฝั่งหน้าร้านใน [apps/web/src/pages/HomePage.tsx](D:\cip\apps\web\src\pages\HomePage.tsx)
- เพิ่มหน้าเติมเงินแยกที่ [apps/web/src/pages/TopupPage.tsx](D:\cip\apps\web\src\pages\TopupPage.tsx)
- เพิ่ม route `/topup` ใน [apps/web/src/App.tsx](D:\cip\apps\web\src\App.tsx)
- ปรับ [apps/web/src/components/Layout.tsx](D:\cip\apps\web\src\components\Layout.tsx) ให้เข้าถึงหมวดหมู่และหน้าเติมเงินได้จาก header

## ตอนนี้ระบบอยู่ตรงไหน
- หน้าแรกมี category menu สำหรับกรองหมวดสินค้าแล้ว
- หน้า `/topup` สร้าง payment intent ได้จาก 3 วิธี: `promptpay_qr`, `truemoney_gift`, `kbiz_match`
- ถ้าอยู่ localhost สามารถกดจำลองชำระเงินจากหน้าเติมเงินได้
- build ฝั่งเว็บผ่านและ asset ใหม่ถูกส่งเข้า `apps/api/public` แล้ว

## ต้องทำอะไรต่อ
1. ทดสอบ flow หน้าร้านจริงบน `http://127.0.0.1:5173/`
2. ทดสอบ flow เติมเงินบน `http://127.0.0.1:5173/topup`
3. ถ้าจะเก็บ UX ต่อ ให้เพิ่มหน้า category detail หรือ breadcrumb ที่หน้า product
4. เริ่มเชื่อม provider จริงตัวแรก

## ถ้าจะทำต่อจากเครื่องอื่น
- pull ล่าสุดจาก `main`
- รัน `run-localhost.bat`
- อ่าน `PROGRESS_TH.md` และ `NEXT_STEPS_TH.md` ก่อนเริ่มรอบใหม่

## บัญชีทดสอบ
- Admin: `admin@example.com` / `ChangeMe123!`
- Demo: `demo@example.com` / `DemoPass123!`
