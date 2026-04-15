import { AnimatePresence, motion } from "framer-motion";
import { LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { type AuthDialogMode, useAuth } from "../auth";

const modeLabels: Record<AuthDialogMode, string> = {
  login: "เข้าสู่ระบบ",
  register: "สมัครสมาชิก",
  "forgot-request": "ขอ OTP",
  "forgot-verify": "ยืนยัน OTP"
};

const modeCopy: Record<AuthDialogMode, { title: string; body: string }> = {
  login: {
    title: "กลับเข้าสู่ storefront ของคุณ",
    body: "เข้าถึงคำสั่งซื้อ wallet และการตั้งค่าบัญชีจาก auth flow เดียวที่ออกแบบให้เร็ว ชัด และพร้อมใช้งานจริง"
  },
  register: {
    title: "สมัครแล้วเข้าใช้งานได้ทันที",
    body: "หลังสร้างบัญชี ระบบจะออก session ให้ทันทีเพื่อพาคนใช้ต่อไปยัง checkout หรือหน้าที่กำลังเปิดค้างอยู่แบบไม่สะดุด"
  },
  "forgot-request": {
    title: "กู้รหัสผ่านโดยไม่หลุดจากประสบการณ์เดิม",
    body: "ขอ OTP จากหน้าต่างเดียวกัน แล้วกลับเข้าสู่ระบบต่อได้ทันทีโดยไม่ต้องเปลี่ยนหน้า"
  },
  "forgot-verify": {
    title: "ยืนยัน OTP แล้วตั้งรหัสผ่านใหม่",
    body: "เมื่อรีเซ็ตรหัสผ่านสำเร็จ ระบบจะล้าง session เดิมให้เพื่อความปลอดภัย แล้วพากลับสู่ขั้นตอนล็อกอินอีกครั้ง"
  }
};

function getPasswordStrength(password: string) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length;

  if (score >= 5) {
    return { label: "แข็งแรงมาก", width: "100%" };
  }

  if (score >= 4) {
    return { label: "แข็งแรง", width: "80%" };
  }

  if (score >= 3) {
    return { label: "พอใช้", width: "60%" };
  }

  return { label: "ควรเพิ่มความซับซ้อน", width: "35%" };
}

export function AuthDialog() {
  const {
    authMode,
    closeAuth,
    isAuthOpen,
    login,
    openAuth,
    pendingRedirectPath,
    register,
    requestPasswordReset,
    setAuthMode,
    verifyPasswordReset
  } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [forgotEmail, setForgotEmail] = useState("");
  const [draftPassword, setDraftPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isAuthOpen) {
    return null;
  }

  const modeMeta = modeCopy[authMode];
  const strength = getPasswordStrength(draftPassword);

  const setMode = (mode: AuthDialogMode) => {
    setError(null);
    if (mode !== "forgot-verify") {
      setOtpPreview(null);
    }
    setAuthMode(mode);
  };

  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#020817]/78 px-4 py-8 backdrop-blur-xl"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        <motion.div
          animate={{ y: 0, opacity: 1, scale: 1 }}
          className="relative grid w-full max-w-6xl overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#07111d] shadow-[0_40px_120px_rgba(0,0,0,0.55)] lg:grid-cols-[0.95fr_1.05fr]"
          exit={{ y: 12, opacity: 0, scale: 0.985 }}
          initial={{ y: 22, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(105,240,208,0.08),transparent_32%,rgba(255,138,106,0.12))]" />

          <div className="relative overflow-hidden border-b border-white/8 px-6 py-8 lg:border-b-0 lg:border-r lg:px-8 lg:py-10">
            <div className="absolute -left-10 top-16 h-36 w-36 rounded-full bg-[rgba(105,240,208,0.16)] blur-3xl" />
            <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[rgba(255,138,106,0.16)] blur-3xl" />

            <div className="relative">
              <div className="eyebrow">Unified Access Layer</div>
              <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight text-white">{modeMeta.title}</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">{modeMeta.body}</p>

              <div className="mt-8 space-y-3">
                {[
                  { icon: Sparkles, text: "Login และ Register อยู่ใน flow เดียวกัน พร้อม redirect กลับไปหน้าที่ตั้งใจใช้งาน" },
                  { icon: ShieldCheck, text: "รองรับ OTP reset, session refresh และจัดการอุปกรณ์ที่ยังล็อกอินอยู่ได้" },
                  { icon: LockKeyhole, text: "เตรียมต่อยอด social login, onboarding และ email verification ได้ต่อทันที" }
                ].map(({ icon: Icon, text }) => (
                  <div className="flex items-center gap-3 rounded-[1.3rem] border border-white/8 bg-white/5 px-4 py-4 text-sm text-slate-200" key={text}>
                    <Icon className="text-[var(--brand)]" size={16} />
                    {text}
                  </div>
                ))}
              </div>

              <div className="mt-8 inline-flex rounded-full border border-white/10 bg-black/18 p-1">
                {(["login", "register"] as const).map((item) => (
                  <button
                    className={`rounded-full px-4 py-2 text-sm transition ${authMode === item ? "bg-white text-slate-950" : "text-slate-300"}`}
                    key={item}
                    onClick={() => setMode(item)}
                    type="button"
                  >
                    {modeLabels[item]}
                  </button>
                ))}
              </div>

              {pendingRedirectPath ? (
                <div className="mt-6 rounded-[1.3rem] border border-white/8 bg-white/5 px-4 py-4 text-sm text-slate-300">
                  หลังล็อกอินสำเร็จ ระบบจะพาคุณกลับไปที่ <strong className="text-white">{pendingRedirectPath}</strong>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative px-6 py-8 lg:px-8 lg:py-10">
            <button
              className="absolute right-5 top-5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200"
              onClick={closeAuth}
              type="button"
            >
              ปิด
            </button>

            <div className="max-w-xl">
              <div className="eyebrow">{modeLabels[authMode]}</div>
              <div className="mt-3 text-2xl font-semibold text-white">
                {authMode === "login"
                  ? "เข้าสู่ระบบเพื่อสั่งซื้อและติดตามออเดอร์"
                  : authMode === "register"
                    ? "สร้างบัญชีใหม่แล้วเดินต่อใน flow เดิมได้ทันที"
                    : authMode === "forgot-request"
                      ? "กรอกอีเมลเพื่อรับ OTP"
                      : "ใส่ OTP พร้อมรหัสผ่านใหม่"}
              </div>

              <form
                className="mt-8 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const email = String(formData.get("email") ?? forgotEmail).trim();
                  const password = String(formData.get("password") ?? "");
                  const displayName = String(formData.get("displayName") ?? "");
                  const otp = String(formData.get("otp") ?? "");
                  const newPassword = String(formData.get("newPassword") ?? "");

                  setError(null);
                  startTransition(async () => {
                    try {
                      if (authMode === "login") {
                        await login({ email, password });
                        return;
                      }

                      if (authMode === "register") {
                        await register({ email, password, displayName });
                        return;
                      }

                      if (authMode === "forgot-request") {
                        const result = await requestPasswordReset({ email });
                        setForgotEmail(email);
                        setOtpPreview(result.previewOtp ?? null);
                        setMode("forgot-verify");
                        return;
                      }

                      await verifyPasswordReset({ email, otp, newPassword });
                      setForgotEmail(email);
                      setDraftPassword("");
                    } catch (cause) {
                      setError(cause instanceof Error ? cause.message : "เกิดข้อผิดพลาด");
                    }
                  });
                }}
              >
                {authMode === "register" ? (
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-300">ชื่อที่ใช้แสดง</span>
                    <input
                      className="w-full rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                      name="displayName"
                      placeholder="เช่น Nok เติมเกม"
                      required
                    />
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">อีเมล</span>
                  <input
                    className="w-full rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                    defaultValue={forgotEmail}
                    name="email"
                    placeholder="you@example.com"
                    required
                    type="email"
                  />
                </label>

                {authMode === "login" || authMode === "register" ? (
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-300">รหัสผ่าน</span>
                    <input
                      className="w-full rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                      name="password"
                      onChange={(event) => setDraftPassword(event.target.value)}
                      placeholder="อย่างน้อย 8 ตัวอักษร"
                      required
                      type="password"
                    />
                  </label>
                ) : null}

                {authMode === "register" ? (
                  <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4">
                    <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
                      <span>Password strength</span>
                      <span className="text-white">{strength.label}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand),var(--brand-2))] transition-all"
                        style={{ width: strength.width }}
                      />
                    </div>
                  </div>
                ) : null}

                {authMode === "forgot-verify" ? (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm text-slate-300">OTP 6 หลัก</span>
                      <input
                        className="w-full rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                        name="otp"
                        placeholder="123456"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm text-slate-300">รหัสผ่านใหม่</span>
                      <input
                        className="w-full rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                        name="newPassword"
                        onChange={(event) => setDraftPassword(event.target.value)}
                        placeholder="อย่างน้อย 8 ตัวอักษร"
                        required
                        type="password"
                      />
                    </label>
                  </>
                ) : null}

                {error ? <div className="rounded-[1.4rem] bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
                {otpPreview ? (
                  <div className="rounded-[1.4rem] bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    OTP สำหรับโหมดพัฒนา: <strong>{otpPreview}</strong>
                  </div>
                ) : null}

                <button
                  className="w-full rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950"
                  disabled={isPending}
                  type="submit"
                >
                  {isPending
                    ? "กำลังดำเนินการ..."
                    : authMode === "login"
                      ? "เข้าสู่ระบบ"
                      : authMode === "register"
                        ? "สมัครและเริ่มใช้งาน"
                        : authMode === "forgot-request"
                          ? "ส่ง OTP"
                          : "ยืนยันและเปลี่ยนรหัสผ่าน"}
                </button>
              </form>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                {authMode === "login" ? <span>ยังไม่มีบัญชี?</span> : authMode === "register" ? <span>มีบัญชีแล้ว?</span> : <span>กลับไปหน้าเข้าสู่ระบบ</span>}
                {authMode === "login" ? (
                  <button className="text-[var(--brand)]" onClick={() => setMode("register")} type="button">
                    สมัครสมาชิก
                  </button>
                ) : (
                  <button className="text-[var(--brand)]" onClick={() => setMode("login")} type="button">
                    กลับไปล็อกอิน
                  </button>
                )}
                {authMode === "login" ? (
                  <button className="text-slate-300" onClick={() => setMode("forgot-request")} type="button">
                    ลืมรหัสผ่าน
                  </button>
                ) : null}
                {authMode === "forgot-verify" ? (
                  <button className="text-slate-300" onClick={() => openAuth("forgot-request")} type="button">
                    ขอ OTP ใหม่
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
