import { createHash, timingSafeEqual } from "node:crypto";

import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";

import { env, isProduction } from "../config/env";
import { db } from "../db";
import { sessions, users } from "../db/schema";
import { now } from "./time";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: "customer" | "admin";
  walletBalanceCents: number;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      authSession?: {
        id: string;
        userId: string;
        expiresAt: Date;
      };
    }
  }
}

const cookieName = "cip_session";
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 7;
const sessionRefreshThresholdMs = 1000 * 60 * 60 * 24;

export function hashSessionToken(token: string) {
  return createHash("sha256").update(`${env.sessionSecret}:${token}`).digest("hex");
}

export function sessionExpiresAtFrom(baseDate = new Date()) {
  return new Date(baseDate.getTime() + sessionLifetimeMs);
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    expires: expiresAt
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(cookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction
  });
}

export async function attachAuthUser(req: Request, res: Response, next: NextFunction) {
  const rawToken = req.cookies[cookieName];
  if (typeof rawToken !== "string" || !rawToken) {
    next();
    return;
  }

  const token = hashSessionToken(rawToken);
  if (!token) {
    next();
    return;
  }

  const [session] = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.delete(sessions).where(eq(sessions.id, session.id));
    }
    clearSessionCookie(res);
    next();
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) {
    next();
    return;
  }

  req.authUser = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    walletBalanceCents: user.walletBalanceCents
  };
  req.authSession = {
    id: session.id,
    userId: session.userId,
    expiresAt: session.expiresAt
  };

  if (session.expiresAt.getTime() - Date.now() < sessionRefreshThresholdMs) {
    const refreshedExpiresAt = sessionExpiresAtFrom(now());
    await db.update(sessions).set({ expiresAt: refreshedExpiresAt }).where(eq(sessions.id, session.id));
    setSessionCookie(res, rawToken, refreshedExpiresAt);
    req.authSession.expiresAt = refreshedExpiresAt;
  }

  next();
}

export function isCurrentSessionToken(rawToken: string | undefined, hashedToken: string) {
  if (!rawToken) {
    return false;
  }

  const candidate = Buffer.from(hashSessionToken(rawToken));
  const target = Buffer.from(hashedToken);
  return candidate.length === target.length && timingSafeEqual(candidate, target);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser) {
    res.status(401).json({ message: "กรุณาเข้าสู่ระบบ" });
    return;
  }

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser || req.authUser.role !== "admin") {
    res.status(403).json({ message: "สำหรับผู้ดูแลเท่านั้น" });
    return;
  }

  next();
}
