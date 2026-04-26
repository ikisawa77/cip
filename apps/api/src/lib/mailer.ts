import nodemailer from "nodemailer";

import { env, isProduction } from "../config/env.js";

export async function sendOtpEmail(email: string, otp: string) {
  if (!env.smtpHost || !env.smtpUser) {
    if (!isProduction) {
      console.log(`[DEV OTP] ${email}: ${otp}`);
      return;
    }

    throw new Error("SMTP is not configured");
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPassword
    }
  });

  await transporter.sendMail({
    from: `"${env.smtpFromName}" <${env.smtpFromEmail}>`,
    to: email,
    subject: "OTP รีเซ็ตรหัสผ่าน",
    html: `<p>รหัส OTP ของคุณคือ <strong>${otp}</strong></p><p>รหัสนี้ใช้ได้ 10 นาที</p>`
  });
}
