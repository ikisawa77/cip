# ความคืบหน้า

## รอบล่าสุด
- สร้าง monorepo `pnpm` ครบชุด: `apps/web`, `apps/api`, `packages/shared`
- วาง backend `Express + MariaDB + Drizzle ORM` พร้อม schema หลักของระบบร้านเติมเกม
- วาง frontend `Vite React + Tailwind CSS 4 + React Query + React Router + Framer Motion`
- ทำ flow หลักรอบแรกแล้ว:
  - catalog และ product detail
  - register / login / logout / me
  - forgot password request / verify
  - wallet top-up intent
  - create order / order history / order detail
  - admin dashboard / categories / products / orders / providers / webhooks
  - webhook scaffold สำหรับ `wepay` และ `24payseller`
  - cron endpoints สำหรับ `process-jobs`, `cleanup-otps`, `provider-sync`
- ทำ seed script พร้อมหมวดหมู่และสินค้าตัวอย่าง
- ทำ docs ภาษาไทยสำหรับ localhost, Nokhosting, cron jobs และ workflow handoff

## สถานะการทดสอบ
- `corepack pnpm test` ผ่าน
- `corepack pnpm check` ผ่าน
- `corepack pnpm build` ผ่าน
- ยังไม่ได้รัน `db:push` / `db:seed` จริง เพราะยังไม่ได้ตั้งค่า MariaDB local ในเครื่องนี้
