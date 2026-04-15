# ความคืบหน้า

## รอบล่าสุด
- เพิ่มระบบ content block สำหรับหน้าแรกและ footer ใน [D:\cip\packages\shared\src\index.ts](D:\cip\packages\shared\src\index.ts)
- ขยาย service และ API ใน [D:\cip\apps\api\src\services\store.ts](D:\cip\apps\api\src\services\store.ts) และ [D:\cip\apps\api\src\index.ts](D:\cip\apps\api\src\index.ts) ให้รองรับ `homepage` และ `footer` content ผ่าน `site_contents`
- เพิ่มการ seed ค่าเริ่มต้นของหน้าแรกและ footer ใน [D:\cip\apps\api\src\db\seed.ts](D:\cip\apps\api\src\db\seed.ts)
- ปรับ [D:\cip\apps\web\src\pages\HomePage.tsx](D:\cip\apps\web\src\pages\HomePage.tsx) ให้ดึงข้อความหน้าแรกจากระบบจริง แทนการ hardcode
- ยก [D:\cip\apps\web\src\components\Layout.tsx](D:\cip\apps\web\src\components\Layout.tsx) ใหม่ให้มี footer แบบพรีเมียม พร้อมลิงก์, status pills และกลุ่มข้อความที่แก้จากหลังบ้านได้
- เพิ่มเมนูใน [D:\cip\apps\web\src\pages\AdminPage.tsx](D:\cip\apps\web\src\pages\AdminPage.tsx) สำหรับแก้ `ข้อความหน้าแรก` และ `ข้อความ footer` ได้ครบจาก `/admin`
- เพิ่มสไตล์ footer ใหม่ใน [D:\cip\apps\web\src\styles.css](D:\cip\apps\web\src\styles.css)

## สถานะการทดสอบ
- `corepack pnpm --filter @cip/shared check` ผ่าน
- `corepack pnpm --filter @cip/api check` ผ่าน
- `corepack pnpm --filter @cip/api build` ผ่าน
- `corepack pnpm --filter @cip/web check` ผ่าน
- `corepack pnpm --filter @cip/web build` ผ่าน

## หมายเหตุ
- ผมสร้างตาราง `site_contents` ในฐาน local ให้แล้ว เพื่อให้ทดสอบ content หน้าแรก/ footer บน localhost ได้ทันที
- `drizzle-kit push` ยังติดกับ schema เดิมของฐาน local บางส่วน จึงใช้วิธีสร้างตารางนี้ให้ตรง ๆ แทนในรอบนี้
- ฝั่งเว็บยังมี warning เรื่อง bundle size หลัง build แต่ระบบยัง build ผ่านและใช้งานได้
