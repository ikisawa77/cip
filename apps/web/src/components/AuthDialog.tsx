import { AnimatePresence, motion } from "framer-motion";
import { useState, useTransition } from "react";

import { useAuth } from "../auth";

export function AuthDialog() {
  const { isAuthOpen, closeAuth, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
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
                {mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
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
                email: String(formData.get("email") ?? ""),
                password: String(formData.get("password") ?? ""),
                displayName: String(formData.get("displayName") ?? "")
              };

              setError(null);
              startTransition(async () => {
                try {
                  if (mode === "login") {
                    await login({ email: payload.email, password: payload.password });
                  } else {
                    await register(payload);
                    await login({ email: payload.email, password: payload.password });
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
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </label>

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

            {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            <button
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "กำลังดำเนินการ..." : mode === "login" ? "เข้าสู่ระบบ" : "สมัครและเข้าสู่ระบบ"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>{mode === "login" ? "ยังไม่มีบัญชี?" : "มีบัญชีแล้ว?"}</span>
            <button
              className="font-medium text-teal-700"
              onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
              type="button"
            >
              {mode === "login" ? "สมัครสมาชิก" : "กลับไปล็อกอิน"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
