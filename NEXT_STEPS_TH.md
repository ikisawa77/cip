# งานถัดไป

1. ต่อยอด bridge ฝั่ง statement/K-Biz
ตอนนี้อ่านไฟล์ export JSON / CSV แล้วส่งเข้า `POST /api/internal/kbiz/match-statement` ได้แล้ว
งานถัดไปคือดึง statement จริงจาก source ภายนอกอัตโนมัติ แล้วตั้ง schedule ให้วิ่งเอง

2. เชื่อม provider ภายนอกตัวแรก
แนะนำเริ่ม `Wepay` หรือ `24Payseller` แล้วแทน scaffold ใน [D:\cip\apps\api\src\providers\registry.ts](D:\cip\apps\api\src\providers\registry.ts)

3. เพิ่ม admin operations
เช่น refund, manual review, payment audit, order detail ลึกขึ้น

4. เก็บ performance รอบถัดไป
ต่อจาก code-splitting ที่เริ่มแล้วในหน้า `admin`, `account`, `topup`, `product`, `category` และ `AuthDialog`
ให้ดู route prefetch, แยกส่วนกราฟ/ตารางหนักในหลังบ้าน และเช็ก bundle size รอบ build production
