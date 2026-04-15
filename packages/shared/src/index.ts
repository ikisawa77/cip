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
export type WalletTopupInput = z.infer<typeof walletTopupSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
