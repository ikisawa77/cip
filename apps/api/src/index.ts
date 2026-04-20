import path from "node:path";
import { fileURLToPath } from "node:url";

import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import cors from "cors";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import express from "express";

import {
  authChangePasswordSchema,
  authConfirmPasswordSchema,
  authLoginSchema,
  authRegisterSchema,
  createOrderSchema,
  footerContentSchema,
  forgotPasswordRequestSchema,
  forgotPasswordVerifySchema,
  homepageContentSchema,
  paymentIntentPresentationSchema,
  type ProductType,
  walletTopupSchema
} from "@cip/shared";

import { env, isProduction } from "./config/env";
import { db } from "./db";
import {
  categories,
  orders,
  passwordResetOtps,
  products,
  sessions,
  users,
  webhookEvents
} from "./db/schema";
import {
  attachAuthUser,
  clearSessionCookie,
  hashSessionToken,
  isCurrentSessionToken,
  requireAdmin,
  requireAuth,
  sessionExpiresAtFrom,
  setSessionCookie
} from "./lib/auth";
import { createId } from "./lib/ids";
import { normalizeKbizStatementRows, parseKbizStatementText } from "./lib/kbiz-statement";
import { sendOtpEmail } from "./lib/mailer";
import { verifyWebhookSignature } from "./lib/security";
import { minutesFromNow, now } from "./lib/time";
import { isProviderKey } from "./providers/registry";
import { map24PaysellerStatus } from "./providers/pays24seller";
import { mapPeamsub24hrStatus } from "./providers/peamsub24hr";
import { mapTruemoneyPaymentStatus } from "./providers/truemoney";
import { mapWepayStatus } from "./providers/wepay";
import {
  cleanupExpiredOtps,
  cleanupExpiredPaymentIntents,
  createAdminCategory,
  createAdminInventoryItem,
  countActiveSessions,
  getAdminAuditLogs,
  createOrder,
  createWalletTopup,
  deleteAdminCategory,
  deleteAdminInventoryItem,
  getAdminCategories,
  getAdminDashboard,
  getAdminInventoryItems,
  getAdminInventorySummary,
  getAdminOrders,
  getPromptpayConfigForWebhook,
  getAdminPaymentIntents,
  getAdminProviders,
  getCatalog,
  getFooterContent,
  getHomepageContent,
  getJobsList,
  getOrderForUser,
  getOrdersForUser,
  getPaymentIntentPresentation,
  getProviderConfigSnapshot,
  getProductBySlug,
  getWalletTransactionsForUser,
  importInventoryBatch,
  matchPromptpayTransactions,
  applyProviderOrderUpdate,
  processPendingJobs,
  requeueJob,
  refundOrderByAdmin,
  settlePaymentByReference,
  settlePaymentByReferenceWithAmount,
  settlePaymentIntentById,
  syncEnabledProviders,
  syncProvider,
  updateAdminOrderStatus,
  updatePaymentIntentStatus,
  upsertFooterContent,
  upsertHomepageContent,
  updateAdminCategory,
  updateAdminInventoryItem,
  upsertAdminProviderConfig
} from "./services/store";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(currentDir, "../public");
const maxSessionsPerUser = 5;

const app = express();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseWebhookAmountCents(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const normalized = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(normalized)) {
    return null;
  }

  return Math.round(normalized * 100);
}

async function trimUserSessions(userId: string) {
  const allSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt), desc(sessions.expiresAt));

  const removableIds = allSessions.slice(maxSessionsPerUser).map((session) => session.id);
  if (removableIds.length > 0) {
    await db.delete(sessions).where(inArray(sessions.id, removableIds));
  }
}

async function createSessionForUser(
  res: express.Response,
  user: Pick<typeof users.$inferSelect, "id" | "email" | "displayName" | "role" | "walletBalanceCents">
) {
  const rawToken = createId();
  const expiresAt = sessionExpiresAtFrom();

  await db.insert(sessions).values({
    id: createId(),
    userId: user.id,
    token: hashSessionToken(rawToken),
    expiresAt,
    createdAt: now()
  });
  await trimUserSessions(user.id);
  setSessionCookie(res, rawToken, expiresAt);

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      walletBalanceCents: user.walletBalanceCents
    }
  };
}

app.use(
  cors({
    origin: env.appUrl,
    credentials: true
  })
);
app.use(
  express.json({
    verify: (req, _res, buffer) => {
      (req as express.Request & { rawBody?: string }).rawBody = buffer.toString("utf8");
    }
  })
);
app.use(cookieParser());
app.use(attachAuthUser);

app.get("/api/health", async (_req, res) => {
  res.json({
    ok: true,
    now: new Date().toISOString(),
    activeSessions: await countActiveSessions()
  });
});

app.get("/api/catalog", async (_req, res) => {
  res.json(await getCatalog());
});

app.get("/api/products/:slug", async (req, res) => {
  const product = await getProductBySlug(String(req.params.slug));
  if (!product) {
    res.status(404).json({ message: "ไม่พบสินค้า" });
    return;
  }

  res.json(product);
});

app.get("/api/content/homepage", async (_req, res) => {
  res.json(await getHomepageContent());
});

app.get("/api/content/footer", async (_req, res) => {
  res.json(await getFooterContent());
});

app.post("/api/auth/register", async (req, res) => {
  const input = authRegisterSchema.parse({
    ...req.body,
    email: normalizeEmail(String(req.body.email ?? ""))
  });
  const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    return;
  }

  const user = {
    id: createId(),
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, 10),
    displayName: input.displayName,
    role: "customer" as const,
    walletBalanceCents: 0,
    createdAt: now(),
    updatedAt: now()
  };

  await db.insert(users).values(user);
  res.status(201).json({
    ...(await createSessionForUser(res, user)),
    message: "สมัครสมาชิกและเข้าสู่ระบบสำเร็จ"
  });
});

app.post("/api/auth/login", async (req, res) => {
  const input = authLoginSchema.parse({
    ...req.body,
    email: normalizeEmail(String(req.body.email ?? ""))
  });
  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    return;
  }

  res.json({
    ...(await createSessionForUser(res, user)),
    message: "เข้าสู่ระบบสำเร็จ"
  });
});

app.post("/api/auth/logout", async (req, res) => {
  const rawToken = req.cookies.cip_session as string | undefined;
  if (rawToken) {
    await db.delete(sessions).where(eq(sessions.token, hashSessionToken(rawToken)));
  }

  clearSessionCookie(res);
  res.json({ message: "ออกจากระบบแล้ว" });
});

app.get("/api/auth/me", async (req, res) => {
  res.json({
    user: req.authUser ?? null,
    session: req.authSession
      ? {
          id: req.authSession.id,
          expiresAt: req.authSession.expiresAt
        }
      : null
  });
});

app.get("/api/auth/sessions", requireAuth, async (req, res) => {
  const rawToken = req.cookies.cip_session as string | undefined;
  const userSessions = await db
    .select({
      id: sessions.id,
      token: sessions.token,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt
    })
    .from(sessions)
    .where(eq(sessions.userId, req.authUser!.id))
    .orderBy(desc(sessions.createdAt));

  res.json(
    userSessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      current: req.authSession?.id === session.id || isCurrentSessionToken(rawToken, session.token)
    }))
  );
});

app.delete("/api/auth/sessions/:sessionId", requireAuth, async (req, res) => {
  const sessionId = String(req.params.sessionId);
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, req.authUser!.id)))
    .limit(1);

  if (!session) {
    res.status(404).json({ message: "ไม่พบ session ที่ต้องการ" });
    return;
  }

  await db.delete(sessions).where(eq(sessions.id, session.id));
  if (req.authSession?.id === session.id) {
    clearSessionCookie(res);
  }

  res.status(204).end();
});

app.post("/api/auth/forgot-password/request", async (req, res) => {
  const input = forgotPasswordRequestSchema.parse({
    ...req.body,
    email: normalizeEmail(String(req.body.email ?? ""))
  });
  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (!user) {
    res.json({ message: "หากพบอีเมลในระบบ จะมี OTP ส่งไปให้" });
    return;
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await db.insert(passwordResetOtps).values({
    id: createId(),
    userId: user.id,
    email: user.email,
    otp,
    expiresAt: minutesFromNow(10),
    consumedAt: null,
    createdAt: now()
  });

  await sendOtpEmail(user.email, otp);
  res.json({
    message: "ส่ง OTP แล้ว",
    previewOtp: isProduction ? undefined : otp
  });
});

app.post("/api/auth/forgot-password/verify", async (req, res) => {
  const input = forgotPasswordVerifySchema.parse({
    ...req.body,
    email: normalizeEmail(String(req.body.email ?? ""))
  });
  const [record] = await db
    .select()
    .from(passwordResetOtps)
    .where(and(eq(passwordResetOtps.email, input.email), eq(passwordResetOtps.otp, input.otp)))
    .orderBy(desc(passwordResetOtps.createdAt))
    .limit(1);

  if (!record || record.expiresAt < new Date() || record.consumedAt) {
    res.status(400).json({ message: "OTP ไม่ถูกต้องหรือหมดอายุ" });
    return;
  }

  await db
    .update(users)
    .set({
      passwordHash: await bcrypt.hash(input.newPassword, 10),
      updatedAt: now()
    })
    .where(eq(users.id, record.userId));

  await db.update(passwordResetOtps).set({ consumedAt: now() }).where(eq(passwordResetOtps.id, record.id));
  await db.delete(sessions).where(eq(sessions.userId, record.userId));
  await db
    .delete(passwordResetOtps)
    .where(and(eq(passwordResetOtps.userId, record.userId), ne(passwordResetOtps.id, record.id)));
  clearSessionCookie(res);

  res.json({ message: "รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง" });
});

app.post("/api/auth/change-password", requireAuth, async (req, res) => {
  const input = authChangePasswordSchema.parse(req.body);
  const [user] = await db.select().from(users).where(eq(users.id, req.authUser!.id)).limit(1);

  if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    res.status(400).json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
    return;
  }

  if (input.currentPassword === input.newPassword) {
    res.status(400).json({ message: "รหัสผ่านใหม่ต้องไม่ซ้ำรหัสผ่านเดิม" });
    return;
  }

  await db
    .update(users)
    .set({
      passwordHash: await bcrypt.hash(input.newPassword, 10),
      updatedAt: now()
    })
    .where(eq(users.id, user.id));
  await db.delete(sessions).where(eq(sessions.userId, user.id));

  res.json({
    ...(await createSessionForUser(res, user)),
    message: "เปลี่ยนรหัสผ่านสำเร็จ และรีเฟรช session ให้แล้ว"
  });
});

app.post("/api/auth/confirm-password", requireAuth, async (req, res) => {
  const input = authConfirmPasswordSchema.parse(req.body);
  const [user] = await db.select().from(users).where(eq(users.id, req.authUser!.id)).limit(1);

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
    return;
  }

  res.json({ ok: true, message: "ยืนยันรหัสผ่านสำเร็จ" });
});

app.post("/api/wallet/topup-intents", requireAuth, async (req, res) => {
  const input = walletTopupSchema.parse(req.body);
  const paymentIntentId = await createWalletTopup(req.authUser!.id, input);
  const paymentIntent = await getPaymentIntentPresentation(paymentIntentId, req.authUser!.id);
  res.status(201).json({ paymentIntentId, paymentIntent });
});

app.get("/api/wallet/history", requireAuth, async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.authUser!.id)).limit(1);
  res.json({
    balanceCents: user?.walletBalanceCents ?? 0,
    transactions: await getWalletTransactionsForUser(req.authUser!.id)
  });
});

app.post("/api/orders", requireAuth, async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  try {
    const result = await createOrder(req.authUser!.id, input);
    const paymentIntent = result.paymentIntentId
      ? await getPaymentIntentPresentation(result.paymentIntentId, req.authUser!.id)
      : null;

    res.status(201).json({
      ...result,
      paymentIntent
    });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "สร้างออเดอร์ไม่สำเร็จ" });
  }
});

app.get("/api/payment-intents/:id", requireAuth, async (req, res) => {
  const paymentIntent = await getPaymentIntentPresentation(String(req.params.id), req.authUser!.id, req.authUser?.role === "admin");
  if (!paymentIntent) {
    res.status(404).json({ message: "ไม่พบ payment intent" });
    return;
  }

  res.json(paymentIntentPresentationSchema.parse(paymentIntent));
});

app.get("/api/orders", requireAuth, async (req, res) => {
  res.json(await getOrdersForUser(req.authUser!.id));
});

app.get("/api/orders/:id", requireAuth, async (req, res) => {
  const order = await getOrderForUser(String(req.params.id), req.authUser!.id);
  if (!order) {
    res.status(404).json({ message: "ไม่พบออเดอร์" });
    return;
  }

  res.json(order);
});

app.get("/api/admin/dashboard", requireAdmin, async (_req, res) => {
  res.json(await getAdminDashboard());
});

app.get("/api/admin/categories", requireAdmin, async (_req, res) => {
  res.json(await getAdminCategories());
});

app.get("/api/admin/content/homepage", requireAdmin, async (_req, res) => {
  res.json(await getHomepageContent());
});

app.put("/api/admin/content/homepage", requireAdmin, async (req, res) => {
  const input = homepageContentSchema.parse(req.body);
  res.json(await upsertHomepageContent(input, req.authUser!.id));
});

app.get("/api/admin/content/footer", requireAdmin, async (_req, res) => {
  res.json(await getFooterContent());
});

app.put("/api/admin/content/footer", requireAdmin, async (req, res) => {
  const input = footerContentSchema.parse(req.body);
  res.json(await upsertFooterContent(input, req.authUser!.id));
});

app.post("/api/admin/categories", requireAdmin, async (req, res) => {
  const { slug, name, description, icon } = req.body as Record<string, string>;
  const id = await createAdminCategory({
    slug,
    name,
    description: description ?? null,
    icon: icon ?? null,
    actorUserId: req.authUser!.id
  });

  res.status(201).json({ id });
});

app.put("/api/admin/categories/:id", requireAdmin, async (req, res) => {
  const { slug, name, description, icon } = req.body as Record<string, string>;

  await updateAdminCategory(String(req.params.id), {
    slug,
    name,
    description: description ?? null,
    icon: icon ?? null,
    actorUserId: req.authUser!.id
  });

  res.json({ ok: true });
});

app.delete("/api/admin/categories/:id", requireAdmin, async (req, res) => {
  await deleteAdminCategory(String(req.params.id), req.authUser!.id);
  res.json({ ok: true });
});

app.get("/api/admin/products", requireAdmin, async (_req, res) => {
  res.json(await db.select().from(products).orderBy(asc(products.name)));
});

app.post("/api/admin/products", requireAdmin, async (req, res) => {
  const payload = req.body as Record<string, unknown>;
  const id = createId();
  await db.insert(products).values({
    id,
    categoryId: String(payload.categoryId),
    slug: String(payload.slug),
    name: String(payload.name),
    description: String(payload.description),
    type: String(payload.type) as ProductType,
    priceCents: Number(payload.priceCents),
    compareAtCents: payload.compareAtCents ? Number(payload.compareAtCents) : null,
    deliveryNote: payload.deliveryNote ? String(payload.deliveryNote) : null,
    badge: payload.badge ? String(payload.badge) : null,
    coverImage: payload.coverImage ? String(payload.coverImage) : null,
    isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
    createdAt: now(),
    updatedAt: now()
  });
  res.status(201).json({ id });
});

app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const payload = req.body as Record<string, unknown>;
  await db
    .update(products)
    .set({
      categoryId: String(payload.categoryId),
      slug: String(payload.slug),
      name: String(payload.name),
      description: String(payload.description),
      type: String(payload.type) as ProductType,
      priceCents: Number(payload.priceCents),
      compareAtCents: payload.compareAtCents ? Number(payload.compareAtCents) : null,
      badge: payload.badge ? String(payload.badge) : null,
      deliveryNote: payload.deliveryNote ? String(payload.deliveryNote) : null,
      coverImage: payload.coverImage ? String(payload.coverImage) : null,
      isActive: Boolean(payload.isActive),
      updatedAt: now()
    })
    .where(eq(products.id, String(req.params.id)));
  res.json({ ok: true });
});

app.get("/api/admin/orders", requireAdmin, async (_req, res) => {
  const query = typeof _req.query.query === "string" ? _req.query.query : undefined;
  const status = typeof _req.query.status === "string" ? _req.query.status : undefined;
  const paymentMethod = typeof _req.query.paymentMethod === "string" ? _req.query.paymentMethod : undefined;
  const providerKey = typeof _req.query.providerKey === "string" ? _req.query.providerKey : undefined;
  res.json(await getAdminOrders({ query, status, paymentMethod, providerKey }));
});

app.get("/api/admin/audit-logs", requireAdmin, async (req, res) => {
  const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
  const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;
  const action = typeof req.query.action === "string" ? req.query.action : undefined;
  const query = typeof req.query.query === "string" ? req.query.query : undefined;
  res.json(await getAdminAuditLogs({ entityType, entityId, action, query }));
});

app.get("/api/admin/payment-intents", requireAdmin, async (_req, res) => {
  res.json(await getAdminPaymentIntents());
});

app.post("/api/admin/payment-intents/:id/status", requireAdmin, async (req, res) => {
  const nextStatus = String(req.body.status ?? "");
  if (!["paid", "failed", "expired"].includes(nextStatus)) {
    res.status(400).json({ message: "invalid payment intent status" });
    return;
  }

  try {
    const paymentIntent = await updatePaymentIntentStatus(
      String(req.params.id),
      nextStatus as "paid" | "failed" | "expired",
      req.authUser?.id,
      typeof req.body.note === "string" ? req.body.note : undefined
    );
    res.json(paymentIntent);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "จัดการ payment intent ไม่สำเร็จ" });
  }
});

app.post("/api/admin/payment-intents/match-transactions", requireAdmin, async (req, res) => {
  const transactions = Array.isArray(req.body.transactions) ? (req.body.transactions as Array<Record<string, unknown>>) : null;
  if (!transactions) {
    res.status(400).json({ message: "transactions must be an array" });
    return;
  }

  try {
    const result = await matchPromptpayTransactions(
      transactions.map((item) => ({
        transactionId: typeof item.transactionId === "string" ? item.transactionId : null,
        amountCents: Number(item.amountCents),
        occurredAt: typeof item.occurredAt === "string" ? item.occurredAt : null,
        referenceCode: typeof item.referenceCode === "string" ? item.referenceCode : null,
        note: typeof item.note === "string" ? item.note : null
      })),
      req.authUser?.id
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "match transactions ไม่สำเร็จ" });
  }
});

app.post("/api/internal/promptpay/match-transactions", async (req, res) => {
  if (req.header("x-cron-secret") !== env.cronSecret) {
    res.status(403).json({ message: "forbidden" });
    return;
  }

  const transactions = Array.isArray(req.body.transactions) ? (req.body.transactions as Array<Record<string, unknown>>) : null;
  if (!transactions) {
    res.status(400).json({ message: "transactions must be an array" });
    return;
  }

  try {
    const result = await matchPromptpayTransactions(
      transactions.map((item) => ({
        transactionId: typeof item.transactionId === "string" ? item.transactionId : null,
        amountCents: Number(item.amountCents),
        occurredAt: typeof item.occurredAt === "string" ? item.occurredAt : null,
        referenceCode: typeof item.referenceCode === "string" ? item.referenceCode : null,
        note: typeof item.note === "string" ? item.note : null
      }))
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "internal match transactions ไม่สำเร็จ" });
  }
});

app.post("/api/internal/kbiz/match-statement", async (req, res) => {
  if (req.header("x-cron-secret") !== env.cronSecret) {
    res.status(403).json({ message: "forbidden" });
    return;
  }

  const fileName = typeof req.body.fileName === "string" ? req.body.fileName : undefined;

  try {
    const rows = Array.isArray(req.body.rows)
      ? req.body.rows
      : typeof req.body.text === "string"
        ? parseKbizStatementText(req.body.text, fileName)
        : Array.isArray(req.body.transactions)
          ? req.body.transactions
          : null;

    if (!rows) {
      res.status(400).json({ message: "rows, transactions, or text is required" });
      return;
    }

    const normalized = normalizeKbizStatementRows(rows);
    if (normalized.transactions.length === 0) {
      res.status(400).json({
        message: "ไม่พบรายการธุรกรรม K-Biz ที่พร้อมจับคู่",
        normalized: 0,
        skipped: normalized.skipped,
        warnings: normalized.warnings
      });
      return;
    }

    const result = await matchPromptpayTransactions(normalized.transactions);
    res.json({
      normalized: normalized.transactions.length,
      skipped: normalized.skipped,
      warnings: normalized.warnings,
      result
    });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "internal kbiz match ไม่สำเร็จ" });
  }
});

app.get("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  const order = await getOrderForUser(String(req.params.id), req.authUser!.id, true);
  if (!order) {
    res.status(404).json({ message: "ไม่พบออเดอร์" });
    return;
  }

  res.json(order);
});

app.post("/api/admin/orders/:id/manual-review", requireAdmin, async (req, res) => {
  try {
    res.json(
      await updateAdminOrderStatus(
        String(req.params.id),
        "manual_review",
        req.authUser?.id,
        typeof req.body.note === "string" ? req.body.note : undefined
      )
    );
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "manual review failed" });
  }
});

app.post("/api/admin/orders/:id/refund", requireAdmin, async (req, res) => {
  try {
    res.json(
      await refundOrderByAdmin(
        String(req.params.id),
        req.authUser?.id,
        typeof req.body.note === "string" ? req.body.note : undefined
      )
    );
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "refund order failed" });
  }
});

app.post("/api/admin/orders/:id/manual-fulfill", requireAdmin, async (req, res) => {
  try {
    res.json(
      await updateAdminOrderStatus(
        String(req.params.id),
        "fulfilled",
        req.authUser?.id,
        typeof req.body.note === "string" ? req.body.note : undefined
      )
    );
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "manual fulfill failed" });
  }
});

app.post("/api/admin/orders/:id/retry", requireAdmin, async (req, res) => {
  try {
    res.json(
      await updateAdminOrderStatus(
        String(req.params.id),
        "processing",
        req.authUser?.id,
        typeof req.body.note === "string" ? req.body.note : undefined
      )
    );
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "retry order failed" });
  }
});

app.post("/api/admin/orders/:id/manual-fulfill", requireAdmin, async (req, res) => {
  await db
    .update(orders)
    .set({
      status: "fulfilled",
      notes: String(req.body.note ?? "ปิดงานด้วยมือจากหลังบ้าน"),
      updatedAt: now()
    })
    .where(eq(orders.id, String(req.params.id)));
  res.json({ ok: true });
});

app.post("/api/admin/orders/:id/retry", requireAdmin, async (req, res) => {
  await db
    .update(orders)
    .set({
      status: "processing",
      notes: String(req.body.note ?? "สั่ง retry จากหลังบ้าน"),
      updatedAt: now()
    })
    .where(eq(orders.id, String(req.params.id)));
  res.json({ ok: true });
});

app.get("/api/admin/providers", requireAdmin, async (_req, res) => {
  res.json(await getAdminProviders());
});

app.put("/api/admin/providers/:providerKey", requireAdmin, async (req, res) => {
  const providerKey = String(req.params.providerKey);
  if (!isProviderKey(providerKey)) {
    res.status(404).json({ message: "unknown provider" });
    return;
  }

  try {
    await upsertAdminProviderConfig(providerKey, {
      isEnabled: Boolean(req.body.isEnabled),
      configJson: String(req.body.configJson ?? "{}"),
      actorUserId: req.authUser?.id
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "invalid provider config" });
  }
});

app.post("/api/admin/providers/:providerKey/sync", requireAdmin, async (req, res) => {
  const providerKey = String(req.params.providerKey);
  if (!isProviderKey(providerKey)) {
    res.status(404).json({ message: "unknown provider" });
    return;
  }

  res.json(await syncProvider(providerKey));
});

app.get("/api/admin/webhooks", requireAdmin, async (_req, res) => {
  res.json(await db.select().from(webhookEvents).orderBy(desc(webhookEvents.createdAt)));
});

app.get("/api/admin/inventory", requireAdmin, async (_req, res) => {
  res.json(await getAdminInventorySummary());
});

app.get("/api/admin/inventory/items", requireAdmin, async (req, res) => {
  const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;
  res.json(await getAdminInventoryItems(productId));
});

app.post("/api/admin/inventory/items", requireAdmin, async (req, res) => {
  const payload = req.body as {
    productId?: string;
    kind?: "code" | "download_link" | "account" | "generic";
    maskedLabel?: string;
    payload?: string;
  };

  const id = await createAdminInventoryItem({
    productId: String(payload.productId ?? ""),
    kind: payload.kind ?? "code",
    maskedLabel: payload.maskedLabel ?? null,
    payload: String(payload.payload ?? ""),
    actorUserId: req.authUser!.id
  });

  res.status(201).json({ id });
});

app.put("/api/admin/inventory/items/:id", requireAdmin, async (req, res) => {
  const payload = req.body as {
    productId?: string;
    kind?: "code" | "download_link" | "account" | "generic";
    maskedLabel?: string;
    payload?: string;
  };

  await updateAdminInventoryItem(String(req.params.id), {
    productId: String(payload.productId ?? ""),
    kind: payload.kind ?? "code",
    maskedLabel: payload.maskedLabel ?? null,
    payload: String(payload.payload ?? ""),
    actorUserId: req.authUser!.id
  });

  res.json({ ok: true });
});

app.delete("/api/admin/inventory/items/:id", requireAdmin, async (req, res) => {
  await deleteAdminInventoryItem(String(req.params.id), req.authUser!.id);
  res.json({ ok: true });
});

app.post("/api/admin/inventory/import", requireAdmin, async (req, res) => {
  const payload = req.body as {
    productId?: string;
    kind?: "code" | "download_link" | "account" | "generic";
    rawText?: string;
  };

  const count = await importInventoryBatch(
    String(payload.productId ?? ""),
    payload.kind ?? "code",
    String(payload.rawText ?? "").split(/\r?\n/),
    req.authUser!.id
  );

  res.status(201).json({ imported: count });
});

app.get("/api/admin/jobs", requireAdmin, async (_req, res) => {
  res.json(await getJobsList());
});

app.post("/api/admin/jobs/:id/requeue", requireAdmin, async (req, res) => {
  await requeueJob(String(req.params.id));
  res.json({ ok: true });
});

app.post("/api/webhooks/wepay", async (req, res) => {
  const referenceCode = String(req.body.referenceCode ?? req.body.reference ?? "");
  if (!referenceCode) {
    res.status(400).json({ message: "missing referenceCode" });
    return;
  }

  res.json({ ok: await settlePaymentByReference(referenceCode, "wepay", req.body) });
});

app.post("/api/webhooks/wepay/order-update", async (req, res) => {
  const wepay = await getProviderConfigSnapshot("wepay");
  const configuredSecret =
    typeof wepay.config.callbackSecret === "string" && wepay.config.callbackSecret.trim()
      ? wepay.config.callbackSecret.trim()
      : null;
  const suppliedSecret = String(req.header("x-provider-secret") ?? req.body.callbackSecret ?? "");

  if (configuredSecret && suppliedSecret !== configuredSecret) {
    res.status(403).json({ message: "invalid callback secret" });
    return;
  }

  const rawStatus = String(req.body.status ?? "").trim();
  if (!rawStatus) {
    res.status(400).json({ message: "missing status" });
    return;
  }
  const status = mapWepayStatus(rawStatus);

  const result = await applyProviderOrderUpdate({
    providerKey: "wepay",
    orderId: typeof req.body.orderId === "string" ? req.body.orderId : null,
    providerOrderId: typeof req.body.providerOrderId === "string" ? req.body.providerOrderId : null,
    status,
    note: typeof req.body.note === "string" ? req.body.note : `Wepay callback status=${rawStatus}`,
    payload: { ...req.body, normalizedStatus: status },
    deliveryPayload: typeof req.body.deliveryPayload === "string" ? req.body.deliveryPayload : null
  });

  res.status(result.ok ? 200 : 404).json(result);
});

app.post("/api/webhooks/promptpay", async (req, res) => {
  const rawBody = (req as express.Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
  const timestamp = String(req.header("x-cip-timestamp") ?? "");
  const signature = String(req.header("x-cip-signature") ?? "");
  const promptpay = await getPromptpayConfigForWebhook();

  if (!timestamp || !signature) {
    res.status(400).json({ message: "missing webhook signature headers" });
    return;
  }

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) {
    res.status(400).json({ message: "invalid timestamp" });
    return;
  }

  const ageMs = Math.abs(Date.now() - timestampNumber);
  if (ageMs > 5 * 60 * 1000) {
    res.status(400).json({ message: "timestamp expired" });
    return;
  }

  if (!verifyWebhookSignature(promptpay.config.webhookSecret, timestamp, rawBody, signature)) {
    res.status(403).json({ message: "invalid signature" });
    return;
  }

  const referenceCode = String(req.body.referenceCode ?? req.body.reference ?? "");
  const amountCents = parseWebhookAmountCents(req.body.amountCents ?? req.body.amount ?? req.body.uniqueAmountCents);

  if (!referenceCode || amountCents === null) {
    res.status(400).json({ message: "missing referenceCode or amount" });
    return;
  }

  const result = await settlePaymentByReferenceWithAmount(referenceCode, "promptpay", amountCents, req.body);
  res.status(result.ok ? 200 : 400).json(result);
});

app.post("/api/webhooks/truemoney", async (req, res) => {
  const truemoney = await getProviderConfigSnapshot("truemoney");
  const configuredSecret =
    typeof truemoney.config.callbackSecret === "string" && truemoney.config.callbackSecret.trim()
      ? truemoney.config.callbackSecret.trim()
      : null;
  const suppliedSecret = String(req.header("x-provider-secret") ?? req.body.callbackSecret ?? "");

  if (configuredSecret && suppliedSecret !== configuredSecret) {
    res.status(403).json({ message: "invalid callback secret" });
    return;
  }

  const referenceCode = String(req.body.referenceCode ?? req.body.reference ?? "");
  if (!referenceCode) {
    res.status(400).json({ message: "missing referenceCode" });
    return;
  }

  const normalizedStatus = mapTruemoneyPaymentStatus(req.body.status ?? req.body.result ?? req.body.paymentStatus);
  if (normalizedStatus !== "paid") {
    res.status(202).json({
      ok: true,
      ignored: true,
      status: normalizedStatus,
      referenceCode
    });
    return;
  }

  const amountCents = parseWebhookAmountCents(req.body.amountCents ?? req.body.amount ?? req.body.redeemedAmount);
  const result =
    amountCents === null
      ? { ok: await settlePaymentByReference(referenceCode, "truemoney", { ...req.body, normalizedStatus }) }
      : await settlePaymentByReferenceWithAmount(referenceCode, "truemoney", amountCents, {
          ...req.body,
          normalizedStatus
        });

  res.status(result.ok ? 200 : 400).json(result);
});

app.post("/api/webhooks/24payseller", async (req, res) => {
  const referenceCode = String(req.body.referenceCode ?? req.body.reference ?? "");
  if (!referenceCode) {
    res.status(400).json({ message: "missing referenceCode" });
    return;
  }

  res.json({ ok: await settlePaymentByReference(referenceCode, "24payseller", req.body) });
});

app.post("/api/webhooks/24payseller/order-update", async (req, res) => {
  const pays24Seller = await getProviderConfigSnapshot("24payseller");
  const configuredSecret =
    typeof pays24Seller.config.callbackSecret === "string" && pays24Seller.config.callbackSecret.trim()
      ? pays24Seller.config.callbackSecret.trim()
      : null;
  const suppliedSecret = String(req.header("x-provider-secret") ?? req.body.callbackSecret ?? "");

  if (configuredSecret && suppliedSecret !== configuredSecret) {
    res.status(403).json({ message: "invalid callback secret" });
    return;
  }

  const rawStatus = String(req.body.status ?? "").trim();
  if (!rawStatus) {
    res.status(400).json({ message: "missing status" });
    return;
  }

  const status = map24PaysellerStatus(rawStatus);
  const deliveryPayloadCandidate =
    typeof req.body.deliveryPayload === "string"
      ? req.body.deliveryPayload
      : req.body.credentials ?? req.body.credential ?? req.body.account ?? null;
  const deliveryPayload =
    typeof deliveryPayloadCandidate === "string"
      ? deliveryPayloadCandidate
      : deliveryPayloadCandidate && typeof deliveryPayloadCandidate === "object"
        ? JSON.stringify(deliveryPayloadCandidate, null, 2)
        : null;

  const result = await applyProviderOrderUpdate({
    providerKey: "24payseller",
    orderId: typeof req.body.orderId === "string" ? req.body.orderId : null,
    providerOrderId:
      typeof req.body.providerOrderId === "string"
        ? req.body.providerOrderId
        : typeof req.body.refId === "string"
          ? req.body.refId
          : typeof req.body.referenceId === "string"
            ? req.body.referenceId
            : null,
    status,
    note: typeof req.body.note === "string" ? req.body.note : `24Payseller callback status=${rawStatus}`,
    payload: { ...req.body, normalizedStatus: status },
    deliveryPayload
  });

  res.status(result.ok ? 200 : 404).json(result);
});

app.post("/api/webhooks/peamsub24hr/order-update", async (req, res) => {
  const peamsub24hr = await getProviderConfigSnapshot("peamsub24hr");
  const configuredSecret =
    typeof peamsub24hr.config.callbackSecret === "string" && peamsub24hr.config.callbackSecret.trim()
      ? peamsub24hr.config.callbackSecret.trim()
      : null;
  const suppliedSecret = String(req.header("x-provider-secret") ?? req.body.callbackSecret ?? "");

  if (configuredSecret && suppliedSecret !== configuredSecret) {
    res.status(403).json({ message: "invalid callback secret" });
    return;
  }

  const rawStatus = String(req.body.status ?? "").trim();
  if (!rawStatus) {
    res.status(400).json({ message: "missing status" });
    return;
  }

  const status = mapPeamsub24hrStatus(rawStatus);
  const deliveryPayloadCandidate =
    typeof req.body.deliveryPayload === "string"
      ? req.body.deliveryPayload
      : req.body.credentials ??
        (req.body.accountEmail || req.body.accountPassword
          ? {
              email: req.body.accountEmail ?? null,
              password: req.body.accountPassword ?? null
            }
          : null);
  const deliveryPayload =
    typeof deliveryPayloadCandidate === "string"
      ? deliveryPayloadCandidate
      : deliveryPayloadCandidate && typeof deliveryPayloadCandidate === "object"
        ? JSON.stringify(deliveryPayloadCandidate, null, 2)
        : null;

  const result = await applyProviderOrderUpdate({
    providerKey: "peamsub24hr",
    orderId: typeof req.body.orderId === "string" ? req.body.orderId : null,
    providerOrderId:
      typeof req.body.providerOrderId === "string"
        ? req.body.providerOrderId
        : typeof req.body.subscriptionId === "string"
          ? req.body.subscriptionId
          : null,
    status,
    note: typeof req.body.note === "string" ? req.body.note : `Peamsub24hr callback status=${rawStatus}`,
    payload: { ...req.body, normalizedStatus: status },
    deliveryPayload
  });

  res.status(result.ok ? 200 : 404).json(result);
});

app.post("/api/internal/cron/process-jobs", async (req, res) => {
  if (req.header("x-cron-secret") !== env.cronSecret) {
    res.status(403).json({ message: "forbidden" });
    return;
  }

  res.json({ processed: await processPendingJobs() });
});

app.post("/api/internal/cron/cleanup-otps", async (req, res) => {
  if (req.header("x-cron-secret") !== env.cronSecret) {
    res.status(403).json({ message: "forbidden" });
    return;
  }

  await cleanupExpiredOtps();
  res.json({ ok: true });
});

app.post("/api/internal/cron/cleanup-payment-intents", async (req, res) => {
  if (req.header("x-cron-secret") !== env.cronSecret) {
    res.status(403).json({ message: "forbidden" });
    return;
  }

  res.json({ expired: await cleanupExpiredPaymentIntents() });
});

app.post("/api/internal/cron/provider-sync", async (req, res) => {
  if (req.header("x-cron-secret") !== env.cronSecret) {
    res.status(403).json({ message: "forbidden" });
    return;
  }

  const results = await syncEnabledProviders();
  res.json({
    ok: results.every((item) => item.ok),
    count: results.length,
    results
  });
});

app.post("/api/dev/settle-payment/:id", async (req, res) => {
  if (isProduction) {
    res.status(404).json({ message: "not found" });
    return;
  }

  const settled = await settlePaymentIntentById(String(req.params.id), "dev-local", {
    source: "dev-local",
    body: req.body
  });
  res.json({ ok: settled });
});

app.use(express.static(publicDir));
app.get("/{*path}", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    next();
    return;
  }

  res.sendFile(path.join(publicDir, "index.html"), (error) => {
    if (error) {
      res.status(404).send("Frontend build not found");
    }
  });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดภายในระบบ" });
});

app.listen(env.port, () => {
  console.log(`API ready at ${env.apiUrl}`);
});
