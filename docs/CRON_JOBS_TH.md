# Cron Jobs ที่แนะนำ

ใช้ `cPanel Cron Jobs` หรือ service ภายนอกเรียก endpoint ภายในพร้อม header `x-cron-secret`

## งานหลัก
- `POST /api/internal/cron/process-jobs`
- `POST /api/internal/cron/cleanup-otps`
- `POST /api/internal/cron/provider-sync`
- `POST /api/internal/cron/cleanup-payment-intents`
- `POST /api/internal/promptpay/match-transactions`

## PromptPay matcher
- endpoint นี้ใช้รับ statement JSON หรือ transaction batch จาก bridge/K-Biz matcher
- body ต้องอยู่ในรูปแบบ `{ "transactions": [...] }`
- แต่ละรายการรองรับฟิลด์ `transactionId`, `amountCents`, `occurredAt`, `referenceCode`, `note`
- ถ้าอยู่บนเครื่องเดียวกัน ใช้คำสั่ง `corepack pnpm --filter @cip/api match:promptpay --file <path-to-json>` ได้ทันที

## ตัวอย่าง
```bash
curl -X POST https://your-domain.com/api/internal/cron/process-jobs -H "x-cron-secret: YOUR_SECRET"
```

```bash
curl -X POST https://your-domain.com/api/internal/promptpay/match-transactions \
  -H "content-type: application/json" \
  -H "x-cron-secret: YOUR_SECRET" \
  -d '{"transactions":[{"transactionId":"txn-001","amountCents":10019,"occurredAt":"2026-04-16T09:35:00.000Z"}]}'
```
