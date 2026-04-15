# ความคืบหน้า

## รอบล่าสุด
- เพิ่มการยืนยันรหัสผ่านก่อนสั่งซื้อใน [D:\cip\apps\web\src\pages\ProductPage.tsx](D:\cip\apps\web\src\pages\ProductPage.tsx) สำหรับปุ่ม `ซื้อด้วย Wallet` และ `ซื้อผ่าน PromptPay`
- เพิ่ม endpoint `POST /api/auth/confirm-password` ใน [D:\cip\apps\api\src\index.ts](D:\cip\apps\api\src\index.ts) เพื่อให้ฝั่งเว็บตรวจรหัสผ่านผู้ใช้ก่อนสร้างออเดอร์จริง
- เพิ่ม schema `authConfirmPasswordSchema` ใน [D:\cip\packages\shared\src\index.ts](D:\cip\packages\shared\src\index.ts) เพื่อใช้ร่วมกันระหว่าง web และ api
- เพิ่มเมนู `สินค้า` ใน [D:\cip\apps\web\src\pages\AdminPage.tsx](D:\cip\apps\web\src\pages\AdminPage.tsx) สำหรับเพิ่มสินค้าใหม่ กำหนดราคา และแก้ไขราคาสินค้าเดิมจากหลังบ้าน
- ขยาย API หลังบ้านใน [D:\cip\apps\api\src\index.ts](D:\cip\apps\api\src\index.ts) ให้ `POST /api/admin/products` และ `PUT /api/admin/products/:id` รองรับข้อมูลสินค้าได้ครบ เช่น หมวดหมู่ ประเภท ราคา ราคาเดิม badge รูป และสถานะเปิดขาย
- ปรับปุ่ม `Back to top` ใน [D:\cip\apps\web\src\components\Layout.tsx](D:\cip\apps\web\src\components\Layout.tsx) และ [D:\cip\apps\web\src\styles.css](D:\cip\apps\web\src\styles.css) ให้แสดง progress การเลื่อนหน้าและข้อความตามบริบทของแต่ละหน้า

## สถานะการทดสอบ
- `corepack pnpm --filter @cip/shared check` ผ่าน
- `corepack pnpm --filter @cip/api check` ผ่าน
- `corepack pnpm --filter @cip/api build` ผ่าน
- `corepack pnpm --filter @cip/web check` ผ่าน
- `corepack pnpm --filter @cip/web build` ผ่าน

## หมายเหตุ
- ฝั่งเว็บยังมี warning เรื่อง bundle size เกิน 500 kB หลัง build แต่ระบบยัง build ผ่านและใช้งานได้
- งานรอบนี้เน้นฝั่ง UX การยืนยันก่อนซื้อและการจัดการสินค้า/ราคาในหลังบ้าน ยังไม่ได้เชื่อม provider จริงเพิ่ม
