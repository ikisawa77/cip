# ความคืบหน้า

## รอบล่าสุด
- เพิ่ม signed webhook settlement ของ `promptpay`
- เพิ่ม helper `webhook:promptpay` สำหรับยิง signed webhook ตาม `payment-intent-id`
- เพิ่ม matcher สำหรับ statement JSON:
  - endpoint `POST /api/admin/payment-intents/match-transactions`
  - endpoint `POST /api/internal/promptpay/match-transactions`
  - CLI `corepack pnpm --filter @cip/api match:promptpay --file <path-to-json>`
- เพิ่ม UI ใน [D:\cip\apps\web\src\pages\AdminPage.tsx](D:\cip\apps\web\src\pages\AdminPage.tsx) ให้แอดมินวาง transaction JSON แล้วกดจับคู่ได้จากหน้าเว็บ
- เพิ่ม batch helper [D:\cip\match-promptpay-transactions-local.bat](D:\cip\match-promptpay-transactions-local.bat)
- อัปเดตเอกสาร localhost และ cron ให้รองรับ matcher

## สถานะการทดสอบ
- `corepack pnpm check` ผ่าน
- `corepack pnpm build` ผ่าน
- `corepack pnpm test` ผ่าน
- ทดสอบจริง:
  - สร้าง topup intent ได้
  - ยิง signed webhook ได้
  - matcher จากไฟล์ JSON จับคู่สำเร็จ
  - Wallet เพิ่มและ payment intent เปลี่ยนเป็น `paid`

## หมายเหตุ
- หลังทดสอบ matcher ได้รีเซ็ตฐานกลับด้วย `corepack pnpm db:seed` แล้ว
- provider ตัวอื่นยังเป็น scaffold อยู่
