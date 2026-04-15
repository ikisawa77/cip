import path from "node:path";
import { fileURLToPath } from "node:url";

import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import cors from "cors";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import express from "express";

import {
  authChangePasswordSchema,
  authLoginSchema,
  authRegisterSchema,
  createOrderSchema,
  forgotPasswordRequestSchema,
  forgotPasswordVerifySchema,
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
import { sendOtpEmail } from "./lib/mailer";
import { minutesFromNow, now } from "./lib/time";
import { isProviderKey } from "./providers/registry";
import {
  cleanupExpiredOtps,
  createAdminCategory,
  createAdminInventoryItem,
  countActiveSessions,
  createOrder,
  createWalletTopup,
  deleteAdminCategory,
  deleteAdminInventoryItem,
  getAdminCategories,
  getAdminDashboard,
  getAdminInventoryItems,
  getAdminInventorySummary,
  getAdminProviders,
  getCatalog,
  getJobsList,
  getOrderForUser,
  getOrdersForUser,
  getProductBySlug,
  getWalletTransactionsForUser,
  importInventoryBatch,
  processPendingJobs,
  requeueJob,
  settlePaymentByReference,
  settlePaymentIntentById,
  syncEnabledProviders,
  syncProvider,
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
app.use(express.json());
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

app.post("/api/wallet/topup-intents", requireAuth, async (req, res) => {
  const input = walletTopupSchema.parse(req.body);
  const paymentIntentId = await createWalletTopup(req.authUser!.id, input);
  res.status(201).json({ paymentIntentId });
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
    res.status(201).json(await createOrder(req.authUser!.id, input));
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "สร้างออเดอร์ไม่สำเร็จ" });
  }
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
    type: payload.type as "TOPUP_API",
    priceCents: Number(payload.priceCents),
    compareAtCents: null,
    deliveryNote: null,
    badge: null,
    coverImage: null,
    isActive: true,
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
      name: String(payload.name),
      description: String(payload.description),
      priceCents: Number(payload.priceCents),
      badge: payload.badge ? String(payload.badge) : null,
      deliveryNote: payload.deliveryNote ? String(payload.deliveryNote) : null,
      isActive: Boolean(payload.isActive),
      updatedAt: now()
    })
    .where(eq(products.id, String(req.params.id)));
  res.json({ ok: true });
});

app.get("/api/admin/orders", requireAdmin, async (_req, res) => {
  res.json(await db.select().from(orders).orderBy(desc(orders.createdAt)));
});

app.get("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  const order = await getOrderForUser(String(req.params.id), req.authUser!.id, true);
  if (!order) {
    res.status(404).json({ message: "ไม่พบออเดอร์" });
    return;
  }

  res.json(order);
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

app.post("/api/webhooks/24payseller", async (req, res) => {
  const referenceCode = String(req.body.referenceCode ?? req.body.reference ?? "");
  if (!referenceCode) {
    res.status(400).json({ message: "missing referenceCode" });
    return;
  }

  res.json({ ok: await settlePaymentByReference(referenceCode, "24payseller", req.body) });
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
