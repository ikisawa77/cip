import {
  boolean,
  datetime,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    role: mysqlEnum("role", ["customer", "admin"]).notNull().default("customer"),
    walletBalanceCents: int("wallet_balance_cents").notNull().default(0),
    createdAt: datetime("created_at").notNull(),
    updatedAt: datetime("updated_at").notNull()
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)]
);

export const oauthAccounts = mysqlTable("oauth_accounts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  provider: mysqlEnum("provider", ["line", "google", "discord"]).notNull(),
  providerUserId: varchar("provider_user_id", { length: 191 }).notNull(),
  createdAt: datetime("created_at").notNull()
});

export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  token: varchar("token", { length: 191 }).notNull(),
  expiresAt: datetime("expires_at").notNull(),
  createdAt: datetime("created_at").notNull()
});

export const passwordResetOtps = mysqlTable("password_reset_otps", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  otp: varchar("otp", { length: 6 }).notNull(),
  expiresAt: datetime("expires_at").notNull(),
  consumedAt: datetime("consumed_at"),
  createdAt: datetime("created_at").notNull()
});

export const siteContents = mysqlTable(
  "site_contents",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    contentKey: varchar("content_key", { length: 120 }).notNull(),
    valueJson: text("value_json").notNull(),
    updatedAt: datetime("updated_at").notNull()
  },
  (table) => [uniqueIndex("site_contents_key_unique").on(table.contentKey)]
);

export const categories = mysqlTable("categories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 120 }),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull()
});

export const products = mysqlTable("products", {
  id: varchar("id", { length: 36 }).primaryKey(),
  categoryId: varchar("category_id", { length: 36 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description").notNull(),
  type: mysqlEnum("type", [
    "TOPUP_API",
    "DIGITAL_CODE",
    "DOWNLOAD_LINK",
    "PREMIUM_API",
    "ID_PASS_ORDER",
    "ACCOUNT_STOCK",
    "RANDOM_POOL",
    "WALLET_TOPUP"
  ]).notNull(),
  priceCents: int("price_cents").notNull(),
  compareAtCents: int("compare_at_cents"),
  deliveryNote: text("delivery_note"),
  badge: varchar("badge", { length: 80 }),
  coverImage: text("cover_image"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull()
});

export const productVariants = mysqlTable("product_variants", {
  id: varchar("id", { length: 36 }).primaryKey(),
  productId: varchar("product_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  priceCents: int("price_cents").notNull(),
  metadataJson: text("metadata_json").notNull(),
  createdAt: datetime("created_at").notNull()
});

export const inventoryItems = mysqlTable("inventory_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  productId: varchar("product_id", { length: 36 }).notNull(),
  kind: mysqlEnum("kind", ["code", "download_link", "account", "generic"]).notNull(),
  maskedLabel: varchar("masked_label", { length: 255 }).notNull(),
  encryptedPayload: text("encrypted_payload").notNull(),
  isAllocated: boolean("is_allocated").notNull().default(false),
  createdAt: datetime("created_at").notNull(),
  allocatedAt: datetime("allocated_at")
});

export const randomPools = mysqlTable("random_pools", {
  id: varchar("id", { length: 36 }).primaryKey(),
  productId: varchar("product_id", { length: 36 }).notNull(),
  inventoryItemId: varchar("inventory_item_id", { length: 36 }).notNull(),
  weight: int("weight").notNull().default(1)
});

export const orders = mysqlTable("orders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  status: mysqlEnum("status", [
    "pending_payment",
    "paid",
    "processing",
    "fulfilled",
    "failed",
    "manual_review",
    "refunded"
  ]).notNull(),
  subtotalCents: int("subtotal_cents").notNull(),
  totalCents: int("total_cents").notNull(),
  paymentMethod: mysqlEnum("payment_method", ["wallet", "promptpay_qr"]).notNull(),
  notes: text("notes"),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull()
});

export const orderItems = mysqlTable("order_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderId: varchar("order_id", { length: 36 }).notNull(),
  productId: varchar("product_id", { length: 36 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPriceCents: int("unit_price_cents").notNull(),
  deliveryPayload: text("delivery_payload"),
  createdAt: datetime("created_at").notNull()
});

export const orderInputs = mysqlTable("order_inputs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderId: varchar("order_id", { length: 36 }).notNull(),
  inputJson: text("input_json").notNull(),
  createdAt: datetime("created_at").notNull()
});

export const paymentIntents = mysqlTable("payment_intents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  targetType: mysqlEnum("target_type", ["wallet", "order"]).notNull(),
  targetId: varchar("target_id", { length: 36 }).notNull(),
  provider: mysqlEnum("provider", ["promptpay_qr", "kbiz_match", "truemoney_gift"]).notNull(),
  status: mysqlEnum("status", ["pending", "paid", "expired", "failed"]).notNull(),
  amountCents: int("amount_cents").notNull(),
  uniqueAmountCents: int("unique_amount_cents").notNull(),
  referenceCode: varchar("reference_code", { length: 100 }).notNull(),
  expiresAt: datetime("expires_at").notNull(),
  paidAt: datetime("paid_at"),
  metadataJson: text("metadata_json").notNull(),
  createdAt: datetime("created_at").notNull()
});

export const walletTransactions = mysqlTable("wallet_transactions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  type: mysqlEnum("type", [
    "pending_topup",
    "topup_completed",
    "purchase",
    "refund",
    "adjustment"
  ]).notNull(),
  amountCents: int("amount_cents").notNull(),
  referenceId: varchar("reference_id", { length: 36 }),
  detail: text("detail").notNull(),
  createdAt: datetime("created_at").notNull()
});

export const providerConfigs = mysqlTable("provider_configs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  providerKey: mysqlEnum("provider_key", [
    "promptpay",
    "wepay",
    "24payseller",
    "peamsub24hr",
    "kbiz",
    "truemoney",
    "rdcw"
  ]).notNull(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  configJson: text("config_json").notNull(),
  updatedAt: datetime("updated_at").notNull()
});

export const providerOrderLinks = mysqlTable(
  "provider_order_links",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 }).notNull(),
    providerKey: mysqlEnum("provider_key", [
      "promptpay",
      "wepay",
      "24payseller",
      "peamsub24hr",
      "kbiz",
      "truemoney",
      "rdcw"
    ]).notNull(),
    providerOrderId: varchar("provider_order_id", { length: 191 }),
    latestStatus: varchar("latest_status", { length: 80 }).notNull(),
    requestJson: text("request_json"),
    latestPayloadJson: text("latest_payload_json"),
    createdAt: datetime("created_at").notNull(),
    updatedAt: datetime("updated_at").notNull()
  },
  (table) => [
    uniqueIndex("provider_order_links_provider_order_unique").on(table.providerKey, table.providerOrderId)
  ]
);

export const webhookEvents = mysqlTable("webhook_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  providerKey: varchar("provider_key", { length: 60 }).notNull(),
  eventType: varchar("event_type", { length: 120 }).notNull(),
  payloadJson: text("payload_json").notNull(),
  processed: boolean("processed").notNull().default(false),
  createdAt: datetime("created_at").notNull()
});

export const webhookReplayAttempts = mysqlTable("webhook_replay_attempts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  webhookEventId: varchar("webhook_event_id", { length: 36 }).notNull(),
  actorUserId: varchar("actor_user_id", { length: 36 }),
  ok: boolean("ok").notNull().default(false),
  message: text("message").notNull(),
  createdAt: datetime("created_at").notNull()
});

export const providerSyncFiles = mysqlTable(
  "provider_sync_files",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    providerKey: mysqlEnum("provider_key", [
      "promptpay",
      "wepay",
      "24payseller",
      "peamsub24hr",
      "kbiz",
      "truemoney",
      "rdcw"
    ]).notNull(),
    filePath: varchar("file_path", { length: 255 }).notNull(),
    fileSignature: varchar("file_signature", { length: 191 }).notNull(),
    importedAt: datetime("imported_at").notNull(),
    sourceCreatedAt: datetime("source_created_at"),
    payloadJson: text("payload_json").notNull()
  },
  (table) => [uniqueIndex("provider_sync_files_signature_unique").on(table.providerKey, table.fileSignature)]
);

export const jobs = mysqlTable("jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  kind: mysqlEnum("kind", ["provider_purchase", "payment_match", "provider_sync", "cleanup"]).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).notNull(),
  payloadJson: text("payload_json").notNull(),
  attempts: int("attempts").notNull().default(0),
  availableAt: datetime("available_at").notNull(),
  lastError: text("last_error"),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull()
});

export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  actorUserId: varchar("actor_user_id", { length: 36 }),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: varchar("entity_id", { length: 36 }).notNull(),
  action: varchar("action", { length: 120 }).notNull(),
  detail: text("detail").notNull(),
  createdAt: datetime("created_at").notNull()
});
