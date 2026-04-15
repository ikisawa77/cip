# การรันบน localhost

## สิ่งที่ต้องมี
- Node.js 24 ขึ้นไป
- MariaDB 10.6 ขึ้นไป
- Git

## ขั้นตอน
1. คัดลอก `.env.example` เป็น `.env.local`
2. ตั้งค่า `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
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
6. รัน API:
   ```bash
   corepack pnpm dev:api
   ```
7. รันเว็บ:
   ```bash
   corepack pnpm dev:web
   ```

## คำสั่งหลัก
- `corepack pnpm build`
- `corepack pnpm check`
- `corepack pnpm test`
