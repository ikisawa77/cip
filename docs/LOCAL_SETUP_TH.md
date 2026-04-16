# การรันบน localhost

## สิ่งที่ต้องมี
- Node.js 24 ขึ้นไป
- Git
- MariaDB Server

## วิธีที่ง่ายที่สุด
1. ครั้งแรกหรือหลังย้ายเครื่อง ให้รัน `first-time-setup.bat`
2. หลังจากนั้นใช้ `run-localhost.bat`

## batch จะช่วยอะไรให้
- เปิด MariaDB local ถ้ายังไม่รัน
- ตรวจว่า `cip_local` มี demo data สำคัญครบหรือไม่
- ถ้าขาด `users`, `products`, `site_contents` จะรัน `corepack pnpm db:seed` ให้เอง
- เปิด API ที่ `http://127.0.0.1:3001`
- เปิด Web ที่ `http://127.0.0.1:5173`

## บัญชีทดสอบหลัง seed
- Admin: `admin@example.com` / `ChangeMe123!`
- Demo: `demo@example.com` / `DemoPass123!`

## ทดสอบ PromptPay บน localhost
1. ล็อกอินด้วยบัญชี demo
2. เปิด [http://127.0.0.1:5173/topup](http://127.0.0.1:5173/topup)
3. สร้าง payment intent แบบ `PromptPay QR`
4. หน้าเว็บจะแสดง QR, ยอดที่ต้องโอน, reference และเวลาหมดอายุ
5. ถ้าจะทดสอบแบบ dev ให้กด `จำลองชำระเงินบน localhost`
6. ถ้าจะทดสอบจากหลังบ้าน ให้เปิด [http://127.0.0.1:5173/admin](http://127.0.0.1:5173/admin) แล้วไปเมนู `การชำระเงิน`

## ทดสอบ signed webhook
- ใช้ `send-promptpay-webhook-local.bat <payment-intent-id>`
- หรือ `corepack pnpm --filter @cip/api webhook:promptpay --payment-intent-id <id>`

## ทดสอบ transaction matcher
- ในหลังบ้านมีส่วน `ตัวจับคู่ธุรกรรม PromptPay` ให้วาง JSON array แล้วกดจับคู่ได้ทันที
- ถ้าจะยิงจากไฟล์ JSON ใช้ `match-promptpay-transactions-local.bat <path-to-json>`
- หรือ `corepack pnpm --filter @cip/api match:promptpay --file <path-to-json>`

ตัวอย่าง JSON:

```json
[
  {
    "transactionId": "txn-demo-001",
    "amountCents": 10019,
    "occurredAt": "2026-04-16T09:35:00.000Z",
    "note": "รายการตัวอย่างจาก statement"
  }
]
```

## ถ้าจะตั้งเลข PromptPay จริง
1. ล็อกอิน admin
2. เข้า [http://127.0.0.1:5173/admin](http://127.0.0.1:5173/admin)
3. ไปเมนู `Provider`
4. เลือก `promptpay`
5. วาง JSON ตัวอย่างแล้วแก้เป็นข้อมูลจริงของร้าน

```json
{
  "receiverType": "phone",
  "receiver": "0812345678",
  "merchantName": "CIP SHOP",
  "merchantCity": "BANGKOK",
  "instructions": "สแกน QR นี้จากแอปธนาคารเพื่อชำระเงิน จากนั้นรอระบบหรือแอดมินยืนยันรายการ",
  "accountLabel": "บัญชี PromptPay ของร้าน",
  "webhookSecret": "replace-with-real-secret",
  "webhookNotes": "ส่ง POST มาที่ /api/webhooks/promptpay พร้อม header x-cip-signature และ x-cip-timestamp"
}
```

## คำสั่งหลัก
- `corepack pnpm check`
- `corepack pnpm build`
- `corepack pnpm test`
- `corepack pnpm db:push`
- `corepack pnpm db:seed`
- `corepack pnpm --filter @cip/api webhook:promptpay --payment-intent-id <id>`
- `corepack pnpm --filter @cip/api match:promptpay --file <path-to-json>`

## ถ้า login ไม่ได้หรือข้อมูลหาย
- ใช้ `run-localhost.bat` ใหม่หนึ่งรอบ
- หรือรัน `powershell -ExecutionPolicy Bypass -File .\\scripts\\ensure-local-demo-data.ps1`
- ถ้ายังเพี้ยน ให้รัน `corepack pnpm db:seed`
