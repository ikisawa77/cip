import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  footerContentDefaults,
  footerContentSchema,
  homepageContentDefaults,
  homepageContentSchema,
  paymentIntentPresentationSchema,
  promptpayConfigDefaults,
  promptpayConfigSchema,
  type CreateOrderInput,
  type FooterContent,
  type HomepageContent,
  type OrderStatus,
  type PaymentIntentPresentation,
  type ProductType,
  type WalletTopupInput
} from "@cip/shared";

import { env } from "../config/env";
import { db } from "../db";
import {
  auditLogs,
  categories,
  inventoryItems,
  jobs,
  orderInputs,
  orderItems,
  orders,
  passwordResetOtps,
  paymentIntents,
  providerOrderLinks,
  products,
  providerConfigs,
  randomPools,
  sessions,
  siteContents,
  users,
  walletTransactions,
  webhookEvents,
  providerSyncFiles
} from "../db/schema";
import { createId } from "../lib/ids";
import { runKbizStatementImport } from "../lib/kbiz-import";
import { createPromptpayPayload, createPromptpayQrDataUrl, maskPromptpayReceiver } from "../lib/promptpay";
import { decryptPayload, encryptPayload } from "../lib/security";
import { minutesFromNow, now } from "../lib/time";
import {
  getProviderAdapter,
  getProviderAdapterByKey,
  getProviderKeyForProductType,
  providerKeys,
  type ProviderKey
} from "../providers/registry";

export async function getCatalog() {
  const categoryRows = await db.select().from(categories).orderBy(asc(categories.name));
  const productRows = await db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.name));

  return categoryRows.map((category) => ({
    ...category,
    products: productRows.filter((product) => product.categoryId === category.id)
  }));
}

export async function getProductBySlug(slug: string) {
  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) {
    return null;
  }

  const [stockRow] = await db
    .select({ available: sql<number>`count(*)` })
    .from(inventoryItems)
    .where(and(eq(inventoryItems.productId, product.id), eq(inventoryItems.isAllocated, false)));

  return {
    ...product,
    availableStock: Number(stockRow?.available ?? 0)
  };
}

type AdminPaginationInput = {
  page?: number;
  pageSize?: number;
};

export type AdminPaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type KbizMonitoringSummary = {
  latestImportAt: string | null;
  processedFiles: number;
  recentProcessedFiles: Array<{
    id: string;
    filePath: string;
    fileSignature: string;
    importedAt: string;
    sourceCreatedAt: string | null;
  }>;
  recentEvents: Array<{
    id: string;
    createdAt: string;
    processed: boolean;
    payloadJson: string;
  }>;
};

function clampAdminPage(input?: number) {
  if (!Number.isFinite(input) || !input) {
    return 1;
  }

  return Math.max(1, Math.round(input));
}

function clampAdminPageSize(input?: number, fallback = 8) {
  if (!Number.isFinite(input) || !input) {
    return fallback;
  }

  return Math.max(1, Math.min(100, Math.round(input)));
}

function paginateAdminItems<T>(
  items: T[],
  pagination?: AdminPaginationInput,
  fallbackPageSize = 8
): AdminPaginatedResult<T> {
  const total = items.length;
  const pageSize = clampAdminPageSize(pagination?.pageSize, fallbackPageSize);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(clampAdminPage(pagination?.page), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages
  };
}

async function getProviderConfigRow(providerKey: ProviderKey) {
  const [row] = await db.select().from(providerConfigs).where(eq(providerConfigs.providerKey, providerKey)).limit(1);
  return row ?? null;
}

async function getPromptpayConfigRow() {
  return getProviderConfigRow("promptpay");
}

async function getNormalizedPromptpayConfig() {
  const row = await getPromptpayConfigRow();
  if (!row || !row.isEnabled) {
    return {
      isConfigured: false,
      config: promptpayConfigDefaults
    };
  }

  try {
    const parsed = JSON.parse(row.configJson) as unknown;
    const result = promptpayConfigSchema.safeParse({
      ...promptpayConfigDefaults,
      ...(typeof parsed === "object" && parsed ? parsed : {})
    });

    if (!result.success) {
      return {
        isConfigured: false,
        config: promptpayConfigDefaults
      };
    }

    return {
      isConfigured: true,
      config: result.data
    };
  } catch {
    return {
      isConfigured: false,
      config: promptpayConfigDefaults
    };
  }
}

export async function getPromptpayConfigForWebhook() {
  const promptpay = await getNormalizedPromptpayConfig();
  return promptpay;
}

export async function getProviderConfigSnapshot(providerKey: ProviderKey) {
  const row = await getProviderConfigRow(providerKey);

  if (!row) {
    return {
      isEnabled: false,
      config: {} as Record<string, unknown>
    };
  }

  try {
    const parsed = JSON.parse(row.configJson) as unknown;
    return {
      isEnabled: row.isEnabled,
      config: typeof parsed === "object" && parsed && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
    };
  } catch {
    return {
      isEnabled: row.isEnabled,
      config: {} as Record<string, unknown>
    };
  }
}

async function buildPaymentIntentPresentation(intent: typeof paymentIntents.$inferSelect): Promise<PaymentIntentPresentation> {
  if (intent.provider !== "promptpay_qr") {
    return paymentIntentPresentationSchema.parse({
      id: intent.id,
      provider: intent.provider,
      status: intent.status,
      amountCents: intent.amountCents,
      uniqueAmountCents: intent.uniqueAmountCents,
      referenceCode: intent.referenceCode,
      expiresAt: intent.expiresAt.toISOString(),
      paidAt: intent.paidAt?.toISOString() ?? null,
      promptpay: null
    });
  }

  const promptpay = await getNormalizedPromptpayConfig();
  const promptpayPayload = createPromptpayPayload(promptpay.config, intent.uniqueAmountCents, intent.referenceCode);
  const qrDataUrl = promptpayPayload ? await createPromptpayQrDataUrl(promptpayPayload) : null;

  return paymentIntentPresentationSchema.parse({
    id: intent.id,
    provider: intent.provider,
    status: intent.status,
    amountCents: intent.amountCents,
    uniqueAmountCents: intent.uniqueAmountCents,
    referenceCode: intent.referenceCode,
    expiresAt: intent.expiresAt.toISOString(),
    paidAt: intent.paidAt?.toISOString() ?? null,
    promptpay: {
      isConfigured: promptpay.isConfigured,
      merchantName: promptpay.config.merchantName,
      merchantCity: promptpay.config.merchantCity,
      accountLabel: promptpay.config.accountLabel,
      instructions: promptpay.isConfigured
        ? promptpay.config.instructions
        : "กำลังใช้ QR ตัวอย่างสำหรับ localhost กรุณาไปที่หลังบ้าน > Provider > promptpay แล้วใส่เลขรับเงินจริงก่อนเปิดขายจริง",
      receiverType: promptpay.config.receiverType,
      receiverHint: maskPromptpayReceiver(promptpay.config.receiverType, promptpay.config.receiver),
      qrPayload: promptpayPayload,
      qrDataUrl
    }
  });
}

async function logAudit(entityType: string, entityId: string, action: string, detail: string, actorUserId?: string) {
  await db.insert(auditLogs).values({
    id: createId(),
    actorUserId: actorUserId ?? null,
    entityType,
    entityId,
    action,
    detail,
    createdAt: now()
  });
}

async function allocateInventory(productId: string, type: ProductType) {
  let candidates = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.productId, productId), eq(inventoryItems.isAllocated, false)));

  if (type === "RANDOM_POOL") {
    const poolRows = await db.select().from(randomPools).where(eq(randomPools.productId, productId));
    const ids = poolRows.map((item) => item.inventoryItemId);
    if (ids.length > 0) {
      candidates = await db
        .select()
        .from(inventoryItems)
        .where(and(inArray(inventoryItems.id, ids), eq(inventoryItems.isAllocated, false)));
    }
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  if (!chosen) {
    return null;
  }

  await db
    .update(inventoryItems)
    .set({
      isAllocated: true,
      allocatedAt: now()
    })
    .where(eq(inventoryItems.id, chosen.id));

  return {
    ...chosen,
    revealedPayload: decryptPayload(chosen.encryptedPayload)
  };
}

export async function createWalletTopup(userId: string, input: WalletTopupInput) {
  const paymentIntentId = createId();
  const amountCents = Math.round(input.amountBaht * 100);
  const uniqueAmountCents = amountCents + Math.floor(Math.random() * 90) + 10;
  const timestamp = now();

  await db.insert(paymentIntents).values({
    id: paymentIntentId,
    userId,
    targetType: "wallet",
    targetId: userId,
    provider: input.method,
    status: "pending",
    amountCents,
    uniqueAmountCents,
    referenceCode: `TOPUP-${paymentIntentId.slice(0, 8).toUpperCase()}`,
    expiresAt: minutesFromNow(15),
    paidAt: null,
    metadataJson: JSON.stringify({ source: "wallet-topup" }),
    createdAt: timestamp
  });

  await db.insert(walletTransactions).values({
    id: createId(),
    userId,
    type: "pending_topup",
    amountCents: uniqueAmountCents,
    referenceId: paymentIntentId,
    detail: `สร้างรายการเติมเงินผ่าน ${input.method}`,
    createdAt: timestamp
  });

  return paymentIntentId;
}

async function completeWalletTopup(intentId: string) {
  const [intent] = await db.select().from(paymentIntents).where(eq(paymentIntents.id, intentId)).limit(1);
  if (!intent || intent.status === "paid") {
    return;
  }

  await db
    .update(paymentIntents)
    .set({
      status: "paid",
      paidAt: now()
    })
    .where(eq(paymentIntents.id, intentId));

  await db
    .update(users)
    .set({
      walletBalanceCents: sql`${users.walletBalanceCents} + ${intent.amountCents}`,
      updatedAt: now()
    })
    .where(eq(users.id, intent.userId));

  await db.insert(walletTransactions).values({
    id: createId(),
    userId: intent.userId,
    type: "topup_completed",
    amountCents: intent.amountCents,
    referenceId: intent.id,
    detail: `เติมเงินสำเร็จ ${intent.referenceCode}`,
    createdAt: now()
  });

  await logAudit("payment_intent", intent.id, "topup_completed", "Webhook ยืนยันการเติมเงิน");
}

async function markOrderPaymentIssue(orderId: string, nextStatus: "failed" | "manual_review", note: string) {
  await db
    .update(orders)
    .set({
      status: nextStatus,
      notes: note,
      updatedAt: now()
    })
    .where(eq(orders.id, orderId));
}

async function processOrderFulfillment(orderId: string) {
  const [item] = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).limit(1);
  if (!item) {
    return;
  }

  const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
  if (!product) {
    return;
  }

  if (["DIGITAL_CODE", "DOWNLOAD_LINK", "ACCOUNT_STOCK", "RANDOM_POOL"].includes(product.type)) {
    const allocation = await allocateInventory(product.id, product.type);
    if (!allocation) {
      await db
        .update(orders)
        .set({
          status: "manual_review",
          notes: "สต็อกไม่พอ ต้องเติมของ",
          updatedAt: now()
        })
        .where(eq(orders.id, orderId));
      return;
    }

    await db
      .update(orderItems)
      .set({
        deliveryPayload: allocation.revealedPayload
      })
      .where(eq(orderItems.id, item.id));

    await db
      .update(orders)
      .set({
        status: "fulfilled",
        notes: `จัดส่งอัตโนมัติ ${allocation.maskedLabel}`,
        updatedAt: now()
      })
      .where(eq(orders.id, orderId));

    await logAudit("order", orderId, "fulfilled", `ส่งของอัตโนมัติ ${allocation.maskedLabel}`);
    return;
  }

  await db.insert(jobs).values({
    id: createId(),
    kind: "provider_purchase",
    status: "pending",
    payloadJson: JSON.stringify({ orderId, productType: product.type }),
    attempts: 0,
    availableAt: now(),
    lastError: null,
    createdAt: now(),
    updatedAt: now()
  });

  await db
    .update(orders)
    .set({
      status: "processing",
      notes: "ส่งเข้าคิว provider",
      updatedAt: now()
    })
    .where(eq(orders.id, orderId));
}

async function markOrderPaid(orderId: string) {
  await db
    .update(orders)
    .set({
      status: "paid",
      updatedAt: now()
    })
    .where(eq(orders.id, orderId));

  await processOrderFulfillment(orderId);
}

export async function createOrder(userId: string, input: CreateOrderInput) {
  const [product] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product || !product.isActive) {
    throw new Error("ไม่พบสินค้าหรือสินค้าปิดขาย");
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new Error("ไม่พบผู้ใช้");
  }

  const orderId = createId();
  const totalCents = product.priceCents * input.quantity;
  const timestamp = now();

  if (input.paymentMethod === "wallet") {
    await db.transaction(async (tx) => {
      const [lockedUser] = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
      if (!lockedUser) {
        throw new Error("ไม่พบผู้ใช้");
      }

      if (lockedUser.walletBalanceCents < totalCents) {
        throw new Error("ยอด Wallet ไม่เพียงพอ");
      }

      await tx.insert(orders).values({
        id: orderId,
        userId,
        status: "paid",
        subtotalCents: totalCents,
        totalCents,
        paymentMethod: input.paymentMethod,
        notes: null,
        createdAt: timestamp,
        updatedAt: timestamp
      });

      await tx.insert(orderItems).values({
        id: createId(),
        orderId,
        productId: product.id,
        quantity: input.quantity,
        unitPriceCents: product.priceCents,
        deliveryPayload: null,
        createdAt: timestamp
      });

      await tx.insert(orderInputs).values({
        id: createId(),
        orderId,
        inputJson: JSON.stringify(input.formInput),
        createdAt: timestamp
      });

      await tx
        .update(users)
        .set({
          walletBalanceCents: lockedUser.walletBalanceCents - totalCents,
          updatedAt: timestamp
        })
        .where(eq(users.id, lockedUser.id));

      await tx.insert(walletTransactions).values({
        id: createId(),
        userId,
        type: "purchase",
        amountCents: -totalCents,
        referenceId: orderId,
        detail: `ซื้อสินค้า ${product.name}`,
        createdAt: timestamp
      });
    });

    await processOrderFulfillment(orderId);
    return { orderId, paymentIntentId: null };
  }

  await db.insert(orders).values({
    id: orderId,
    userId,
    status: "pending_payment",
    subtotalCents: totalCents,
    totalCents,
    paymentMethod: input.paymentMethod,
    notes: null,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  await db.insert(orderItems).values({
    id: createId(),
    orderId,
    productId: product.id,
    quantity: input.quantity,
    unitPriceCents: product.priceCents,
    deliveryPayload: null,
    createdAt: timestamp
  });

  await db.insert(orderInputs).values({
    id: createId(),
    orderId,
    inputJson: JSON.stringify(input.formInput),
    createdAt: timestamp
  });

  if (false) {
    if (user.walletBalanceCents < totalCents) {
      throw new Error("ยอด Wallet ไม่เพียงพอ");
    }

    await db
      .update(users)
      .set({
        walletBalanceCents: user.walletBalanceCents - totalCents,
        updatedAt: timestamp
      })
      .where(eq(users.id, user.id));

    await db.insert(walletTransactions).values({
      id: createId(),
      userId,
      type: "purchase",
      amountCents: -totalCents,
      referenceId: orderId,
      detail: `ซื้อสินค้า ${product.name}`,
      createdAt: timestamp
    });

    await processOrderFulfillment(orderId);
    return { orderId, paymentIntentId: null };
  }

  const paymentIntentId = createId();
  await db.insert(paymentIntents).values({
    id: paymentIntentId,
    userId,
    targetType: "order",
    targetId: orderId,
    provider: "promptpay_qr",
    status: "pending",
    amountCents: totalCents,
    uniqueAmountCents: totalCents + Math.floor(Math.random() * 90) + 10,
    referenceCode: `ORDER-${orderId.slice(0, 8).toUpperCase()}`,
    expiresAt: minutesFromNow(15),
    paidAt: null,
    metadataJson: JSON.stringify({ productId: product.id }),
    createdAt: timestamp
  });

  return { orderId, paymentIntentId };
}

export async function getOrderForUser(orderId: string, userId: string, isAdmin = false) {
  const filter = isAdmin ? eq(orders.id, orderId) : and(eq(orders.id, orderId), eq(orders.userId, userId));
  const [order] = await db.select().from(orders).where(filter).limit(1);
  if (!order) {
    return null;
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const [inputs] = await db.select().from(orderInputs).where(eq(orderInputs.orderId, order.id)).limit(1);
  const [paymentIntent] = await db
    .select()
    .from(paymentIntents)
    .where(and(eq(paymentIntents.targetType, "order"), eq(paymentIntents.targetId, order.id)))
    .limit(1);

  const [providerLink] = isAdmin
    ? await db.select().from(providerOrderLinks).where(eq(providerOrderLinks.orderId, order.id)).limit(1)
    : [];
  const audits = isAdmin
    ? await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, order.id))
        .orderBy(desc(auditLogs.createdAt))
    : [];

  return {
    ...order,
    items,
    formInput: inputs ? JSON.parse(inputs.inputJson) : {},
    paymentIntent,
    providerLink: providerLink ?? null,
    audits
  };
}

export async function getOrdersForUser(userId: string) {
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getAdminOrders(orderFilters?: {
  query?: string;
  status?: string;
  paymentMethod?: string;
  providerKey?: string;
} & AdminPaginationInput) {
  const orderRows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const userIds = Array.from(new Set(orderRows.map((row) => row.userId)));
  const userRows =
    userIds.length > 0
      ? await db
          .select({
            id: users.id,
            email: users.email,
            displayName: users.displayName
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];
  const userMap = new Map(userRows.map((row) => [row.id, row]));
  const providerLinks =
    orderRows.length > 0
      ? await db
          .select({
            orderId: providerOrderLinks.orderId,
            providerKey: providerOrderLinks.providerKey,
            providerOrderId: providerOrderLinks.providerOrderId,
            latestStatus: providerOrderLinks.latestStatus
          })
          .from(providerOrderLinks)
          .where(inArray(providerOrderLinks.orderId, orderRows.map((row) => row.id)))
      : [];
  const providerLinkMap = new Map(providerLinks.map((row) => [row.orderId, row]));

  const normalizedQuery = orderFilters?.query?.trim().toLowerCase() ?? "";
  const normalizedStatus = orderFilters?.status?.trim().toLowerCase() ?? "all";
  const normalizedPaymentMethod = orderFilters?.paymentMethod?.trim().toLowerCase() ?? "all";
  const normalizedProviderKey = orderFilters?.providerKey?.trim().toLowerCase() ?? "all";

  const filteredRows = orderRows
    .map((row) => ({
      ...row,
      userEmail: userMap.get(row.userId)?.email ?? "",
      userDisplayName: userMap.get(row.userId)?.displayName ?? "",
      providerKey: providerLinkMap.get(row.id)?.providerKey ?? null,
      providerOrderId: providerLinkMap.get(row.id)?.providerOrderId ?? null,
      providerStatus: providerLinkMap.get(row.id)?.latestStatus ?? null
    }))
    .filter((row) => {
      if (normalizedStatus !== "all" && row.status.toLowerCase() !== normalizedStatus) {
        return false;
      }

      if (normalizedPaymentMethod !== "all" && row.paymentMethod.toLowerCase() !== normalizedPaymentMethod) {
        return false;
      }

      if (normalizedProviderKey !== "all" && (row.providerKey ?? "").toLowerCase() !== normalizedProviderKey) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystacks = [
        row.id,
        row.userEmail,
        row.userDisplayName,
        row.notes ?? "",
        row.providerOrderId ?? "",
        row.providerStatus ?? ""
      ];

      return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
    });

  return paginateAdminItems(filteredRows, orderFilters, 8);
}

export async function getAdminAuditLogs(auditFilters?: {
  entityType?: string;
  entityId?: string;
  action?: string;
  query?: string;
} & AdminPaginationInput) {
  const whereFilters = [];
  if (auditFilters?.entityType?.trim()) {
    whereFilters.push(eq(auditLogs.entityType, auditFilters.entityType.trim()));
  }
  if (auditFilters?.entityId?.trim()) {
    whereFilters.push(eq(auditLogs.entityId, auditFilters.entityId.trim()));
  }
  if (auditFilters?.action?.trim()) {
    whereFilters.push(eq(auditLogs.action, auditFilters.action.trim()));
  }

  const rows = await db
    .select()
    .from(auditLogs)
    .where(whereFilters.length > 0 ? and(...whereFilters) : undefined)
    .orderBy(desc(auditLogs.createdAt));

  const normalizedQuery = auditFilters?.query?.trim().toLowerCase() ?? "";
  const filteredRows = !normalizedQuery
    ? rows
    : rows.filter((row) => {
        const haystacks = [row.entityType, row.entityId, row.action, row.detail, row.actorUserId ?? ""];
        return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
      });

  return paginateAdminItems(filteredRows, auditFilters, 8);
}

export async function updateAdminOrderStatus(
  orderId: string,
  nextStatus: Extract<OrderStatus, "processing" | "manual_review" | "failed" | "fulfilled">,
  actorUserId?: string,
  note?: string
) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) {
    throw new Error("ไม่พบออเดอร์");
  }

  const nextNote =
    note?.trim() ||
    (nextStatus === "fulfilled"
      ? "ปิดงานด้วยมือจากหลังบ้าน"
      : nextStatus === "processing"
        ? "สั่ง retry จากหลังบ้าน"
        : nextStatus === "manual_review"
          ? "ส่งเข้า manual review จากหลังบ้าน"
          : "ทำเครื่องหมาย failed จากหลังบ้าน");

  await db
    .update(orders)
    .set({
      status: nextStatus,
      notes: nextNote,
      updatedAt: now()
    })
    .where(eq(orders.id, orderId));

  await logAudit("order", orderId, `admin_status_${nextStatus}`, nextNote, actorUserId);

  return getOrderForUser(orderId, order.userId, true);
}

export async function refundOrderByAdmin(orderId: string, actorUserId?: string, note?: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) {
    throw new Error("ไม่พบออเดอร์");
  }

  if (order.status === "refunded") {
    throw new Error("ออเดอร์นี้ refund ไปแล้ว");
  }

  if (order.status === "pending_payment") {
    throw new Error("ยัง refund ออเดอร์ที่ยังไม่ชำระไม่ได้");
  }

  const [user] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);
  if (!user) {
    throw new Error("ไม่พบผู้ใช้ของออเดอร์นี้");
  }

  const refundNote =
    note?.trim() ||
    (order.paymentMethod === "wallet"
      ? `คืน Wallet ${Number((order.totalCents / 100).toFixed(2))} บาท จากหลังบ้าน`
      : "ทำเครื่องหมาย refunded จากหลังบ้าน");

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: "refunded",
        notes: refundNote,
        updatedAt: now()
      })
      .where(eq(orders.id, orderId));

    if (order.paymentMethod === "wallet") {
      await tx
        .update(users)
        .set({
          walletBalanceCents: user.walletBalanceCents + order.totalCents,
          updatedAt: now()
        })
        .where(eq(users.id, user.id));

      await tx.insert(walletTransactions).values({
        id: createId(),
        userId: user.id,
        type: "refund",
        amountCents: order.totalCents,
        referenceId: orderId,
        detail: refundNote,
        createdAt: now()
      });
    }
  });

  await logAudit(
    "order",
    orderId,
    "refund",
    `${refundNote} | paymentMethod=${order.paymentMethod}`,
    actorUserId
  );

  return getOrderForUser(orderId, order.userId, true);
}

export async function getWalletTransactionsForUser(userId: string) {
  return db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, userId))
    .orderBy(desc(walletTransactions.createdAt));
}

export async function getPaymentIntentPresentation(paymentIntentId: string, userId: string, isAdmin = false) {
  const filter = isAdmin
    ? eq(paymentIntents.id, paymentIntentId)
    : and(eq(paymentIntents.id, paymentIntentId), eq(paymentIntents.userId, userId));
  const [intent] = await db.select().from(paymentIntents).where(filter).limit(1);

  if (!intent) {
    return null;
  }

  return buildPaymentIntentPresentation(intent);
}

export async function getAdminPaymentIntents(paymentFilters?: {
  query?: string;
  provider?: string;
  status?: string;
} & AdminPaginationInput) {
  const intentRows = await db.select().from(paymentIntents).orderBy(desc(paymentIntents.createdAt));

  const userIds = Array.from(new Set(intentRows.map((row) => row.userId)));
  const userRows =
    userIds.length > 0
      ? await db
          .select({
            id: users.id,
            email: users.email,
            displayName: users.displayName
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];
  const userMap = new Map(userRows.map((row) => [row.id, row]));

  const presentations = await Promise.all(
    intentRows.map(async (intent) => {
      const presentation = await buildPaymentIntentPresentation(intent);
      const owner = userMap.get(intent.userId);

      return {
        ...presentation,
        userId: intent.userId,
        userEmail: owner?.email ?? "-",
        userDisplayName: owner?.displayName ?? "-",
        targetType: intent.targetType,
        targetId: intent.targetId,
        createdAt: intent.createdAt.toISOString()
      };
    })
  );

  const normalizedQuery = paymentFilters?.query?.trim().toLowerCase() ?? "";
  const normalizedProvider = paymentFilters?.provider?.trim().toLowerCase() ?? "all";
  const normalizedStatus = paymentFilters?.status?.trim().toLowerCase() ?? "all";

  const filteredRows = presentations.filter((intent) => {
    if (normalizedProvider !== "all" && intent.provider.toLowerCase() !== normalizedProvider) {
      return false;
    }

    if (normalizedStatus !== "all" && intent.status.toLowerCase() !== normalizedStatus) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [intent.referenceCode, intent.userEmail, intent.userDisplayName, intent.id, intent.targetId]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(normalizedQuery));
  });

  return paginateAdminItems(filteredRows, paymentFilters, 8);
}

type MatchablePromptpayTransaction = {
  transactionId?: string | null;
  amountCents: number;
  occurredAt?: string | null;
  referenceCode?: string | null;
  note?: string | null;
};

export async function matchPromptpayTransactions(
  transactions: MatchablePromptpayTransaction[],
  actorUserId?: string
) {
  const pendingIntents = await db
    .select()
    .from(paymentIntents)
    .where(and(eq(paymentIntents.provider, "promptpay_qr"), eq(paymentIntents.status, "pending")))
    .orderBy(asc(paymentIntents.createdAt));

  const results: Array<{
    transactionId: string;
    amountCents: number;
    matched: boolean;
    reason: string;
    paymentIntentId: string | null;
    referenceCode: string | null;
  }> = [];
  const consumedIntentIds = new Set<string>();

  for (const [index, transaction] of transactions.entries()) {
    const transactionId = transaction.transactionId?.trim() || `txn-${index + 1}`;
    const amountCents = Math.round(transaction.amountCents);
    const occurredAt = transaction.occurredAt ? new Date(transaction.occurredAt) : null;
    const referenceHint = transaction.referenceCode?.trim() || null;

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      results.push({
        transactionId,
        amountCents,
        matched: false,
        reason: "invalid amount",
        paymentIntentId: null,
        referenceCode: null
      });
      continue;
    }

    const candidates = pendingIntents.filter((intent) => {
      if (consumedIntentIds.has(intent.id)) {
        return false;
      }

      if (intent.uniqueAmountCents !== amountCents) {
        return false;
      }

      if (referenceHint && intent.referenceCode !== referenceHint) {
        return false;
      }

      if (!occurredAt) {
        return true;
      }

      return intent.createdAt <= occurredAt && occurredAt <= new Date(intent.expiresAt.getTime() + 10 * 60_000);
    });

    if (candidates.length !== 1) {
      results.push({
        transactionId,
        amountCents,
        matched: false,
        reason: candidates.length === 0 ? "no matching payment intent" : "ambiguous match",
        paymentIntentId: null,
        referenceCode: referenceHint
      });
      continue;
    }

    const candidate = candidates[0];
    const settleResult = await settlePaymentByReference(candidate.referenceCode, "promptpay_matcher", {
      source: "promptpay-matcher",
      transactionId,
      note: transaction.note ?? null,
      occurredAt: transaction.occurredAt ?? null
    });

    consumedIntentIds.add(candidate.id);

    results.push({
      transactionId,
      amountCents,
      matched: settleResult,
      reason: settleResult ? "matched" : "unable to settle",
      paymentIntentId: candidate.id,
      referenceCode: candidate.referenceCode
    });
  }

  await db.insert(webhookEvents).values({
    id: createId(),
    providerKey: "promptpay_matcher",
    eventType: "payment.match.batch",
    payloadJson: JSON.stringify({ transactions, results }),
    processed: true,
    createdAt: now()
  });

  await logAudit(
    "payment_intent",
    "promptpay_matcher",
    "match_batch",
    `จับคู่ธุรกรรม ${transactions.length} รายการ | matched=${results.filter((item) => item.matched).length}`,
    actorUserId
  );

  return {
    total: transactions.length,
    matched: results.filter((item) => item.matched).length,
    unmatched: results.filter((item) => !item.matched).length,
    results
  };
}

export async function updatePaymentIntentStatus(
  paymentIntentId: string,
  nextStatus: "paid" | "failed" | "expired",
  actorUserId?: string,
  note?: string
) {
  const [intent] = await db.select().from(paymentIntents).where(eq(paymentIntents.id, paymentIntentId)).limit(1);
  if (!intent) {
    throw new Error("ไม่พบ payment intent ที่ต้องการจัดการ");
  }

  if (nextStatus === "paid") {
    const settled = await settlePaymentByReference(intent.referenceCode, "promptpay", {
      source: "admin-manual",
      note: note ?? null
    });

    if (!settled) {
      throw new Error("ไม่สามารถยืนยันการชำระเงินรายการนี้ได้");
    }

    await logAudit("payment_intent", intent.id, "mark_paid", `ยืนยันชำระจากหลังบ้าน${note ? ` | ${note}` : ""}`, actorUserId);
    return getPaymentIntentPresentation(intent.id, intent.userId, true);
  }

  if (intent.status === "paid") {
    throw new Error("รายการนี้ชำระแล้ว จึงเปลี่ยนเป็น failed หรือ expired ไม่ได้");
  }

  await db
    .update(paymentIntents)
    .set({
      status: nextStatus,
      paidAt: null
    })
    .where(eq(paymentIntents.id, intent.id));

  if (intent.targetType === "order") {
    await markOrderPaymentIssue(
      intent.targetId,
      "failed",
      nextStatus === "expired"
        ? note ?? "Payment intent หมดอายุจากหลังบ้าน"
        : note ?? "Payment intent ถูกทำเครื่องหมายว่า failed จากหลังบ้าน"
    );
  }

  await logAudit(
    "payment_intent",
    intent.id,
    nextStatus === "expired" ? "mark_expired" : "mark_failed",
    `${nextStatus} จากหลังบ้าน${note ? ` | ${note}` : ""}`,
    actorUserId
  );

  return getPaymentIntentPresentation(intent.id, intent.userId, true);
}

export async function settlePaymentByReference(referenceCode: string, providerKey: string, payload: unknown) {
  const [intent] = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.referenceCode, referenceCode))
    .limit(1);

  if (!intent) {
    return false;
  }

  await db.insert(webhookEvents).values({
    id: createId(),
    providerKey,
    eventType: "payment.completed",
    payloadJson: JSON.stringify(payload),
    processed: true,
    createdAt: now()
  });

  if (intent.targetType === "wallet") {
    await completeWalletTopup(intent.id);
    return true;
  }

  await db
    .update(paymentIntents)
    .set({
      status: "paid",
      paidAt: now()
    })
    .where(eq(paymentIntents.id, intent.id));

  await markOrderPaid(intent.targetId);
  return true;
}

export async function settlePaymentByReferenceWithAmount(
  referenceCode: string,
  providerKey: string,
  amountCents: number,
  payload: unknown
) {
  const [intent] = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.referenceCode, referenceCode))
    .limit(1);

  if (!intent) {
    return { ok: false, message: "payment intent not found" } as const;
  }

  if (intent.uniqueAmountCents !== amountCents) {
    return {
      ok: false,
      message: `amount mismatch expected=${intent.uniqueAmountCents} received=${amountCents}`
    } as const;
  }

  const settled = await settlePaymentByReference(referenceCode, providerKey, payload);
  return {
    ok: settled,
    message: settled ? "settled" : "unable to settle"
  } as const;
}

export async function settlePaymentIntentById(paymentIntentId: string, providerKey: string, payload: unknown = { source: "dev" }) {
  const [intent] = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.id, paymentIntentId))
    .limit(1);

  if (!intent) {
    return false;
  }

  return settlePaymentByReference(intent.referenceCode, providerKey, payload);
}

export async function getAdminDashboard() {
  const [orderStats] = await db
    .select({
      ordersCount: sql<number>`count(*)`,
      revenueCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`
    })
    .from(orders);
  const [userStats] = await db.select({ usersCount: sql<number>`count(*)` }).from(users);
  const [jobStats] = await db.select({ pendingJobs: sql<number>`count(*)` }).from(jobs).where(eq(jobs.status, "pending"));

  return {
    ordersCount: Number(orderStats?.ordersCount ?? 0),
    revenueCents: Number(orderStats?.revenueCents ?? 0),
    usersCount: Number(userStats?.usersCount ?? 0),
    pendingJobs: Number(jobStats?.pendingJobs ?? 0)
  };
}

export async function getAdminProviders() {
  const rows = await db.select().from(providerConfigs).orderBy(asc(providerConfigs.providerKey));
  const byKey = new Map(rows.map((row) => [row.providerKey, row]));

  return providerKeys.map((providerKey) => {
    const row = byKey.get(providerKey);

    return {
      id: row?.id ?? `virtual-${providerKey}`,
      providerKey,
      isEnabled: row?.isEnabled ?? false,
      configJson: row?.configJson ?? "{}",
      updatedAt: row?.updatedAt?.toISOString() ?? null
    };
  });
}

export async function upsertAdminProviderConfig(
  providerKey: ProviderKey,
  input: { isEnabled: boolean; configJson: string; actorUserId?: string }
) {
  const timestamp = now();
  const configJson = input.configJson.trim() || "{}";
  JSON.parse(configJson);

  const [existing] = await db.select().from(providerConfigs).where(eq(providerConfigs.providerKey, providerKey)).limit(1);

  if (existing) {
    await db
      .update(providerConfigs)
      .set({
        isEnabled: input.isEnabled,
        configJson,
        updatedAt: timestamp
      })
      .where(eq(providerConfigs.id, existing.id));
  } else {
    await db.insert(providerConfigs).values({
      id: createId(),
      providerKey,
      isEnabled: input.isEnabled,
      configJson,
      updatedAt: timestamp
    });
  }

  await logAudit("provider_config", providerKey, "upsert", `updated provider config enabled=${input.isEnabled}`, input.actorUserId);
}

async function getProviderPurchaseOrderContext(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) {
    throw new Error(`order not found: ${orderId}`);
  }

  const [item] = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).limit(1);
  if (!item) {
    throw new Error(`order item not found: ${orderId}`);
  }

  const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
  if (!product) {
    throw new Error(`product not found for order: ${orderId}`);
  }

  const [inputs] = await db.select().from(orderInputs).where(eq(orderInputs.orderId, orderId)).limit(1);
  const formInput = inputs ? (JSON.parse(inputs.inputJson) as Record<string, string>) : {};

  return {
    order,
    item,
    product,
    formInput
  };
}

async function upsertProviderOrderLink(input: {
  orderId: string;
  providerKey: ProviderKey;
  providerOrderId?: string | null;
  latestStatus: string;
  requestJson?: string | null;
  latestPayloadJson?: string | null;
}) {
  const timestamp = now();
  const matchByProviderOrderId = input.providerOrderId?.trim() ? input.providerOrderId.trim() : null;

  const [existing] = matchByProviderOrderId
    ? await db
        .select()
        .from(providerOrderLinks)
        .where(and(eq(providerOrderLinks.providerKey, input.providerKey), eq(providerOrderLinks.providerOrderId, matchByProviderOrderId)))
        .limit(1)
    : await db
        .select()
        .from(providerOrderLinks)
        .where(and(eq(providerOrderLinks.providerKey, input.providerKey), eq(providerOrderLinks.orderId, input.orderId)))
        .limit(1);

  if (existing) {
    await db
      .update(providerOrderLinks)
      .set({
        providerOrderId: matchByProviderOrderId ?? existing.providerOrderId,
        latestStatus: input.latestStatus,
        requestJson: input.requestJson ?? existing.requestJson,
        latestPayloadJson: input.latestPayloadJson ?? existing.latestPayloadJson,
        updatedAt: timestamp
      })
      .where(eq(providerOrderLinks.id, existing.id));

    return existing.id;
  }

  const id = createId();
  await db.insert(providerOrderLinks).values({
    id,
    orderId: input.orderId,
    providerKey: input.providerKey,
    providerOrderId: matchByProviderOrderId,
    latestStatus: input.latestStatus,
    requestJson: input.requestJson ?? null,
    latestPayloadJson: input.latestPayloadJson ?? null,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  return id;
}

export async function applyProviderOrderUpdate(input: {
  providerKey: ProviderKey;
  orderId?: string | null;
  providerOrderId?: string | null;
  status: "processing" | "fulfilled" | "failed" | "manual_review";
  note?: string | null;
  payload?: unknown;
  deliveryPayload?: string | null;
}) {
  const providerOrderId = input.providerOrderId?.trim() || null;
  const directOrderId = input.orderId?.trim() || null;

  const [link] = providerOrderId
    ? await db
        .select()
        .from(providerOrderLinks)
        .where(and(eq(providerOrderLinks.providerKey, input.providerKey), eq(providerOrderLinks.providerOrderId, providerOrderId)))
        .limit(1)
    : directOrderId
      ? await db
          .select()
          .from(providerOrderLinks)
          .where(and(eq(providerOrderLinks.providerKey, input.providerKey), eq(providerOrderLinks.orderId, directOrderId)))
          .limit(1)
      : [];

  const orderId = directOrderId ?? link?.orderId ?? null;
  if (!orderId) {
    return {
      ok: false,
      message: "order not found"
    } as const;
  }

  if (link) {
    await db
      .update(providerOrderLinks)
      .set({
        latestStatus: input.status,
        latestPayloadJson: JSON.stringify(input.payload ?? {}),
        updatedAt: now()
      })
      .where(eq(providerOrderLinks.id, link.id));
  } else {
    await upsertProviderOrderLink({
      orderId,
      providerKey: input.providerKey,
      providerOrderId,
      latestStatus: input.status,
      latestPayloadJson: JSON.stringify(input.payload ?? {})
    });
  }

  if (input.deliveryPayload?.trim()) {
    const [item] = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).limit(1);
    if (item) {
      await db.update(orderItems).set({ deliveryPayload: input.deliveryPayload.trim() }).where(eq(orderItems.id, item.id));
    }
  }

  const noteParts = [input.note?.trim() || null, providerOrderId ? `ref=${providerOrderId}` : null].filter(Boolean);
  await db
    .update(orders)
    .set({
      status: input.status,
      notes: noteParts.join(" | ") || null,
      updatedAt: now()
    })
    .where(eq(orders.id, orderId));

  await db.insert(webhookEvents).values({
    id: createId(),
    providerKey: input.providerKey,
    eventType: "provider.order_update",
    payloadJson: JSON.stringify({
      orderId,
      providerOrderId,
      status: input.status,
      note: input.note ?? null,
      payload: input.payload ?? {}
    }),
    processed: true,
    createdAt: now()
  });

  return {
    ok: true,
    orderId
  } as const;
}

export async function syncProvider(providerKey: ProviderKey) {
  const [config] = await db.select().from(providerConfigs).where(eq(providerConfigs.providerKey, providerKey)).limit(1);

  if (!config || !config.isEnabled) {
    return {
      providerKey,
      ok: false,
      note: "provider disabled"
    };
  }

  if (providerKey === "kbiz") {
    const result = await runKbizStatementImport(matchPromptpayTransactions);
    return {
      providerKey,
      ok: result.ok,
      note: `${result.note} | imported=${result.imported} matched=${result.matched} unmatched=${result.unmatched}`
    };
  }

  const adapter = getProviderAdapterByKey(providerKey);
  const result = await adapter.sync?.({
    providerKey,
    config: JSON.parse(config.configJson) as Record<string, unknown>
  });

  return {
    providerKey,
    ok: result?.ok ?? false,
    note: result?.note ?? "provider sync not supported"
  };
}

export async function getAdminWebhookEvents(webhookFilters?: {
  query?: string;
  providerKey?: string;
  eventType?: string;
  processed?: string;
} & AdminPaginationInput) {
  const rows = await db.select().from(webhookEvents).orderBy(desc(webhookEvents.createdAt));
  const normalizedQuery = webhookFilters?.query?.trim().toLowerCase() ?? "";
  const normalizedProviderKey = webhookFilters?.providerKey?.trim().toLowerCase() ?? "all";
  const normalizedEventType = webhookFilters?.eventType?.trim().toLowerCase() ?? "all";
  const normalizedProcessed = webhookFilters?.processed?.trim().toLowerCase() ?? "all";

  const filteredRows = rows.filter((row) => {
    if (normalizedProviderKey !== "all" && row.providerKey.toLowerCase() !== normalizedProviderKey) {
      return false;
    }

    if (normalizedEventType !== "all" && row.eventType.toLowerCase() !== normalizedEventType) {
      return false;
    }

    if (normalizedProcessed !== "all") {
      const expectedProcessed = normalizedProcessed === "processed";
      if (row.processed !== expectedProcessed) {
        return false;
      }
    }

    if (!normalizedQuery) {
      return true;
    }

    return [row.id, row.providerKey, row.eventType, row.payloadJson].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    );
  });

  return paginateAdminItems(filteredRows, webhookFilters, 8);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function replayWebhookEventByAdmin(webhookEventId: string, actorUserId?: string) {
  const [event] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, webhookEventId)).limit(1);
  if (!event) {
    throw new Error("ไม่พบ webhook event");
  }

  let parsedPayload: unknown = null;
  try {
    parsedPayload = JSON.parse(event.payloadJson) as unknown;
  } catch {
    parsedPayload = event.payloadJson;
  }

  if (event.eventType === "provider.order_update" && isRecord(parsedPayload)) {
    const status = String(parsedPayload.status ?? "");
    if (!["processing", "fulfilled", "failed", "manual_review"].includes(status)) {
      throw new Error("provider.order_update ไม่มี status ที่ replay ได้");
    }

    const result = await applyProviderOrderUpdate({
      providerKey: event.providerKey as ProviderKey,
      orderId: typeof parsedPayload.orderId === "string" ? parsedPayload.orderId : null,
      providerOrderId: typeof parsedPayload.providerOrderId === "string" ? parsedPayload.providerOrderId : null,
      status: status as "processing" | "fulfilled" | "failed" | "manual_review",
      note:
        typeof parsedPayload.note === "string"
          ? `${parsedPayload.note} | replayed by admin`
          : `replayed provider callback from admin (${event.providerKey})`,
      payload: isRecord(parsedPayload.payload) ? parsedPayload.payload : parsedPayload,
      deliveryPayload: typeof parsedPayload.deliveryPayload === "string" ? parsedPayload.deliveryPayload : null
    });

    await logAudit("webhook_event", event.id, "replay", `${event.providerKey}:${event.eventType}`, actorUserId);
    return {
      ok: result.ok,
      message: result.ok ? "replayed provider order update" : result.message
    };
  }

  if (event.eventType === "payment.completed" && isRecord(parsedPayload)) {
    const referenceCode =
      typeof parsedPayload.referenceCode === "string"
        ? parsedPayload.referenceCode
        : typeof parsedPayload.reference === "string"
          ? parsedPayload.reference
          : null;
    if (!referenceCode) {
      throw new Error("payment.completed ไม่มี referenceCode สำหรับ replay");
    }

    const settleResult =
      typeof parsedPayload.amountCents === "number" && Number.isFinite(parsedPayload.amountCents)
        ? await settlePaymentByReferenceWithAmount(
            referenceCode,
            event.providerKey,
            Math.round(parsedPayload.amountCents),
            { ...parsedPayload, replayedByAdmin: true }
          )
        : {
            ok: await settlePaymentByReference(referenceCode, event.providerKey, {
              ...parsedPayload,
              replayedByAdmin: true
            }),
            message: "settled"
          };

    await logAudit("webhook_event", event.id, "replay", `${event.providerKey}:${event.eventType}`, actorUserId);
    return {
      ok: settleResult.ok,
      message: settleResult.message
    };
  }

  if (event.providerKey === "kbiz_import" && event.eventType === "statement.file.processed") {
    const result = await runKbizStatementImport(matchPromptpayTransactions);
    await logAudit("webhook_event", event.id, "replay", `${event.providerKey}:${event.eventType}`, actorUserId);
    return {
      ok: result.ok,
      message: `${result.note} | imported=${result.imported} matched=${result.matched} unmatched=${result.unmatched}`
    };
  }

  throw new Error(`ยังไม่รองรับ replay สำหรับ ${event.providerKey}:${event.eventType}`);
}

export async function getKbizMonitoringSummary(): Promise<KbizMonitoringSummary> {
  const [countRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(providerSyncFiles)
    .where(eq(providerSyncFiles.providerKey, "kbiz"));
  const processedRows = await db
    .select({
      id: providerSyncFiles.id,
      filePath: providerSyncFiles.filePath,
      fileSignature: providerSyncFiles.fileSignature,
      importedAt: providerSyncFiles.importedAt,
      sourceCreatedAt: providerSyncFiles.sourceCreatedAt
    })
    .from(providerSyncFiles)
    .where(eq(providerSyncFiles.providerKey, "kbiz"))
    .orderBy(desc(providerSyncFiles.importedAt))
    .limit(8);
  const eventRows = await db
    .select({
      id: webhookEvents.id,
      createdAt: webhookEvents.createdAt,
      processed: webhookEvents.processed,
      payloadJson: webhookEvents.payloadJson
    })
    .from(webhookEvents)
    .where(and(eq(webhookEvents.providerKey, "kbiz_import"), eq(webhookEvents.eventType, "statement.file.processed")))
    .orderBy(desc(webhookEvents.createdAt))
    .limit(8);

  return {
    latestImportAt: processedRows[0]?.importedAt.toISOString() ?? null,
    processedFiles: Number(countRow?.total ?? 0),
    recentProcessedFiles: processedRows.map((row) => ({
      id: row.id,
      filePath: row.filePath,
      fileSignature: row.fileSignature,
      importedAt: row.importedAt.toISOString(),
      sourceCreatedAt: row.sourceCreatedAt?.toISOString() ?? null
    })),
    recentEvents: eventRows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      processed: row.processed,
      payloadJson: row.payloadJson
    }))
  };
}

export async function syncEnabledProviders() {
  const configs = await db
    .select({ providerKey: providerConfigs.providerKey })
    .from(providerConfigs)
    .where(eq(providerConfigs.isEnabled, true))
    .orderBy(asc(providerConfigs.providerKey));

  const results = [];
  for (const config of configs) {
    results.push(await syncProvider(config.providerKey));
  }

  return results;
}

export async function processPendingJobs() {
  const pending = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.status, "pending"), isNull(jobs.lastError)))
    .orderBy(asc(jobs.createdAt));

  for (const job of pending.slice(0, 20)) {
    await db.update(jobs).set({ status: "processing", attempts: job.attempts + 1, updatedAt: now() }).where(eq(jobs.id, job.id));

    try {
      const payload = JSON.parse(job.payloadJson) as { orderId?: string; productType?: string };
      if (job.kind === "provider_purchase" && payload.orderId) {
        const providerKey = getProviderKeyForProductType(payload.productType);
        const adapter = getProviderAdapter(payload.productType);
        const providerConfig = providerKey ? await getProviderConfigSnapshot(providerKey) : { isEnabled: false, config: {} };
        const orderContext = await getProviderPurchaseOrderContext(payload.orderId);
        const result = await adapter.purchase({
          orderId: payload.orderId,
          payload,
          config: providerConfig.config,
          order: {
            totalCents: orderContext.order.totalCents,
            paymentMethod: orderContext.order.paymentMethod
          },
          item: {
            productId: orderContext.item.productId,
            quantity: orderContext.item.quantity,
            unitPriceCents: orderContext.item.unitPriceCents
          },
          product: {
            name: orderContext.product.name,
            slug: orderContext.product.slug,
            type: orderContext.product.type
          },
          formInput: orderContext.formInput,
          callbackUrl: `${env.apiUrl}/api/webhooks/${providerKey ?? "manual"}/order-update`
        });

        if (providerKey) {
          await upsertProviderOrderLink({
            orderId: payload.orderId,
            providerKey,
            providerOrderId: result.providerOrderId,
            latestStatus: result.externalStatus ?? result.status,
            requestJson: result.requestPayload ? JSON.stringify(result.requestPayload) : null,
            latestPayloadJson: result.responsePayload ? JSON.stringify(result.responsePayload) : null
          });
        }

        if (result.deliveryPayload?.trim()) {
          await db
            .update(orderItems)
            .set({ deliveryPayload: result.deliveryPayload.trim() })
            .where(eq(orderItems.id, orderContext.item.id));
        }

        await db
          .update(orders)
          .set({
            status: result.status,
            notes: result.note,
            updatedAt: now()
          })
          .where(eq(orders.id, payload.orderId));
      }

      await db.update(jobs).set({ status: "completed", updatedAt: now(), lastError: null }).where(eq(jobs.id, job.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown job error";
      const payload = JSON.parse(job.payloadJson) as { orderId?: string };

      if (payload.orderId) {
        await db
          .update(orders)
          .set({
            status: "manual_review",
            notes: `provider job failed | ${message}`,
            updatedAt: now()
          })
          .where(eq(orders.id, payload.orderId));
      }

      await db
        .update(jobs)
        .set({
          status: "failed",
          updatedAt: now(),
          lastError: message
        })
        .where(eq(jobs.id, job.id));
    }
  }

  return pending.length;
}

export async function cleanupExpiredPaymentIntents() {
  const expiredIntents = await db
    .select()
    .from(paymentIntents)
    .where(and(eq(paymentIntents.status, "pending"), sql`${paymentIntents.expiresAt} < now()`));

  for (const intent of expiredIntents) {
    await db
      .update(paymentIntents)
      .set({
        status: "expired",
        paidAt: null
      })
      .where(eq(paymentIntents.id, intent.id));

    if (intent.targetType === "order") {
      await markOrderPaymentIssue(intent.targetId, "failed", "Payment intent หมดอายุอัตโนมัติจาก cron");
    }

    await logAudit("payment_intent", intent.id, "auto_expire", "cron ทำเครื่องหมาย payment intent หมดอายุ");
  }

  return expiredIntents.length;
}

export async function cleanupExpiredOtps() {
  await db.delete(passwordResetOtps).where(sql`${passwordResetOtps.expiresAt} < now() or ${passwordResetOtps.consumedAt} is not null`);
}

export async function countActiveSessions() {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(sessions);
  return Number(row?.count ?? 0);
}

export async function getAdminInventorySummary() {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      type: products.type,
      availableStock: sql<number>`sum(case when ${inventoryItems.isAllocated} = false then 1 else 0 end)`,
      allocatedStock: sql<number>`sum(case when ${inventoryItems.isAllocated} = true then 1 else 0 end)`
    })
    .from(products)
    .leftJoin(inventoryItems, eq(inventoryItems.productId, products.id))
    .groupBy(products.id, products.name, products.slug, products.type)
    .orderBy(asc(products.name));

  return rows.map((row) => ({
    ...row,
    availableStock: Number(row.availableStock ?? 0),
    allocatedStock: Number(row.allocatedStock ?? 0)
  }));
}

function normalizeHomepageContent(rawValue: string | null | undefined) {
  if (!rawValue) {
    return homepageContentDefaults;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    const result = homepageContentSchema.safeParse({
      ...homepageContentDefaults,
      ...(typeof parsed === "object" && parsed ? parsed : {})
    });

    return result.success ? result.data : homepageContentDefaults;
  } catch {
    return homepageContentDefaults;
  }
}

function normalizeFooterContent(rawValue: string | null | undefined) {
  if (!rawValue) {
    return footerContentDefaults;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    const result = footerContentSchema.safeParse({
      ...footerContentDefaults,
      ...(typeof parsed === "object" && parsed ? parsed : {})
    });

    return result.success ? result.data : footerContentDefaults;
  } catch {
    return footerContentDefaults;
  }
}

export async function getHomepageContent() {
  const [row] = await db.select().from(siteContents).where(eq(siteContents.contentKey, "homepage")).limit(1);
  return normalizeHomepageContent(row?.valueJson);
}

export async function upsertHomepageContent(input: HomepageContent, actorUserId?: string) {
  const normalized = homepageContentSchema.parse(input);
  const valueJson = JSON.stringify(normalized);
  const timestamp = now();
  const [existing] = await db.select().from(siteContents).where(eq(siteContents.contentKey, "homepage")).limit(1);

  if (existing) {
    await db
      .update(siteContents)
      .set({
        valueJson,
        updatedAt: timestamp
      })
      .where(eq(siteContents.id, existing.id));
  } else {
    await db.insert(siteContents).values({
      id: createId(),
      contentKey: "homepage",
      valueJson,
      updatedAt: timestamp
    });
  }

  await logAudit("site_content", "homepage", "update", "อัปเดตข้อความหน้าแรกจากหลังบ้าน", actorUserId);

  return normalized;
}

export async function getFooterContent() {
  const [row] = await db.select().from(siteContents).where(eq(siteContents.contentKey, "footer")).limit(1);
  return normalizeFooterContent(row?.valueJson);
}

export async function upsertFooterContent(input: FooterContent, actorUserId?: string) {
  const normalized = footerContentSchema.parse(input);
  const valueJson = JSON.stringify(normalized);
  const timestamp = now();
  const [existing] = await db.select().from(siteContents).where(eq(siteContents.contentKey, "footer")).limit(1);

  if (existing) {
    await db
      .update(siteContents)
      .set({
        valueJson,
        updatedAt: timestamp
      })
      .where(eq(siteContents.id, existing.id));
  } else {
    await db.insert(siteContents).values({
      id: createId(),
      contentKey: "footer",
      valueJson,
      updatedAt: timestamp
    });
  }

  await logAudit("site_content", "footer", "update", "อัปเดตข้อความ footer จากหลังบ้าน", actorUserId);

  return normalized;
}

function createMaskedInventoryLabel(kind: "code" | "download_link" | "account" | "generic", entry: string, index: number) {
  const normalized = entry.trim();
  if (!normalized) {
    return `${kind.toUpperCase()} #${String(index + 1).padStart(3, "0")}`;
  }

  if (normalized.length <= 24) {
    return normalized;
  }

  return `${normalized.slice(0, 10)}...${normalized.slice(-6)}`;
}

async function ensureProductExists(productId: string) {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) {
    throw new Error("ไม่พบสินค้าที่ต้องการจัดการ");
  }

  return product;
}

export async function getAdminCategories() {
  const categoryRows = await db.select().from(categories).orderBy(asc(categories.name));
  const productCounts = await db
    .select({
      categoryId: products.categoryId,
      totalProducts: sql<number>`count(*)`
    })
    .from(products)
    .groupBy(products.categoryId);

  const countByCategory = new Map(productCounts.map((row) => [row.categoryId, Number(row.totalProducts ?? 0)]));

  return categoryRows.map((row) => ({
    ...row,
    totalProducts: countByCategory.get(row.id) ?? 0
  }));
}

export async function createAdminCategory(
  input: {
    slug: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    actorUserId?: string;
  }
) {
  const id = createId();
  const timestamp = now();

  await db.insert(categories).values({
    id,
    slug: input.slug.trim(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    icon: input.icon?.trim() || null,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  await logAudit("category", id, "create", `สร้างหมวดหมู่ ${input.name.trim()}`, input.actorUserId);

  return id;
}

export async function updateAdminCategory(
  categoryId: string,
  input: {
    slug: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    actorUserId?: string;
  }
) {
  await db
    .update(categories)
    .set({
      slug: input.slug.trim(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      icon: input.icon?.trim() || null,
      updatedAt: now()
    })
    .where(eq(categories.id, categoryId));

  await logAudit("category", categoryId, "update", `อัปเดตหมวดหมู่ ${input.name.trim()}`, input.actorUserId);
}

export async function deleteAdminCategory(categoryId: string, actorUserId?: string) {
  const [usage] = await db
    .select({ totalProducts: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.categoryId, categoryId));

  if (Number(usage?.totalProducts ?? 0) > 0) {
    throw new Error("ลบหมวดหมู่นี้ไม่ได้ เพราะยังมีสินค้าอยู่ในหมวด");
  }

  await db.delete(categories).where(eq(categories.id, categoryId));
  await logAudit("category", categoryId, "delete", "ลบหมวดหมู่จากหลังบ้าน", actorUserId);
}

export async function getAdminInventoryItems(productId?: string) {
  const itemRows = await db
    .select()
    .from(inventoryItems)
    .where(productId ? eq(inventoryItems.productId, productId) : undefined)
    .orderBy(desc(inventoryItems.createdAt));

  const uniqueProductIds = Array.from(new Set(itemRows.map((row) => row.productId)));
  const productRows =
    uniqueProductIds.length > 0
      ? await db
          .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            type: products.type,
            categoryId: products.categoryId
          })
          .from(products)
          .where(inArray(products.id, uniqueProductIds))
      : [];

  const uniqueCategoryIds = Array.from(new Set(productRows.map((row) => row.categoryId)));
  const categoryRows =
    uniqueCategoryIds.length > 0
      ? await db
          .select({
            id: categories.id,
            name: categories.name,
            slug: categories.slug
          })
          .from(categories)
          .where(inArray(categories.id, uniqueCategoryIds))
      : [];

  const productMap = new Map(productRows.map((row) => [row.id, row]));
  const categoryMap = new Map(categoryRows.map((row) => [row.id, row]));

  return itemRows.map((row) => {
    const product = productMap.get(row.productId);
    const category = product ? categoryMap.get(product.categoryId) : null;

    return {
      id: row.id,
      productId: row.productId,
      productName: product?.name ?? "ไม่พบสินค้า",
      productSlug: product?.slug ?? "",
      productType: product?.type ?? "DIGITAL_CODE",
      categoryId: product?.categoryId ?? null,
      categoryName: category?.name ?? "ไม่ระบุหมวด",
      categorySlug: category?.slug ?? "",
      kind: row.kind,
      maskedLabel: row.maskedLabel,
      payload: decryptPayload(row.encryptedPayload),
      isAllocated: row.isAllocated,
      createdAt: row.createdAt.toISOString(),
      allocatedAt: row.allocatedAt?.toISOString() ?? null
    };
  });
}

export async function createAdminInventoryItem(
  input: {
    productId: string;
    kind: "code" | "download_link" | "account" | "generic";
    maskedLabel?: string | null;
    payload: string;
    actorUserId?: string;
  }
) {
  const product = await ensureProductExists(input.productId);
  const normalizedPayload = input.payload.trim();
  if (!normalizedPayload) {
    throw new Error("กรุณากรอกข้อมูล code หรือลิงก์ที่ต้องการขาย");
  }

  const id = createId();
  await db.insert(inventoryItems).values({
    id,
    productId: product.id,
    kind: input.kind,
    maskedLabel: input.maskedLabel?.trim() || createMaskedInventoryLabel(input.kind, normalizedPayload, 0),
    encryptedPayload: encryptPayload(normalizedPayload),
    isAllocated: false,
    createdAt: now(),
    allocatedAt: null
  });

  await logAudit("inventory_item", id, "create", `เพิ่ม stock สำหรับ ${product.name}`, input.actorUserId);
  return id;
}

export async function updateAdminInventoryItem(
  inventoryItemId: string,
  input: {
    productId: string;
    kind: "code" | "download_link" | "account" | "generic";
    maskedLabel?: string | null;
    payload: string;
    actorUserId?: string;
  }
) {
  const [existing] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, inventoryItemId)).limit(1);
  if (!existing) {
    throw new Error("ไม่พบรายการคลังโค้ดที่ต้องการแก้ไข");
  }

  if (existing.isAllocated) {
    throw new Error("รายการนี้ถูกขายไปแล้ว จึงแก้ไขไม่ได้");
  }

  const product = await ensureProductExists(input.productId);
  const normalizedPayload = input.payload.trim();
  if (!normalizedPayload) {
    throw new Error("กรุณากรอกข้อมูล code หรือลิงก์ที่ต้องการขาย");
  }

  await db
    .update(inventoryItems)
    .set({
      productId: product.id,
      kind: input.kind,
      maskedLabel: input.maskedLabel?.trim() || createMaskedInventoryLabel(input.kind, normalizedPayload, 0),
      encryptedPayload: encryptPayload(normalizedPayload)
    })
    .where(eq(inventoryItems.id, inventoryItemId));

  await logAudit("inventory_item", inventoryItemId, "update", `อัปเดตรายการคลังของ ${product.name}`, input.actorUserId);
}

export async function deleteAdminInventoryItem(inventoryItemId: string, actorUserId?: string) {
  const [existing] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, inventoryItemId)).limit(1);
  if (!existing) {
    throw new Error("ไม่พบรายการคลังโค้ดที่ต้องการลบ");
  }

  if (existing.isAllocated) {
    throw new Error("รายการนี้ถูกขายไปแล้ว จึงลบไม่ได้");
  }

  await db.delete(inventoryItems).where(eq(inventoryItems.id, inventoryItemId));
  await logAudit("inventory_item", inventoryItemId, "delete", "ลบรายการคลังโค้ดจากหลังบ้าน", actorUserId);
}

export async function importInventoryBatch(
  productId: string,
  kind: "code" | "download_link" | "account" | "generic",
  entries: string[],
  actorUserId?: string
) {
  const product = await ensureProductExists(productId);
  const timestamp = now();
  const values = entries
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => ({
      id: createId(),
      productId,
      kind,
      maskedLabel: createMaskedInventoryLabel(kind, entry, index),
      encryptedPayload: encryptPayload(entry),
      isAllocated: false,
      createdAt: timestamp,
      allocatedAt: null
    }));

  if (values.length === 0) {
    return 0;
  }

  await db.insert(inventoryItems).values(values);
  await logAudit("inventory_item", productId, "bulk_import", `นำเข้า stock ${values.length} รายการสำหรับ ${product.name}`, actorUserId);
  return values.length;
}

export async function getJobsList(jobFilters?: {
  kind?: string;
  status?: string;
  query?: string;
} & AdminPaginationInput) {
  const rows = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  const normalizedKind = jobFilters?.kind?.trim().toLowerCase() ?? "all";
  const normalizedStatus = jobFilters?.status?.trim().toLowerCase() ?? "all";
  const normalizedQuery = jobFilters?.query?.trim().toLowerCase() ?? "";

  const filteredRows = rows.filter((row) => {
    if (normalizedKind !== "all" && row.kind.toLowerCase() !== normalizedKind) {
      return false;
    }

    if (normalizedStatus !== "all" && row.status.toLowerCase() !== normalizedStatus) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [row.id, row.kind, row.status, row.payloadJson, row.lastError ?? ""].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    );
  });

  return paginateAdminItems(filteredRows, jobFilters, 8);
}

export async function requeueJob(jobId: string) {
  await db
    .update(jobs)
    .set({
      status: "pending",
      availableAt: now(),
      updatedAt: now(),
      lastError: null
    })
    .where(eq(jobs.id, jobId));
}
