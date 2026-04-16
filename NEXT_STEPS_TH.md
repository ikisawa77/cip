# งานถัดไป

1. ทำ bridge ฝั่ง statement/K-Biz
ให้ระบบดึงธุรกรรมจริงแล้วส่งเข้า `POST /api/internal/promptpay/match-transactions` หรือ signed webhook อัตโนมัติ

2. เชื่อม provider ภายนอกตัวแรก
แนะนำเริ่ม `Wepay` หรือ `24Payseller` แล้วแทน scaffold ใน [D:\cip\apps\api\src\providers\registry.ts](D:\cip\apps\api\src\providers\registry.ts)

3. เพิ่ม admin operations
เช่น refund, manual review, payment audit, order detail ลึกขึ้น

4. เก็บ performance รอบหน้า
เริ่ม code-splitting หน้า `admin`, `account`, `topup`
