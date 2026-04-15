# การรันบน localhost

## สิ่งที่ต้องมี
- Node.js 24 ขึ้นไป
- Git
- MariaDB Server

หมายเหตุ: ตอนนี้โปรเจกต์มีสคริปต์ช่วยเปิด MariaDB local ให้อัตโนมัติแล้ว ถ้าติดตั้ง MariaDB Server ไว้ในเครื่อง

## วิธีที่ง่ายที่สุด
1. รันครั้งแรก:
   ```bash
   first-time-setup.bat
   ```
2. ครั้งถัดไปให้รัน:
   ```bash
   run-localhost.bat
   ```

## first-time setup ทำอะไรให้บ้าง
- ติดตั้ง dependencies
- สร้าง `.env.local` จาก `.env.example`
- เปิดไฟล์ `.env.local` ให้ตรวจค่า
- เช็กและเปิด MariaDB local
- สร้างฐาน `cip_local` ถ้ายังไม่มี
- push schema
- seed ข้อมูลตัวอย่าง

## ไฟล์และ batch ที่ใช้บ่อย
- `first-time-setup.bat`
  ใช้ครั้งแรกหรือหลังลบ `node_modules`
- `start-db-local.bat`
  ใช้เปิด MariaDB local อย่างเดียว
- `run-localhost.bat`
  ใช้เปิดทั้ง API และ Web พร้อมกัน
- `run-api-local.bat`
  ใช้เปิดเฉพาะ API
- `run-web-local.bat`
  ใช้เปิดเฉพาะ Web
- `stop-localhost.bat`
  ใช้ปิด dev server ของ API/Web

## ค่า local ปัจจุบัน
- DB host: `127.0.0.1`
- DB port: `3306`
- DB user: `root`
- DB password: เว้นว่าง
- DB name: `cip_local`

ถ้าภายหลังเปลี่ยนรหัสผ่าน MariaDB ให้แก้ใน `.env.local` ให้ตรงก่อนรัน

## บัญชีทดสอบหลัง seed
- Admin:
  - email: ค่าจาก `ADMIN_EMAIL` ใน `.env.local`
  - password: ค่าจาก `ADMIN_PASSWORD` ใน `.env.local`
- Customer demo:
  - email: `demo@example.com`
  - password: `DemoPass123!`

## ทดสอบ flow บน localhost
1. เปิด `http://localhost:5173`
2. ล็อกอินด้วยบัญชี demo
3. ซื้อสินค้าที่ใช้ `PromptPay`
4. ไปที่หน้า `บัญชีของฉัน`
5. กดปุ่ม `จำลองชำระเงินบน localhost`
6. ตรวจดูสถานะออเดอร์และ `deliveryPayload`

## คำสั่งหลัก
- `corepack pnpm build`
- `corepack pnpm check`
- `corepack pnpm test`
- `corepack pnpm setup:local`
- `corepack pnpm db:push`
- `corepack pnpm db:seed`
