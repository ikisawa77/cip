# Handoff

## ทำอะไรไปแล้ว
- เพิ่ม flow ยืนยันรหัสผ่านก่อนสั่งซื้อในหน้า [D:\cip\apps\web\src\pages\ProductPage.tsx](D:\cip\apps\web\src\pages\ProductPage.tsx)
- เพิ่ม endpoint ตรวจรหัสผ่าน `POST /api/auth/confirm-password` ใน [D:\cip\apps\api\src\index.ts](D:\cip\apps\api\src\index.ts)
- เพิ่ม schema กลางสำหรับ confirm password ใน [D:\cip\packages\shared\src\index.ts](D:\cip\packages\shared\src\index.ts)
- เพิ่มเมนู `สินค้า` ในหลังบ้านที่ [D:\cip\apps\web\src\pages\AdminPage.tsx](D:\cip\apps\web\src\pages\AdminPage.tsx) เพื่อจัดการสินค้าและราคาได้จริง
- ขยาย API หลังบ้านสำหรับสร้างและแก้ไขสินค้าให้รองรับข้อมูลที่หน้าร้านใช้ครบ
- ปรับ `Back to top` ใน [D:\cip\apps\web\src\components\Layout.tsx](D:\cip\apps\web\src\components\Layout.tsx) ให้มี progress และข้อความที่เป็นประโยชน์มากขึ้น

## ผลทดสอบล่าสุด
- `corepack pnpm --filter @cip/shared check` ผ่าน
- `corepack pnpm --filter @cip/api check` ผ่าน
- `corepack pnpm --filter @cip/api build` ผ่าน
- `corepack pnpm --filter @cip/web check` ผ่าน
- `corepack pnpm --filter @cip/web build` ผ่าน

## ตอนนี้ระบบอยู่ตรงไหน
- หน้า product มี modal ยืนยันก่อนซื้อแล้ว โดยผู้ใช้ต้องกรอกรหัสผ่านก่อนสร้างออเดอร์
- หน้า admin มีส่วนจัดการสินค้าและราคาชัดเจนขึ้น ใช้เพิ่มสินค้าใหม่หรือแก้ไขราคาสินค้าเดิมได้
- Layout มีปุ่ม `Back to top` ที่ช่วยบอก progress การเลื่อนหน้าและบริบทของหน้าปัจจุบัน

## ต้องทำอะไรต่อ
1. ทดสอบการซื้อสินค้าจาก browser จริงทั้ง Wallet และ PromptPay พร้อมตรวจ modal confirm
2. ทดสอบเมนู `สินค้า` ในหลังบ้านให้ครบ flow เพิ่ม/แก้ราคา/เปิดปิดขาย
3. เริ่มเชื่อม provider จริงตัวแรก

## ถ้าจะทำต่อจากเครื่องอื่น
- pull ล่าสุดจาก `main`
- รัน `run-localhost.bat`
- อ่าน [D:\cip\PROGRESS_TH.md](D:\cip\PROGRESS_TH.md) และ [D:\cip\NEXT_STEPS_TH.md](D:\cip\NEXT_STEPS_TH.md) ก่อนเริ่มรอบใหม่
- ถ้าจะทดสอบหลังบ้าน ให้ล็อกอินด้วยบัญชี admin แล้วเข้า [http://127.0.0.1:5173/admin](http://127.0.0.1:5173/admin)

## ข้อควรระวัง
- งานรอบนี้ยังไม่เชื่อม provider จริง จึงเป็น flow จำลองในระดับระบบภายในก่อน
- bundle ฝั่งเว็บยังมี warning เรื่องขนาด แต่ยัง build ผ่าน
