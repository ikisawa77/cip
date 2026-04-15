# Handoff

## ทำอะไรไปแล้ว
- ทดสอบเมนูหมวดหมู่หน้าร้านบน localhost แล้ว ตัวกรองทำงานตรงกับข้อมูลจริงจาก `catalog`
- ทดสอบ login + สร้าง `paymentIntent` + จำลองชำระเงินบน `/topup` สำเร็จ
- เพิ่ม route `/category/:slug` และหน้า [CategoryPage](D:\cip\apps\web\src\pages\CategoryPage.tsx)
- เพิ่ม breadcrumb และลิงก์หมวดใน [ProductPage](D:\cip\apps\web\src\pages\ProductPage.tsx)
- ปรับ [HomePage](D:\cip\apps\web\src\pages\HomePage.tsx) ให้เปิดหน้าหมวดแบบแยกได้

## ผลทดสอบล่าสุด
- หมวด `digital-goods` แสดงเฉพาะสินค้า `Offline RPG Download Bundle` และ `Valorant 60 Point Code`
- บัญชี `demo@example.com` สร้าง topup 150 บาทได้ และหลัง settle ยอด Wallet เพิ่มจาก `150000` เป็น `165000` เซนต์
- route `/category/digital-goods` และ `/product/valorant-60-point-code` แสดงผลถูกต้อง

## ตอนนี้ระบบอยู่ตรงไหน
- หน้าร้านมีทั้ง filter หมวดและหน้า category detail
- หน้า product มี breadcrumb และลิงก์กลับไปยังหมวด
- หน้า `/topup` พร้อมใช้ทดสอบ flow เติมเงินบน localhost

## ต้องทำอะไรต่อ
1. ทดสอบ flow ซื้อสินค้าจากหน้า category detail ไปถึง order
2. เก็บ UX เพิ่มในหน้า product/category ถ้าต้องการ
3. เริ่มเชื่อม provider จริงตัวแรก

## ถ้าจะทำต่อจากเครื่องอื่น
- pull ล่าสุดจาก `main`
- รัน `run-localhost.bat`
- อ่าน `PROGRESS_TH.md` และ `NEXT_STEPS_TH.md`
