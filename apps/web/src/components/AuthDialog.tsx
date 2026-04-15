import { AnimatePresence, motion } from "framer-motion";
import { useState, useTransition } from "react";

import { useAuth } from "../auth";
import { apiFetch } from "../lib/api";

type Mode = "login" | "register" | "forgot-request" | "forgot-verify";

export function AuthDialog() {
  const { isAuthOpen, closeAuth, login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isAuthOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="panel w-full max-w-xl rounded-[2rem] p-6"
          initial={{ y: 24, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 16, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 240, damping: 24 }}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-teal-700">Secure Access</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {mode === "login"
                  ? "เข้าสู่ระบบ"
                  : mode === "register"
                    ? "สมัครสมาชิก"
                    : mode === "forgot-request"
                      ? "ขอ OTP รีเซ็ตรหัสผ่าน"
                      : "ยืนยัน OTP และตั้งรหัสผ่านใหม่"}
              </h2>
            </div>
            <button className="rounded-full border border-slate-200 px-4 py-2 text-sm" onClick={closeAuth}>
              ปิด
            </button>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const payload = {
                email: String(formData.get("email") ?? forgotEmail),
                password: String(formData.get("password") ?? ""),
                displayName: String(formData.get("displayName") ?? ""),
                otp: String(formData.get("otp") ?? ""),
                newPassword: String(formData.get("newPassword") ?? "")
              };

              setError(null);
              startTransition(async () => {
                try {
                  if (mode === "login") {
                    await login({ email: payload.email, password: payload.password });
                  } else if (mode === "register") {
                    await register(payload);
                    await login({ email: payload.email, password: payload.password });
                  } else if (mode === "forgot-request") {
                    const result = await apiFetch<{ message: string; previewOtp?: string }>("/api/auth/forgot-password/request", {
                      method: "POST",
                      body: JSON.stringify({ email: payload.email })
                    });
                    setForgotEmail(payload.email);
                    setOtpPreview(result.previewOtp ?? null);
                    setMode("forgot-verify");
                  } else {
                    await apiFetch("/api/auth/forgot-password/verify", {
                      method: "POST",
                      body: JSON.stringify({
                        email: payload.email,
                        otp: payload.otp,
                        newPassword: payload.newPassword
                      })
                    });
                    setMode("login");
                    setOtpPreview(null);
                    setForgotEmail(payload.email);
                  }
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "เกิดข้อผิดพลาด");
                }
              });
            }}
          >
            {mode === "register" ? (
              <label className="block">
                <span className="mb-2 block text-sm text-slate-700">ชื่อที่ใช้แสดง</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  name="displayName"
                  placeholder="เช่น Nok เติมเกม"
                  required
                />
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm text-slate-700">อีเมล</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                defaultValue={forgotEmail}
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </label>

            {mode === "login" || mode === "register" ? (
              <label className="block">
                <span className="mb-2 block text-sm text-slate-700">รหัสผ่าน</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  name="password"
                  type="password"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  required
                />
              </label>
            ) : null}

            {mode === "forgot-verify" ? (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-700">OTP 6 หลัก</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    name="otp"
                    placeholder="123456"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-700">รหัสผ่านใหม่</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    name="newPassword"
                    type="password"
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    required
                  />
                </label>
              </>
            ) : null}

            {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            {otpPreview ? (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                OTP สำหรับโหมดพัฒนา: <strong>{otpPreview}</strong>
              </div>
            ) : null}

            <button
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
              disabled={isPending}
              type="submit"
            >
              {isPending
                ? "กำลังดำเนินการ..."
                : mode === "login"
                  ? "เข้าสู่ระบบ"
                  : mode === "register"
                    ? "สมัครและเข้าสู่ระบบ"
                    : mode === "forgot-request"
                      ? "ส่ง OTP"
                      : "ยืนยันและเปลี่ยนรหัสผ่าน"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>
              {mode === "login" ? "ยังไม่มีบัญชี?" : mode === "register" ? "มีบัญชีแล้ว?" : "กลับไปหน้าเข้าสู่ระบบ"}
            </span>
            <div className="flex items-center gap-3">
              {mode === "login" ? (
                <button className="font-medium text-slate-500" onClick={() => setMode("forgot-request")} type="button">
                  ลืมรหัสผ่าน
                </button>
              ) : null}
              <button
                className="font-medium text-teal-700"
                onClick={() =>
                  setMode((current) => (current === "login" ? "register" : current === "register" ? "login" : "login"))
                }
                type="button"
              >
                {mode === "login" ? "สมัครสมาชิก" : "กลับไปล็อกอิน"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
