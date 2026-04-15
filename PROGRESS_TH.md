# ความคืบหน้า

## รอบล่าสุด
- ติดตั้ง `uipro-cli` และลง `ui-ux-pro-max` ในโฟลเดอร์ `.codex/`
- ปรับ UI ฝั่งเว็บให้ใช้ฟอนต์ Prompt ทั้งระบบ และเปลี่ยนโทนสีเป็นแบบสว่างสะอาดตา
- รีดีไซน์หน้า Home, Auth dialog, Account, Admin และ Layout โดยคง flow ล่าสุดของระบบไว้
- แก้ `ProtectedRoute` ให้ dialog ล็อกอินไม่เด้งกลับทันทีเมื่อผู้ใช้กดปิดบนหน้า `/account` และ `/admin`
- ติดตั้ง MariaDB Server ลงบนเครื่องพัฒนา
- สร้างสคริปต์ `scripts/ensure-mariadb-local.ps1` สำหรับเช็ก/เปิด MariaDB local และสร้างฐาน `cip_local` อัตโนมัติ
- เพิ่ม `start-db-local.bat` สำหรับเปิดฐานข้อมูล local แยกได้
- อัปเดต `first-time-setup.bat`, `run-localhost.bat`, `run-api-local.bat` ให้เช็กฐานข้อมูล local ก่อนรัน
- ปรับ `.env.example` และ `.env.local` ให้ใช้ค่า local ที่รันได้จริงกับ MariaDB ที่เพิ่งติดตั้ง
- อัปเดต `docs/LOCAL_SETUP_TH.md` ให้สะท้อน flow localhost แบบใหม่

## สถานะการทดสอบ
- `corepack pnpm --filter @cip/web check` ผ่าน
- `corepack pnpm --filter @cip/web build` ผ่าน
- `pnpm db:push` ผ่าน
- `pnpm db:seed` ผ่าน
- API health ตอบกลับจาก `http://127.0.0.1:3001/api/health`
- Web dev server ตอบกลับจาก `http://127.0.0.1:5173`
- ตอนนี้ MariaDB local, API dev และ Web dev ถูกเปิดทดสอบสำเร็จบนเครื่องนี้แล้ว
