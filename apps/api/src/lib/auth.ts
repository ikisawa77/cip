import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { sessions, users } from "../db/schema";

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
    }
  }
}

const cookieName = "cip_session";

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    expires: expiresAt
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(cookieName);
}

export async function attachAuthUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies[cookieName];
  if (!token) {
    next();
    return;
  }

  const [session] = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
  if (!session || session.expiresAt < new Date()) {
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
  next();
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
