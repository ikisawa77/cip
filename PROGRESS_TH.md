# ความคืบหน้า

## รอบล่าสุด
- ทดสอบตัวกรองหมวดหมู่หน้าร้านด้วย catalog จริงบน localhost แล้ว ตัวกรองแสดงเฉพาะสินค้าตามหมวดที่เลือกถูกต้อง
- ทดสอบสร้าง `paymentIntent` และจำลองชำระเงินบน `/topup` สำเร็จ ยอด Wallet ของบัญชีทดสอบเพิ่มขึ้นจริง
- เพิ่มหน้า [CategoryPage](D:\cip\apps\web\src\pages\CategoryPage.tsx) สำหรับ route `/category/:slug`
- เพิ่ม breadcrumb และลิงก์หมวดบน [ProductPage](D:\cip\apps\web\src\pages\ProductPage.tsx)
- ปรับ [HomePage](D:\cip\apps\web\src\pages\HomePage.tsx) ให้ลิงก์จากหมวดไปหน้า category detail ได้

## สถานะการทดสอบ
- `corepack pnpm --filter @cip/web check` ผ่าน
- `corepack pnpm --filter @cip/web build` ผ่าน
- ตรวจ DOM ของ `/category/digital-goods` แล้วพบรายการในหมวดครบ
- ตรวจ DOM ของ `/product/valorant-60-point-code` แล้ว breadcrumb และลิงก์หมวดแสดงถูกต้อง
- ทดสอบ API login + topup + settle บน localhost แล้วสำเร็จ
