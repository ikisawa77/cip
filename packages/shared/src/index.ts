import { z } from "zod";

export const productTypes = [
  "TOPUP_API",
  "DIGITAL_CODE",
  "DOWNLOAD_LINK",
  "PREMIUM_API",
  "ID_PASS_ORDER",
  "ACCOUNT_STOCK",
  "RANDOM_POOL",
  "WALLET_TOPUP",
] as const;

export const orderStatuses = [
  "pending_payment",
  "paid",
  "processing",
  "fulfilled",
  "failed",
  "manual_review",
  "refunded",
] as const;

export const providerKeys = [
  "promptpay",
  "wepay",
  "24payseller",
  "peamsub24hr",
  "kbiz",
  "truemoney",
  "rdcw",
] as const;

export const productTypeSchema = z.enum(productTypes);
export const orderStatusSchema = z.enum(orderStatuses);
export const providerKeySchema = z.enum(providerKeys);

export const categorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().default(null),
  icon: z.string().nullable().default(null),
});

export const productSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  type: productTypeSchema,
  priceCents: z.number().int().nonnegative(),
  compareAtCents: z.number().int().nonnegative().nullable().default(null),
  deliveryNote: z.string().nullable().default(null),
  badge: z.string().nullable().default(null),
  coverImage: z.string().nullable().default(null),
  isActive: z.boolean(),
});

export const inventoryItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  kind: z.enum(["code", "download_link", "account", "generic"]),
  maskedLabel: z.string(),
  encryptedPayload: z.string(),
  isAllocated: z.boolean(),
});

export const authRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(60),
});

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const forgotPasswordVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8),
});

export const authChangePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export const authConfirmPasswordSchema = z.object({
  password: z.string().min(8),
});

export const homepageSupportCardSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});

export const homepageContentSchema = z.object({
  heroBadge: z.string().min(1),
  heroTitle: z.string().min(1),
  heroDescription: z.string().min(1),
  primaryCtaLabel: z.string().min(1),
  secondaryCtaLabel: z.string().min(1),
  trustLabels: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
  quickSearchLabel: z.string().min(1),
  quickSearchPlaceholder: z.string().min(1),
  quickSearchEmptyText: z.string().min(1),
  supportSectionLabel: z.string().min(1),
  supportCards: z.tuple([homepageSupportCardSchema, homepageSupportCardSchema, homepageSupportCardSchema]),
  categorySectionLabel: z.string().min(1),
  categorySectionTitle: z.string().min(1),
  categorySectionDescription: z.string().min(1),
  allCategoriesLabel: z.string().min(1),
  filteredCategoryPrefix: z.string().min(1),
  categoryPanelLabel: z.string().min(1),
  categoryFallbackDescription: z.string().min(1),
  categoryBrowseLabel: z.string().min(1),
  categoryTopupLabel: z.string().min(1),
  categoryEmptyText: z.string().min(1),
});

export const footerLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

export const footerContentSchema = z.object({
  badge: z.string().min(1),
  headline: z.string().min(1),
  description: z.string().min(1),
  statusPills: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
  quickLinksTitle: z.string().min(1),
  quickLinks: z.tuple([footerLinkSchema, footerLinkSchema, footerLinkSchema]),
  supportLinksTitle: z.string().min(1),
  supportLinks: z.tuple([footerLinkSchema, footerLinkSchema, footerLinkSchema]),
  contactTitle: z.string().min(1),
  contactLine: z.string().min(1),
  contactSubline: z.string().min(1),
  copyright: z.string().min(1),
});

export const promptpayReceiverTypeSchema = z.enum(["phone", "nationalId", "taxId"]);

export const promptpayConfigSchema = z.object({
  receiverType: promptpayReceiverTypeSchema,
  receiver: z.string().min(6),
  merchantName: z.string().min(2).max(25),
  merchantCity: z.string().min(2).max(15).default("BANGKOK"),
  instructions: z.string().min(2).max(240).default("สแกน QR นี้จากแอปธนาคารเพื่อชำระเงิน"),
  accountLabel: z.string().min(2).max(120).default("บัญชี PromptPay ของร้าน"),
  webhookSecret: z.string().min(8).max(255).default("promptpay-dev-secret"),
  webhookNotes: z
    .string()
    .min(2)
    .max(240)
    .default("ส่ง POST มาที่ /api/webhooks/promptpay พร้อม header x-cip-signature และ x-cip-timestamp")
});

export const paymentIntentPresentationSchema = z.object({
  id: z.string(),
  provider: z.enum(["promptpay_qr", "kbiz_match", "truemoney_gift"]),
  status: z.enum(["pending", "paid", "expired", "failed"]),
  amountCents: z.number().int().nonnegative(),
  uniqueAmountCents: z.number().int().nonnegative(),
  referenceCode: z.string(),
  expiresAt: z.string(),
  paidAt: z.string().nullable().default(null),
  promptpay: z
    .object({
      isConfigured: z.boolean(),
      merchantName: z.string(),
      merchantCity: z.string(),
      accountLabel: z.string(),
      instructions: z.string(),
      receiverType: promptpayReceiverTypeSchema,
      receiverHint: z.string(),
      qrPayload: z.string().nullable(),
      qrDataUrl: z.string().nullable()
    })
    .nullable()
    .default(null)
});

export const homepageContentDefaults = {
  heroBadge: "หน้าร้านแยกหมวดหมู่ชัด และมีหน้าเติมเงินพร้อมใช้",
  heroTitle: "เลือกหมวดสินค้าได้เร็ว เติมเงินได้สะดวก และพร้อมซื้อภายในไม่กี่คลิก",
  heroDescription:
    "โครงหน้าร้านรอบนี้ถูกจัดใหม่ให้ลูกค้าเห็นหมวดชัดก่อน เหมาะกับร้านเติมเกม ขายโค้ด และลิงก์ดาวน์โหลดที่ต้องการให้ลูกค้าหาสินค้าเจอไวขึ้นและเติม Wallet ได้จากหน้าเฉพาะ",
  primaryCtaLabel: "เลือกหมวดสินค้า",
  secondaryCtaLabel: "ไปหน้าเติมเงิน",
  trustLabels: ["Webhook + job queue", "Wallet / PromptPay / Top-up", "พร้อมทดสอบ localhost"],
  quickSearchLabel: "Quick Search",
  quickSearchPlaceholder: "ค้นหาสินค้า หมวด หรือคำอธิบาย",
  quickSearchEmptyText: "ไม่พบสินค้าที่ตรงกับตัวกรองในตอนนี้",
  supportSectionLabel: "Support",
  supportCards: [
    {
      title: "เมนูหมวดหมู่ช่วยให้เลือกซื้อเร็วขึ้น",
      body: "แยกสินค้าเป็นหมวดชัดเจนตั้งแต่หน้าแรก ลูกค้าสแกนเจอหมวดที่ต้องการก่อน แล้วค่อยลงลึกไปที่สินค้ารายชิ้นได้ทันที",
    },
    {
      title: "เติมเงินแยกหน้าเพื่อใช้งานง่ายขึ้น",
      body: "แยก flow เติมเงินออกจากหน้า account ให้ใช้งานสะดวกขึ้น ทั้งลูกค้าใหม่และลูกค้าประจำเข้าถึง PromptPay, TrueMoney และ K-Biz match ได้เร็ว",
    },
    {
      title: "โครงร้านพร้อมต่อยอดงานขายจริง",
      body: "ยังคงมี inventory, provider config, queue jobs และเอกสาร handoff ภาษาไทยครบสำหรับย้ายเครื่องหรือพัฒนาต่อ",
    },
  ],
  categorySectionLabel: "Store Categories",
  categorySectionTitle: "เมนูหมวดหมู่ฝั่งหน้าร้าน",
  categorySectionDescription:
    "เลือกหมวดก่อนแล้วค่อยดูสินค้าในหมวดนั้นได้ทันที เหมาะกับร้านที่ขายหลายประเภททั้งเติมเกม โค้ด และสินค้า digital พร้อมส่ง",
  allCategoriesLabel: "ทุกหมวด",
  filteredCategoryPrefix: "กำลังกรองตามหมวด",
  categoryPanelLabel: "Category",
  categoryFallbackDescription: "หมวดนี้พร้อมต่อยอด flow สินค้าและ checkout ได้ทันที",
  categoryBrowseLabel: "เปิดหน้าหมวดนี้",
  categoryTopupLabel: "ต้องการเติม Wallet ก่อนซื้อ",
  categoryEmptyText: "ไม่พบสินค้าที่ตรงกับคำค้นในหมวดนี้",
} satisfies z.infer<typeof homepageContentSchema>;

export const footerContentDefaults = {
  badge: "Footer Experience",
  headline: "ปิดท้ายแบบมีน้ำหนัก ให้ร้านดูพร้อมขายจริงและพาลูกค้าไปต่อได้ง่าย",
  description:
    "ออกแบบ footer ให้เป็นส่วนสรุปภาพลักษณ์ร้าน มีลิงก์สำคัญ จุดขาย และช่องทางติดต่อในจังหวะที่ดูพรีเมียมกว่า footer แบบข้อความธรรมดา",
  statusPills: ["พร้อมขาย Digital Goods", "รองรับ Wallet และ PromptPay", "แอดมินแก้ข้อความได้จากหลังบ้าน"],
  quickLinksTitle: "ทางลัดหน้าร้าน",
  quickLinks: [
    { label: "หน้าหลัก", href: "/" },
    { label: "หมวดหมู่สินค้า", href: "/#store-categories" },
    { label: "เติมเงิน Wallet", href: "/topup" },
  ],
  supportLinksTitle: "หน้าที่ลูกค้าใช้บ่อย",
  supportLinks: [
    { label: "บัญชีของฉัน", href: "/account" },
    { label: "หลังบ้าน", href: "/admin" },
    { label: "ดูสินค้าทั้งหมด", href: "/" },
  ],
  contactTitle: "ติดต่อและดูแลออเดอร์",
  contactLine: "เปิดรับออเดอร์ทุกวัน พร้อมดูแลงานดิจิทัล โค้ด และบริการเติมเกม",
  contactSubline: "แก้ไขข้อความ footer ชุดนี้ได้ทั้งหมดจาก /admin โดยไม่ต้องกลับมาแก้โค้ด",
  copyright: "CIP Game Shop · Prompt UI Commerce Experience",
} satisfies z.infer<typeof footerContentSchema>;

export const promptpayConfigDefaults = {
  receiverType: "phone",
  receiver: "0000000000",
  merchantName: "CIP SHOP",
  merchantCity: "BANGKOK",
  instructions: "สแกน QR นี้จากแอปธนาคารเพื่อชำระเงิน จากนั้นรอระบบหรือแอดมินยืนยันรายการ",
  accountLabel: "บัญชี PromptPay ของร้าน",
  webhookSecret: "promptpay-dev-secret",
  webhookNotes: "ส่ง POST มาที่ /api/webhooks/promptpay พร้อม header x-cip-signature และ x-cip-timestamp"
} satisfies z.infer<typeof promptpayConfigSchema>;

export const walletTopupSchema = z.object({
  amountBaht: z.number().positive(),
  method: z.enum(["promptpay_qr", "truemoney_gift", "kbiz_match"]),
});

export const createOrderSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(10).default(1),
  paymentMethod: z.enum(["wallet", "promptpay_qr"]).default("wallet"),
  formInput: z.record(z.string(), z.string()).default({}),
});

export type ProductType = z.infer<typeof productTypeSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type ProviderKey = z.infer<typeof providerKeySchema>;
export type Category = z.infer<typeof categorySchema>;
export type Product = z.infer<typeof productSchema>;
export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type AuthRegisterInput = z.infer<typeof authRegisterSchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
export type ForgotPasswordRequestInput = z.infer<typeof forgotPasswordRequestSchema>;
export type ForgotPasswordVerifyInput = z.infer<typeof forgotPasswordVerifySchema>;
export type AuthChangePasswordInput = z.infer<typeof authChangePasswordSchema>;
export type AuthConfirmPasswordInput = z.infer<typeof authConfirmPasswordSchema>;
export type HomepageSupportCard = z.infer<typeof homepageSupportCardSchema>;
export type HomepageContent = z.infer<typeof homepageContentSchema>;
export type FooterLink = z.infer<typeof footerLinkSchema>;
export type FooterContent = z.infer<typeof footerContentSchema>;
export type PromptpayReceiverType = z.infer<typeof promptpayReceiverTypeSchema>;
export type PromptpayConfig = z.infer<typeof promptpayConfigSchema>;
export type PaymentIntentPresentation = z.infer<typeof paymentIntentPresentationSchema>;
export type WalletTopupInput = z.infer<typeof walletTopupSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
