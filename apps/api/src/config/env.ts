import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, "../../../");

config({ path: path.join(rootDir, ".env.local"), override: false });
config({ path: path.join(rootDir, ".env"), override: false });

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  appUrl: process.env.APP_URL ?? "http://localhost:5173",
  apiUrl: process.env.API_URL ?? "http://localhost:3001",
  port: Number(process.env.PORT ?? "3001"),
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret",
  dbHost: process.env.DB_HOST ?? "127.0.0.1",
  dbPort: Number(process.env.DB_PORT ?? "3306"),
  dbUser: process.env.DB_USER ?? "root",
  dbPassword: process.env.DB_PASSWORD ?? "",
  dbName: process.env.DB_NAME ?? "cip_local",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? "587"),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPassword: process.env.SMTP_PASSWORD ?? "",
  smtpFromName: process.env.SMTP_FROM_NAME ?? "CIP Shop",
  smtpFromEmail: process.env.SMTP_FROM_EMAIL ?? "no-reply@example.com",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD ?? "ChangeMe123!",
  cronSecret: process.env.CRON_SECRET ?? "cron-secret"
};

export const isProduction = env.nodeEnv === "production";
