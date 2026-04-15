# CIP

เว็บเติมเกมและขายดิจิทัลกูดส์ภาษาไทย สร้างด้วย `Vite React + Tailwind CSS 4 + Express + MariaDB`

## เริ่มต้นใช้งาน

1. ติดตั้งแพ็กเกจด้วย `corepack pnpm install`
2. เตรียม env ด้วย `corepack pnpm setup:local`
3. สร้างฐานข้อมูล MariaDB ตามชื่อใน env
4. รัน `corepack pnpm db:push`
5. รัน `corepack pnpm db:seed`
6. รัน `corepack pnpm dev`

## ทดสอบ flow บน localhost

- เข้าด้วย `demo@example.com / DemoPass123!`
- ซื้อสินค้าแบบ PromptPay
- ไปหน้า Account แล้วกด `จำลองชำระเงินบน localhost`
- ตรวจดูสถานะออเดอร์และ payload ที่ส่งสินค้าอัตโนมัติ

อ่านคู่มือภาษาไทยเพิ่มเติมใน [docs/LOCAL_SETUP_TH.md](D:\cip\docs\LOCAL_SETUP_TH.md) และ [docs/DEPLOY_NOKHOSTING_TH.md](D:\cip\docs\DEPLOY_NOKHOSTING_TH.md)
