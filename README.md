# CIP

เว็บเติมเกมและขายดิจิทัลกูดส์ภาษาไทย สร้างด้วย `Vite React + Tailwind CSS 4 + Express + MariaDB`

## เริ่มต้นใช้งาน

1. คัดลอก `.env.example` เป็น `.env.local`
2. ติดตั้งแพ็กเกจด้วย `corepack pnpm install`
3. สร้างฐานข้อมูล MariaDB ตามชื่อใน env
4. รัน `corepack pnpm db:push`
5. รัน `corepack pnpm db:seed`
6. เปิด 2 เทอร์มินัล:
   - `corepack pnpm dev:api`
   - `corepack pnpm dev:web`

อ่านคู่มือภาษาไทยเพิ่มเติมใน [docs/LOCAL_SETUP_TH.md](D:\cip\docs\LOCAL_SETUP_TH.md) และ [docs/DEPLOY_NOKHOSTING_TH.md](D:\cip\docs\DEPLOY_NOKHOSTING_TH.md)
