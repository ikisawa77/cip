# Handoff

## ทำอะไรไปแล้ว
- ปรับ UX/UI หลายหน้าพร้อมเพิ่ม icon และ section heading กลางให้ใช้ภาษาภาพเดียวกันทั้ง `Home`, `Category`, `Product`, `Account`, `Admin`, `Topup`, `Layout` และ `ProtectedRoute`
- ปรับ header/menu ให้ลำดับชัดขึ้น และเมนู `หลังบ้าน` เห็นเฉพาะผู้ใช้ที่เป็น `admin`
- ตรวจสอบ flow ซื้อสินค้าด้วย Wallet บน localhost แล้วพบว่า backend ตัดยอดเงินถูกต้องจริง
- แก้ [D:\cip\apps\web\src\pages\ProductPage.tsx](D:\cip\apps\web\src\pages\ProductPage.tsx) ให้รีเฟรช `auth/me`, `wallet/history`, `orders` และ `product` หลังสั่งซื้อสำเร็จ จึงเห็นยอดเงินตัดทันที
- เสริม [D:\cip\apps\api\src\services\store.ts](D:\cip\apps\api\src\services\store.ts) ให้ flow ซื้อด้วย Wallet ใช้ transaction ตั้งแต่ต้น ลดความเสี่ยงเรื่องออเดอร์กับยอดเงินไม่ตรงกัน

## ผลทดสอบล่าสุด
- `corepack pnpm --filter @cip/api check` ผ่าน
- `corepack pnpm --filter @cip/api build` ผ่าน
- `corepack pnpm --filter @cip/web check` ผ่าน
- `corepack pnpm --filter @cip/web build` ผ่าน
- ทดสอบ API ซื้อสินค้าด้วย Wallet จริงบน localhost แล้วสำเร็จ ยอดลดจาก `153100` เป็น `141200` เซนต์ตามราคาสินค้า

## ตอนนี้ระบบอยู่ตรงไหน
- หน้า storefront หลักมี menu, category detail, product detail และ topup ที่คุมธีมใหม่ค่อนข้างครบ
- หน้า account และ admin ใช้ icon system และ section head ชุดเดียวกับหน้าร้านแล้ว
- ปัญหา “ซื้อแล้วเหมือนยอดไม่ลด” ฝั่งหน้าเว็บถูกแก้แล้ว และ backend มี guard เพิ่มขึ้น

## ต้องทำอะไรต่อ
1. ทดสอบหน้าเว็บจริงบน localhost หลังแก้รอบนี้ โดยซื้อสินค้าผ่าน Wallet จาก browser และเช็กยอดใน header/account/product
2. เก็บ UX/UI เพิ่มใน modal auth และ state loading/empty/error ให้เข้าธีมเดียวกัน
3. เริ่มเชื่อม provider จริงตัวแรก เช่น `Wepay` หรือ `24Payseller`

## ถ้าจะทำต่อจากเครื่องอื่น
- pull ล่าสุดจาก `main`
- รัน `run-localhost.bat`
- ถ้าจะตรวจ flow ซื้อสินค้า ให้ใช้บัญชี demo แล้วทดสอบจากหน้า product โดยตรง
- อ่าน `PROGRESS_TH.md` และ `NEXT_STEPS_TH.md` ก่อนเริ่มรอบใหม่
