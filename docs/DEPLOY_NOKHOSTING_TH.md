# คู่มือ Deploy บน Nokhosting Node.js Hosting

อ้างอิงจากหน้าแพ็กเกจ Node.js Hosting และคู่มือ Node.js ของ Nokhosting:
- [Node.js Hosting](https://www.nokhosting.com/category/node-js-hosting)
- [Node.js คู่มือ](https://www.nokhosting.com/knowledgebase/node-js)

## แนวทาง deploy
1. สร้าง MariaDB Database ผ่าน cPanel
2. ตั้งค่า `.env.production` บนเซิร์ฟเวอร์
3. ใช้ Git หรือ upload source ขึ้นเซิร์ฟเวอร์
4. ติดตั้ง dependencies ด้วย Terminal/SSH:
   ```bash
   corepack pnpm install --frozen-lockfile
   ```
5. build โปรเจกต์:
   ```bash
   corepack pnpm build
   ```
6. รัน migration:
   ```bash
   corepack pnpm db:push
   ```
7. ตั้งค่า Node.js App ให้ชี้ไปที่ startup file ของ API
8. ตั้งค่า Cron Jobs ตามคู่มือ `docs/CRON_JOBS_TH.md`

## ข้อควรระวัง
- ใช้ MariaDB เท่านั้น
- หลีกเลี่ยง worker process ค้างยาว
- ให้ Express serve static build ของ frontend
- ตั้ง webhook URL เป็นโดเมนจริงพร้อม HTTPS
