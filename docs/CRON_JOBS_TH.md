# Cron Jobs ที่แนะนำ

ใช้ cPanel Cron Jobs เรียก endpoint ภายในทุก 5-15 นาที โดยแนบ `CRON_SECRET`

## งานหลัก
- `POST /api/internal/cron/process-jobs`
- `POST /api/internal/cron/cleanup-otps`
- `POST /api/internal/cron/provider-sync`

## ตัวอย่าง
```bash
curl -X POST https://your-domain.com/api/internal/cron/process-jobs -H "x-cron-secret: YOUR_SECRET"
```
