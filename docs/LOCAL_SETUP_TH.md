# การรันบน localhost

## สิ่งที่ต้องมี
- Node.js 24 ขึ้นไป
- MariaDB 10.6 ขึ้นไป
- Git

## ขั้นตอน
1. เตรียมไฟล์ env แบบเร็ว:
   ```bash
   corepack pnpm setup:local
   ```
2. ตั้งค่า `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` ใน `.env.local`
3. ติดตั้ง dependencies:
   ```bash
   corepack pnpm install
   ```
4. สร้าง schema:
   ```bash
   corepack pnpm db:push
   ```
5. seed ข้อมูลเริ่มต้น:
   ```bash
   corepack pnpm db:seed
   ```
6. รันทั้งระบบพร้อมกัน:
   ```bash
   corepack pnpm dev
   ```

## บัญชีทดสอบหลัง seed
- Admin:
  - email: ค่า `ADMIN_EMAIL` ใน `.env.local`
  - password: ค่า `ADMIN_PASSWORD` ใน `.env.local`
- Customer demo:
  - email: `demo@example.com`
  - password: `DemoPass123!`

## ทดสอบ flow บน localhost
1. เปิด `http://localhost:5173`
2. ล็อกอินด้วยบัญชี demo
3. ซื้อสินค้าที่ใช้ `PromptPay`
4. ไปที่หน้า `บัญชีของฉัน`
5. กดปุ่ม `จำลองชำระเงินบน localhost` เพื่อปิด payment intent แบบ dev
6. ตรวจดู `deliveryPayload` หรือสถานะออเดอร์

## คำสั่งหลัก
- `corepack pnpm build`
- `corepack pnpm check`
- `corepack pnpm test`
- `corepack pnpm setup:local`
