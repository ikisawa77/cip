# ความคืบหน้า

## รอบล่าสุด
- เพิ่มเมนูหมวดหมู่ฝั่งหน้าร้านใน [apps/web/src/pages/HomePage.tsx](D:\cip\apps\web\src\pages\HomePage.tsx) พร้อมตัวกรองตามหมวดผ่าน query string
- เพิ่มหน้าเติมเงินใหม่ที่ [apps/web/src/pages/TopupPage.tsx](D:\cip\apps\web\src\pages\TopupPage.tsx)
- เพิ่ม route `/topup` ใน [apps/web/src/App.tsx](D:\cip\apps\web\src\App.tsx)
- ปรับ [apps/web/src/components/Layout.tsx](D:\cip\apps\web\src\components\Layout.tsx) ให้มีลิงก์ `หมวดหมู่` และ `เติมเงิน`
- หน้าแรกมี CTA เชื่อมจากหมวดสินค้าไปหน้าเติมเงินได้ทันที และหน้าเติมเงินรองรับการสร้าง payment intent แยกจากหน้า account

## สถานะการทดสอบ
- `corepack pnpm --filter @cip/web check` ผ่าน
- `corepack pnpm --filter @cip/web build` ผ่าน
- asset ฝั่งเว็บ build ใหม่ไปที่ `apps/api/public` แล้ว
