# Handoff

## ทำอะไรไปแล้ว
- โปรเจกต์รองรับ localhost ได้จริงแล้วบนเครื่องนี้
- ติดตั้ง MariaDB Server, สร้างฐาน `cip_local`, push schema และ seed ข้อมูลตัวอย่างเรียบร้อย
- เพิ่มสคริปต์ช่วยเปิดฐานข้อมูล local อัตโนมัติ
- batch หลักสำหรับ Windows ถูกจัด flow ใหม่ให้เหมาะกับการใช้งานจริง
- หน้าเว็บหลักถูกปรับธีมเป็น Prompt + clean light UI แล้ว
- แก้ route guard ให้ modal ล็อกอินบน `/account` และ `/admin` ปิดได้จริง ไม่เด้งกลับทันที
- ติดตั้ง skill `ui-ux-pro-max` ใน `.codex/` เพื่อให้เครื่องถัดไปมีบริบทงาน UI ชุดเดียวกัน

## ตอนนี้ระบบอยู่ตรงไหน
- MariaDB local ใช้งานได้บนพอร์ต `3306`
- API dev ใช้งานได้บน `http://127.0.0.1:3001`
- Web dev ใช้งานได้บน `http://127.0.0.1:5173`
- `.env.local` ของเครื่องนี้ถูกตั้งให้ใช้ `root` และรหัสผ่านว่างสำหรับ local dev

## ต้องทำอะไรต่อ
1. เปิดเว็บแล้วทดสอบ flow ผู้ใช้จริง
2. ทดสอบ admin dashboard, inventory import และ queue jobs
3. เก็บ UI หน้า Product และรายละเอียดยิบย่อยเพิ่ม
4. เริ่มต่อ provider integration จริง

## ถ้าจะทำต่อจากเครื่องอื่น
- clone repo
- ติดตั้ง Node.js 24+
- ติดตั้ง MariaDB Server
- รัน `first-time-setup.bat`
- จากนั้นใช้ `run-localhost.bat`

## ค่าและบัญชีทดสอบ
- Web: `http://127.0.0.1:5173`
- API health: `http://127.0.0.1:3001/api/health`
- Admin:
  - email: `admin@example.com`
  - password: `ChangeMe123!`
- Demo customer:
  - email: `demo@example.com`
  - password: `DemoPass123!`

## ข้อควรระวัง
- ตอนนี้ `.env.local` เป็นค่าทดสอบเฉพาะเครื่อง local และไม่ควร commit
- `stop-localhost.bat` ปิดเฉพาะ API/Web dev server ไม่ได้ปิด MariaDB
- ถ้าจะใช้งาน `.codex/skills/ui-ux-pro-max` หลัง pull บนอีกเครื่อง ควรเริ่มรอบแชตใหม่หรือ restart assistant หนึ่งครั้งเพื่อให้เห็น skill ล่าสุด
