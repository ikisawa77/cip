# งานถัดไป

1. สร้าง `.env.local` จาก `.env.example` และใส่ค่า MariaDB จริง
2. รัน `corepack pnpm db:push`
3. รัน `corepack pnpm db:seed`
4. รัน `corepack pnpm dev:api` และ `corepack pnpm dev:web`
5. ทดสอบ flow บน localhost ด้วยบัญชี admin/demo
6. เติม adapter production ของ `Wepay`, `24Payseller`, `Peamsub24hr`, `K-BIZ`, `TrueMoney`, `RDCW` ด้วย payload จริง
7. เพิ่ม social login LINE / Google / Discord
8. ทำ admin CRUD ให้ลึกขึ้นสำหรับ inventory, random pools, wallet transactions และ job queue
9. commit + push พร้อมอัปเดตไฟล์ handoff ภาษาไทยอีกครั้ง
