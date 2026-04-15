# ความคืบหน้า

## รอบล่าสุด
- ปรับ UX/UI หลายหน้าพร้อมเพิ่ม icon และ section heading กลางให้ใช้ภาษาภาพเดียวกันทั้ง `Home`, `Category`, `Product`, `Account`, `Admin`, `Topup`, `Layout` และ `ProtectedRoute`
- แก้ flow ซื้อสินค้าด้วย Wallet ที่หน้า product ให้รีเฟรช `auth/me`, `wallet/history`, `orders` และ `product` ทันทีหลังสร้างออเดอร์สำเร็จ จึงเห็นยอดเงินตัดทันทีบนหน้าเว็บ
- ตรวจสอบ API ซื้อสินค้าจริงบน localhost แล้วพบว่า backend ตัดยอด Wallet ได้ถูกต้อง ปัญหาหลักอยู่ที่หน้าเว็บไม่รีเฟรชข้อมูลหลังซื้อ
- เสริม backend ใน `createOrder` ให้ซื้อด้วย Wallet ผ่าน transaction ตั้งแต่ต้น เพื่อลดความเสี่ยงเรื่องออเดอร์ถูกสร้างแต่ยอดเงินไม่ sync
- ทดสอบตัวกรองหมวดหมู่หน้าร้านด้วย catalog จริงบน localhost แล้ว ตัวกรองแสดงเฉพาะสินค้าตามหมวดที่เลือกถูกต้อง
- ทดสอบสร้าง `paymentIntent` และจำลองชำระเงินบน `/topup` สำเร็จ ยอด Wallet ของบัญชีทดสอบเพิ่มขึ้นจริง
- เพิ่มหน้า [CategoryPage](D:\cip\apps\web\src\pages\CategoryPage.tsx) สำหรับ route `/category/:slug`
- เพิ่ม breadcrumb และลิงก์หมวดบน [ProductPage](D:\cip\apps\web\src\pages\ProductPage.tsx)
- ปรับ [HomePage](D:\cip\apps\web\src\pages\HomePage.tsx) ให้ลิงก์จากหมวดไปหน้า category detail ได้

## สถานะการทดสอบ
- `corepack pnpm --filter @cip/api check` ผ่าน
- `corepack pnpm --filter @cip/api build` ผ่าน
- `corepack pnpm --filter @cip/web check` ผ่าน
- `corepack pnpm --filter @cip/web build` ผ่าน
- ตรวจ DOM ของ `/category/digital-goods` แล้วพบรายการในหมวดครบ
- ตรวจ DOM ของ `/product/valorant-60-point-code` แล้ว breadcrumb และลิงก์หมวดแสดงถูกต้อง
- ทดสอบ API login + topup + settle บน localhost แล้วสำเร็จ
- ทดสอบ API login + สั่งซื้อสินค้าด้วย Wallet บน localhost แล้วสำเร็จ ยอดจาก `153100` ลดเป็น `141200` เซนต์ตามราคาสินค้า
