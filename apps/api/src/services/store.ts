import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import type { CreateOrderInput, ProductType, WalletTopupInput } from "@cip/shared";

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
  products,
  randomPools,
  sessions,
  users,
  walletTransactions,
  webhookEvents
} from "../db/schema";
import { createId } from "../lib/ids";
import { decryptPayload, encryptPayload } from "../lib/security";
import { minutesFromNow, now } from "../lib/time";
import { getProviderAdapter } from "../providers/registry";

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

  await db.insert(orders).values({
    id: orderId,
    userId,
    status: input.paymentMethod === "wallet" ? "paid" : "pending_payment",
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

  if (input.paymentMethod === "wallet") {
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

  return {
    ...order,
    items,
    formInput: inputs ? JSON.parse(inputs.inputJson) : {},
    paymentIntent
  };
}

export async function getOrdersForUser(userId: string) {
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getWalletTransactionsForUser(userId: string) {
  return db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, userId))
    .orderBy(desc(walletTransactions.createdAt));
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

export async function processPendingJobs() {
  const pending = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.status, "pending"), isNull(jobs.lastError)))
    .orderBy(asc(jobs.createdAt));

  for (const job of pending.slice(0, 20)) {
    await db.update(jobs).set({ status: "processing", attempts: job.attempts + 1, updatedAt: now() }).where(eq(jobs.id, job.id));

    const payload = JSON.parse(job.payloadJson) as { orderId?: string; productType?: string };
    if (job.kind === "provider_purchase" && payload.orderId) {
      const adapter = getProviderAdapter(payload.productType);
      const result = await adapter.purchase({ orderId: payload.orderId, payload });

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
  }

  return pending.length;
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

export async function importInventoryBatch(productId: string, kind: "code" | "download_link" | "account" | "generic", entries: string[]) {
  const timestamp = now();
  const values = entries
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => ({
      id: createId(),
      productId,
      kind,
      maskedLabel: `${kind.toUpperCase()} #${String(index + 1).padStart(3, "0")}`,
      encryptedPayload: encryptPayload(entry),
      isAllocated: false,
      createdAt: timestamp,
      allocatedAt: null
    }));

  if (values.length === 0) {
    return 0;
  }

  await db.insert(inventoryItems).values(values);
  return values.length;
}

export async function getJobsList() {
  return db.select().from(jobs).orderBy(desc(jobs.createdAt));
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
