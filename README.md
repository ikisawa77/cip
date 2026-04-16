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

อ่านคู่มือภาษาไทยเพิ่มเติมใน [docs/LOCAL_SETUP_TH.md](./docs/LOCAL_SETUP_TH.md), [docs/LOCAL_BATCH_RUN_TH.md](./docs/LOCAL_BATCH_RUN_TH.md) และ [docs/DEPLOY_NOKHOSTING_TH.md](./docs/DEPLOY_NOKHOSTING_TH.md)

## Guardrails สำหรับทำงานข้าม 2 เครื่อง

- รีโปนี้ล็อก `Node.js 24.12.0` และ `pnpm 10.33.0` ผ่าน `.nvmrc`, `.node-version` และ `package.json`
- ใช้ `pnpm` อย่างเดียวในรีโปนี้ ห้าม `npm install`
- ถ้าจะเช็กเครื่องก่อนเริ่มงาน ให้รัน `doctor-local.bat` หรือ `pnpm doctor:local`
- ถ้าเพิ่ง `git pull` จากอีกเครื่อง แนะนำให้รัน `doctor-local.bat` ก่อนทุกครั้ง
- ถ้าจะพาเครื่องให้ตรงมาตรฐาน ให้รัน `standardize-local.bat -Mode report` ก่อน แล้วค่อย `standardize-local.bat -Mode repair`
- ถ้าจะเทียบ 2 เครื่องตรง ๆ ให้ export report จากแต่ละเครื่องแล้วใช้ `compare-machine-standard.bat`
