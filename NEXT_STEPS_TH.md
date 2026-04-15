# งานถัดไป

1. ทดสอบหน้า [http://127.0.0.1:5173/product/:slug](http://127.0.0.1:5173/product/:slug) จริงบน localhost ให้ครบ flow โดยยืนยันว่าปุ่มซื้อทั้ง Wallet และ PromptPay จะเด้ง modal ขอรหัสผ่านก่อนทุกครั้ง
2. ทดสอบหลังบ้านที่ [http://127.0.0.1:5173/admin](http://127.0.0.1:5173/admin) ในเมนู `สินค้า` ให้ครบทั้งเพิ่มสินค้าใหม่ แก้ไขราคา ราคาเดิม และสถานะเปิดขาย
3. เก็บ UX/UI ต่อในหน้า product และ topup ให้สอดคล้องกับ modal confirmation และปุ่ม action ใหม่
4. ถ้าจะใช้งานเชิงธุรกิจต่อ ให้เริ่มเชื่อม provider จริงตัวแรก เช่น `Wepay` หรือ `24Payseller`
5. ถ้าต้องการเก็บ performance ให้เริ่มแยก code-splitting ของหน้าใหญ่ เช่น admin, account และ topup

