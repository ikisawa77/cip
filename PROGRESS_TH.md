# ความคืบหน้า

## รอบล่าสุด
- เพิ่มระบบจัดการหมวดหมู่สินค้าในหลังบ้านแบบ CRUD ครบ: เพิ่ม แก้ไข ลบ พร้อมกันการลบหมวดที่ยังมีสินค้าอยู่
- เพิ่มระบบจัดการคลังสินค้าแบบรายชิ้นในหลังบ้านผ่าน `/api/admin/inventory/items`
- รองรับการเพิ่ม แก้ไข และลบรายการประเภท `code`, `download_link`, `account`, `generic`
- ปรับหน้า [AdminPage](D:\cip\apps\web\src\pages\AdminPage.tsx) ให้มีเมนูภายในหน้า แยกส่วนภาพรวม หมวดหมู่ คลังโค้ด Provider ออเดอร์ และคิวงานชัดเจน
- ปรับฟอร์มนำเข้าคลังให้เลือกสินค้าจาก dropdown ได้ ไม่ต้องกรอก `productId` เอง
- คงระบบ localhost, Prompt font, clean UI, provider config, queue jobs และ flow เดิมทั้งหมดไว้

## สถานะการทดสอบ
- `corepack pnpm --filter @cip/api check` ผ่าน
- `corepack pnpm --filter @cip/api build` ผ่าน
- `corepack pnpm --filter @cip/web check` ผ่าน
- `corepack pnpm --filter @cip/web build` ผ่าน
- Local MariaDB / API / Web workflow ยังคงใช้ชุดสคริปต์เดิมได้
