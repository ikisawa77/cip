# Handoff

## ทำอะไรไปแล้ว
- ทำ `PromptPay QR` เป็น payment flow ตัวแรกของระบบใน [D:\cip\apps\api\src\lib\promptpay.ts](D:\cip\apps\api\src\lib\promptpay.ts)
- เพิ่ม `paymentIntentPresentation` และ `promptpayConfig` ใน [D:\cip\packages\shared\src\index.ts](D:\cip\packages\shared\src\index.ts)
- เพิ่ม API และ backend flow ใน [D:\cip\apps\api\src\index.ts](D:\cip\apps\api\src\index.ts) และ [D:\cip\apps\api\src\services\store.ts](D:\cip\apps\api\src\services\store.ts)
- หน้า [D:\cip\apps\web\src\pages\TopupPage.tsx](D:\cip\apps\web\src\pages\TopupPage.tsx) และ [D:\cip\apps\web\src\pages\ProductPage.tsx](D:\cip\apps\web\src\pages\ProductPage.tsx) แสดง QR, ยอดโอนจริง, reference, expiry ได้แล้ว
- หลังบ้าน [D:\cip\apps\web\src\pages\AdminPage.tsx](D:\cip\apps\web\src\pages\AdminPage.tsx) จัดการ `payment intents` ได้ และมีส่วน `ตัวจับคู่ธุรกรรม PromptPay`
- เพิ่ม signed webhook `POST /api/webhooks/promptpay`
- เพิ่ม helper script:
  - [D:\cip\apps\api\src\scripts\send-promptpay-webhook.ts](D:\cip\apps\api\src\scripts\send-promptpay-webhook.ts)
  - [D:\cip\apps\api\src\scripts\match-promptpay-transactions.ts](D:\cip\apps\api\src\scripts\match-promptpay-transactions.ts)
  - [D:\cip\apps\api\src\scripts\match-kbiz-statement.ts](D:\cip\apps\api\src\scripts\match-kbiz-statement.ts)
  - [D:\cip\send-promptpay-webhook-local.bat](D:\cip\send-promptpay-webhook-local.bat)
  - [D:\cip\match-promptpay-transactions-local.bat](D:\cip\match-promptpay-transactions-local.bat)
  - [D:\cip\match-kbiz-statement-local.bat](D:\cip\match-kbiz-statement-local.bat)

## ผลทดสอบล่าสุด
- `corepack pnpm check` ผ่าน
- `corepack pnpm build` ผ่าน
- `corepack pnpm test` ผ่าน
- ทดสอบจริงบน localhost แล้ว:
  - `login -> create topup intent -> ได้ QR` ผ่าน
  - `signed webhook -> settle payment` ผ่าน
  - `match:promptpay --file <json>` ผ่าน
  - `payment status = paid` และ `wallet เพิ่ม` หลัง matcher ผ่าน
- รีเซ็ต demo data กลับแล้วด้วย `corepack pnpm db:seed`

## ตอนนี้ระบบอยู่ตรงไหน
- payment flow แรกพร้อมใช้แล้วในระดับ localhost และพร้อม deploy แบบ Nokhosting-friendly
- หลังบ้านตรวจ payment intents ได้ทั้งแบบ manual, signed webhook, และ transaction matcher
- provider ภายนอกอื่น เช่น `wepay`, `24payseller`, `peamsub24hr`, `kbiz`, `truemoney`, `rdcw` ยังเป็น scaffold
- ฝั่ง bridge ของ `K-Biz statement` เริ่มใช้ได้แล้วผ่าน endpoint `POST /api/internal/kbiz/match-statement` และ script `match:kbiz --file <statement>`

## ต้องทำอะไรต่อ
1. ต่อยอด bridge ฝั่ง statement/K-Biz ให้ดึงธุรกรรมจริงอัตโนมัติจาก source ภายนอก แทนการอ่านไฟล์ export ด้วยมือ
2. เลือก provider ภายนอกตัวแรกแล้วเชื่อม adapter จริง
3. เพิ่ม admin operations ลึกขึ้น เช่น refund, manual review, audit viewer
4. เก็บ performance เรื่อง bundle size ของหน้าเว็บ

## ถ้าจะทำต่อจากเครื่องอื่น
- pull ล่าสุดจาก `main`
- รัน `run-localhost.bat`
- อ่าน [D:\cip\docs\LOCAL_SETUP_TH.md](D:\cip\docs\LOCAL_SETUP_TH.md)
- ล็อกอินด้วย
  - Admin: `admin@example.com` / `ChangeMe123!`
  - Demo: `demo@example.com` / `DemoPass123!`

## ข้อควรระวัง
- หลังเปลี่ยน schema ถ้า demo data เพี้ยน ให้รัน `corepack pnpm db:seed`
- bundle ฝั่งเว็บยังมี warning เรื่องขนาด แต่ build ผ่านและใช้งานได้
