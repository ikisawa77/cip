# Handoff

## ทำอะไรไปแล้ว
- วาง monorepo ใหม่จาก repo ว่าง
- เพิ่ม `packages/shared` สำหรับ schema/type กลาง
- เพิ่ม `apps/api` ที่มี:
  - env loader
  - Drizzle schema สำหรับตารางหลัก
  - auth/session ด้วย cookie
  - forgot password OTP
  - wallet top-up intents
  - order creation + fulfillment scaffold
  - admin endpoints
  - webhook endpoints
  - cron endpoints สำหรับ shared hosting
  - provider adapter registry/scaffold
  - dev payment settle endpoint สำหรับ localhost
- เพิ่ม `apps/web` ที่มี:
  - หน้า Home/Catalog
  - หน้า Product
  - หน้า Account
  - หน้า Admin
  - popup login/register
  - forgot password flow
  - account order detail + dev settle button
  - admin inventory import / queue jobs / provider sandbox toggle
  - เปลี่ยนฟอนต์ทั้งเว็บเป็น Prompt
  - ปรับธีมใหม่ให้สะอาดตาและลดโทนสีที่หนักเกินไป
- ทำ build ให้ frontend ออกไปที่ `apps/api/public` เพื่อให้ Express serve ได้
- เขียน docs และไฟล์ progress/handoff ภาษาไทยครบ

## ตอนนี้ระบบอยู่ตรงไหน
- โค้ดผ่าน `test`, `check`, และ `build`
- ยังไม่ได้เชื่อมฐานข้อมูลจริงในเครื่องนี้
- provider adapters ยังเป็น scaffold ที่ออกแบบ flow และ endpoint ไว้ก่อน
- localhost flow สามารถจำลองการชำระเงินได้เมื่อมีฐานข้อมูลจริงแล้ว
- หน้าเว็บหลักฝั่งลูกค้าและหลังบ้านถูกรีดีไซน์แล้ว แต่ยังควร polish เพิ่มหลังเชื่อมข้อมูลจริง

## ต้องทำอะไรต่อ
1. รัน `corepack pnpm setup:local`
2. ตั้งค่า `.env.local`
3. รัน `db:push` และ `db:seed`
4. รัน `corepack pnpm dev`
5. เปิดทดสอบ:
   - `http://localhost:5173`
   - API `http://localhost:3001/api/health`
6. ซื้อสินค้าผ่าน PromptPay แล้วกดจำลองชำระเงินในหน้า Account
7. เติม integration จริงของ provider ทีละเจ้า

## ถ้าจะทำต่อจากเครื่องอื่น
- clone repo
- คัดลอก `.env.example` เป็น `.env.local`
- ติดตั้ง Node.js 24+
- ใช้ `corepack pnpm install`
- เตรียม MariaDB local หรือ production ตามคู่มือ
- ถ้าต้องการให้ไฟล์ env ถูกสร้างอัตโนมัติ ให้ใช้ `corepack pnpm setup:local`
- รัน `corepack pnpm check`
- รัน `corepack pnpm build`

## ข้อควรระวัง
- production บน Nokhosting ต้องใช้ MariaDB ไม่ใช่ SQLite
- งาน cron ต้องใช้ secret ป้องกันการเรียกจากภายนอก
- ระบบอีเมลควรใช้ SMTP ภายนอก ไม่พึ่งโฮสต์ส่งตรง
- `apps/api/public` เป็น build output ของ frontend และไม่ควรแก้มือโดยตรง
- ยังไม่มี `.env.local` ใน repo ดังนั้นเครื่องใหม่ต้องสร้างเองก่อนรัน
