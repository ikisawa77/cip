# การรันโปรเจกต์บน Windows ด้วยไฟล์ .bat

เอกสารนี้ใช้สำหรับเปิดระบบบน `localhost` แบบรวดเร็ว และย้ายไปพัฒนาต่อบนเครื่องอื่นได้ง่ายขึ้น

## ไฟล์ที่ใช้

- `first-time-setup.bat` สำหรับเตรียมเครื่องครั้งแรก
- `run-localhost.bat` สำหรับเปิดหน้าบ้านและหลังบ้านพร้อมกัน
- `run-api-local.bat` สำหรับเปิด API อย่างเดียว
- `run-web-local.bat` สำหรับเปิดเว็บอย่างเดียว
- `stop-localhost.bat` สำหรับปิด dev server ที่ใช้พอร์ต `3001` และ `5173`

## เตรียมเครื่องครั้งแรก

1. ติดตั้ง Node.js เวอร์ชันที่รองรับ `corepack`
2. ติดตั้ง MariaDB และสร้างฐานข้อมูลให้ตรงกับค่าใน `.env.local`
3. ดับเบิลคลิก `first-time-setup.bat`
4. ไฟล์จะช่วยทำตามลำดับนี้:
   - ติดตั้ง dependencies
   - สร้าง `.env.local` จาก `.env.example`
   - เปิด `.env.local` ให้แก้ค่าเชื่อมต่อฐานข้อมูล
   - รัน `db:push`
   - รัน `db:seed`

## ค่าที่ควรตรวจใน `.env.local`

- `APP_URL=http://localhost:5173`
- `API_URL=http://localhost:3001`
- `PORT=3001`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

ถ้ายังไม่ได้ตั้งค่าฐานข้อมูลให้ถูกต้อง ขั้น `db:push` และ `db:seed` จะไม่ผ่าน

## วิธีเปิดระบบเพื่อทดสอบ

### เปิดทั้งระบบพร้อมกัน

ดับเบิลคลิก `run-localhost.bat`

ผลลัพธ์:
- API ทำงานที่ `http://localhost:3001`
- Web ทำงานที่ `http://localhost:5173`

### เปิดทีละส่วน

- ดับเบิลคลิก `run-api-local.bat` ถ้าต้องการเปิดเฉพาะหลังบ้าน
- ดับเบิลคลิก `run-web-local.bat` ถ้าต้องการเปิดเฉพาะหน้าบ้าน

## วิธีปิดระบบ

### ปิดแบบปกติ

ปิดหน้าต่าง terminal ที่เปิดจากไฟล์ `.bat`

### ปิดแบบรวดเร็ว

ดับเบิลคลิก `stop-localhost.bat`

สคริปต์จะพยายามหยุดโปรเซสที่ฟังพอร์ต `3001` และ `5173`

## ทดสอบหลังเปิดระบบ

1. เปิด `http://localhost:5173`
2. เช็ก API ที่ `http://localhost:3001/api/health`
3. ลองเข้าระบบด้วยบัญชีตัวอย่าง:
   - `demo@example.com`
   - `DemoPass123!`

## หมายเหตุ

- ถ้าเพิ่ง clone โปรเจกต์บนเครื่องใหม่ ให้เริ่มจาก `first-time-setup.bat`
- ถ้า `node_modules` ยังไม่ถูกติดตั้ง ไฟล์รันระบบจะเตือนก่อนเริ่มงาน
- ถ้า API เปิดไม่ได้ ให้ตรวจ MariaDB และค่าฐานข้อมูลใน `.env.local`
- ถ้าเคยเจอหน้าจอ `Welcome to Node.js ...` แปลว่า wrapper เดิมของ package manager บน Windows ทำงานผิดปกติ ให้ใช้ไฟล์ `.bat` ชุดล่าสุดใน repo นี้ เพราะสคริปต์รันเว็บและ API ผ่าน `npm workspace` แทน
- ถ้ายังไม่มี `pnpm` ให้รัน `npm install -g pnpm@10.33.0` หนึ่งครั้งก่อนใช้ไฟล์ `.bat`

## Guardrails สำหรับ 2 เครื่อง

- ใช้ `Node.js 24.12.0` ให้ตรงกันทั้ง 2 เครื่อง
- ใช้ `pnpm 10.33.0` ให้ตรงกันทั้ง 2 เครื่อง
- ใช้ `pnpm` อย่างเดียวในรีโปนี้ และอย่าใช้ `npm install`
- ถ้าจะเช็กเครื่องก่อน setup หรือก่อน run ให้ดับเบิลคลิก `doctor-local.bat`
- ถ้ามีการ pull งานมาจากอีกเครื่อง ให้รัน `doctor-local.bat` ก่อนทุกครั้ง
- ถ้าจะเช็กและซ่อมมาตรฐานเครื่อง ให้ใช้ `standardize-local.bat -Mode report` และ `standardize-local.bat -Mode repair`
- ถ้าจะเทียบรายงานจากอีกเครื่อง ให้ใช้ `compare-machine-standard.bat -ReferencePath "<path-to-other-report>"`
