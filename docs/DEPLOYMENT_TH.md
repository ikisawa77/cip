# Production Deployment Checklist

เอกสารนี้ใช้เป็นมาตรฐานแยก `dev`, `staging`, `prod` เพื่อให้ย้ายเครื่องและ deploy ได้ซ้ำโดยไม่ต้องแก้ฐานข้อมูลหรือ secret ด้วยมือ

## Environments

- `dev`: ใช้ `.env.local`, XAMPP/MariaDB local, seed demo data ได้
- `staging`: ใช้ `.env.staging` บนเครื่องหรือ server staging, ใช้ข้อมูลทดสอบที่ใกล้ production, ห้ามใช้ secret จริงปะปนกับ dev
- `prod`: ใช้ secret จาก environment ของ host เท่านั้น ไม่ commit `.env.prod`

## Database Flow

1. สร้าง `.env.local` หรือ env ของเครื่องปลายทางให้ครบ `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
2. รัน `pnpm db:prepare` เพื่อสร้าง DB ถ้ายังไม่มี, sync schema ด้วย Drizzle, และ seed demo data
3. ถ้าเป็น staging/prod ที่ไม่ต้อง seed ให้รัน `pnpm db:prepare:no-seed`
4. ก่อน deploy ทุกครั้งให้รัน `pnpm check`, `pnpm test`, `pnpm build`

## Provider Secrets

ตั้งค่า provider config ในหลังบ้านด้วยรูปแบบอ้างอิง env แทนการใส่ secret จริง เช่น:

```json
{
  "mode": "webhook",
  "endpoint": "https://provider.example.com/api/orders",
  "apiKey": "env:WEPAY_API_KEY",
  "callbackSecret": "env:WEPAY_CALLBACK_SECRET"
}
```

ใน `NODE_ENV=production` ระบบจะบล็อก secret แบบ raw string สำหรับ key สำคัญ เช่น `apiKey`, `callbackSecret`, `webhookSecret`, `token`, `password`, `clientSecret`

## Logging / Backup / Monitoring

- ตั้ง `LOG_LEVEL=info` ใน production และลดเป็น `debug` เฉพาะตอนตรวจ incident
- ตั้ง `BACKUP_DIR` หรือระบบ backup ของ managed database ให้เก็บอย่างน้อยรายวัน
- ตั้ง `MONITORING_WEBHOOK_URL` สำหรับต่อแจ้งเตือนรอบถัดไป เช่น Discord/Slack/LINE Notify bridge
- ตรวจ `/api/health` จาก uptime monitor ทุก 1-5 นาที

## Local Smoke

หลังเปิดด้วย `run-localhost.bat` ให้เช็ก:

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:3001/api/health`
- Admin: login ด้วยค่า `ADMIN_EMAIL` / `ADMIN_PASSWORD` จาก `.env.local`
- E2E: `pnpm test:e2e`
