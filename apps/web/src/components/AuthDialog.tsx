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
    title: "กลับเข้าสู่ระบบเพื่อจัดการออเดอร์และวอลเลต",
    body: "หน้าต่างเดียวสำหรับล็อกอิน สมัครสมาชิก และรีเซ็ตรหัสผ่าน โดยคง flow เดิมของผู้ใช้ไว้ตลอด"
  },
  register: {
    title: "สร้างบัญชีแล้วไปต่อใน checkout ได้ทันที",
    body: "หลังสมัครสำเร็จ ระบบจะต่อ session ให้พร้อมใช้งานต่อโดยไม่ทำให้ลูกค้าหลุดจากหน้าที่กำลังดูอยู่"
  },
  "forgot-request": {
    title: "ขอ OTP เพื่อรีเซ็ตรหัสผ่านอย่างรวดเร็ว",
    body: "ออกแบบมาให้กู้บัญชีได้ใน modal เดียว ลดการเปลี่ยนหน้าและช่วยให้การทดสอบบน localhost เร็วขึ้น"
  },
  "forgot-verify": {
    title: "ยืนยัน OTP แล้วตั้งรหัสผ่านใหม่",
    body: "เมื่อรีเซ็ตรหัสผ่านสำเร็จ ระบบจะปิด session เดิมเพื่อเพิ่มความปลอดภัย แล้วพากลับสู่หน้าล็อกอิน"
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
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/28 px-4 py-8 backdrop-blur-md"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        <motion.div
          animate={{ y: 0, opacity: 1, scale: 1 }}
          className="panel-strong relative grid w-full max-w-6xl overflow-hidden rounded-[2.4rem] lg:grid-cols-[0.94fr_1.06fr]"
          exit={{ y: 12, opacity: 0, scale: 0.985 }}
          initial={{ y: 22, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
        >
          <div className="hero-grid relative overflow-hidden border-b border-[var(--line)] bg-[linear-gradient(180deg,rgba(227,244,248,0.8),rgba(255,255,255,0.94))] px-6 py-8 lg:border-b-0 lg:border-r lg:px-8 lg:py-10">
            <div className="ambient-orb ambient-orb--a left-[-4rem] top-12 h-36 w-36" />
            <div className="ambient-orb ambient-orb--b right-[-2rem] top-0 h-36 w-36" />

            <div className="relative">
              <div className="section-label">Unified Access Layer</div>
              <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight text-slate-950">{modeMeta.title}</h2>
              <p className="mt-4 max-w-md text-sm leading-7 muted-text">{modeMeta.body}</p>

              <div className="mt-8 space-y-3">
                {[
                  { icon: Sparkles, text: "รวม Login, Register และ Forgot Password ไว้ใน flow เดียว" },
                  { icon: ShieldCheck, text: "รองรับ OTP reset, session refresh และ redirect กลับหน้าที่ใช้งาน" },
                  { icon: LockKeyhole, text: "พร้อมต่อยอด social login และ email verification ในรอบถัดไป" }
                ].map(({ icon: Icon, text }) => (
                  <div className="panel-soft flex items-center gap-3 rounded-[1.3rem] px-4 py-4 text-sm text-slate-700" key={text}>
                    <Icon className="text-[var(--brand)]" size={16} />
                    {text}
                  </div>
                ))}
              </div>

              <div className="mt-8 inline-flex rounded-full border border-[var(--line)] bg-white/80 p-1">
                {(["login", "register"] as const).map((item) => (
                  <button
                    className={`rounded-full px-4 py-2 text-sm transition ${authMode === item ? "bg-[var(--text)] text-white" : "text-slate-600"}`}
                    key={item}
                    onClick={() => setMode(item)}
                    type="button"
                  >
                    {modeLabels[item]}
                  </button>
                ))}
              </div>

              {pendingRedirectPath ? (
                <div className="panel-soft mt-6 rounded-[1.3rem] px-4 py-4 text-sm text-slate-700">
                  หลังล็อกอินสำเร็จ ระบบจะพาคุณกลับไปที่ <strong className="text-slate-950">{pendingRedirectPath}</strong>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative px-6 py-8 lg:px-8 lg:py-10">
            <button className="secondary-button absolute right-5 top-5 rounded-full px-4 py-2 text-sm" onClick={closeAuth} type="button">
              ปิด
            </button>

            <div className="max-w-xl">
              <div className="section-label">{modeLabels[authMode]}</div>
              <div className="mt-3 text-2xl font-semibold text-slate-950">
                {authMode === "login"
                  ? "เข้าสู่ระบบเพื่อสั่งซื้อและติดตามออเดอร์"
                  : authMode === "register"
                    ? "สร้างบัญชีใหม่แล้วใช้งานต่อได้ทันที"
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
                    <span className="mb-2 block text-sm text-slate-700">ชื่อที่ใช้แสดง</span>
                    <input className="input-field" name="displayName" placeholder="เช่น Nok เติมเกม" required />
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-700">อีเมล</span>
                  <input className="input-field" defaultValue={forgotEmail} name="email" placeholder="you@example.com" required type="email" />
                </label>

                {authMode === "login" || authMode === "register" ? (
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-700">รหัสผ่าน</span>
                    <input
                      className="input-field"
                      name="password"
                      onChange={(event) => setDraftPassword(event.target.value)}
                      placeholder="อย่างน้อย 8 ตัวอักษร"
                      required
                      type="password"
                    />
                  </label>
                ) : null}

                {authMode === "register" ? (
                  <div className="panel-soft rounded-[1.4rem] px-4 py-4">
                    <div className="flex items-center justify-between gap-3 text-sm muted-text">
                      <span>Password strength</span>
                      <span className="font-medium text-slate-900">{strength.label}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand),var(--accent))] transition-all" style={{ width: strength.width }} />
                    </div>
                  </div>
                ) : null}

                {authMode === "forgot-verify" ? (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm text-slate-700">OTP 6 หลัก</span>
                      <input className="input-field" name="otp" placeholder="123456" required />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm text-slate-700">รหัสผ่านใหม่</span>
                      <input
                        className="input-field"
                        name="newPassword"
                        onChange={(event) => setDraftPassword(event.target.value)}
                        placeholder="อย่างน้อย 8 ตัวอักษร"
                        required
                        type="password"
                      />
                    </label>
                  </>
                ) : null}

                {error ? <div className="rounded-[1.4rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
                {otpPreview ? (
                  <div className="rounded-[1.4rem] bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    OTP สำหรับโหมดพัฒนา: <strong>{otpPreview}</strong>
                  </div>
                ) : null}

                <button className="primary-button w-full rounded-full px-5 py-3 text-sm font-medium" disabled={isPending} type="submit">
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

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm muted-text">
                {authMode === "login" ? <span>ยังไม่มีบัญชี?</span> : authMode === "register" ? <span>มีบัญชีแล้ว?</span> : <span>กลับไปหน้าเข้าสู่ระบบ</span>}
                {authMode === "login" ? (
                  <button className="font-medium text-[var(--brand)]" onClick={() => setMode("register")} type="button">
                    สมัครสมาชิก
                  </button>
                ) : (
                  <button className="font-medium text-[var(--brand)]" onClick={() => setMode("login")} type="button">
                    กลับไปล็อกอิน
                  </button>
                )}
                {authMode === "login" ? (
                  <button className="text-slate-500" onClick={() => setMode("forgot-request")} type="button">
                    ลืมรหัสผ่าน
                  </button>
                ) : null}
                {authMode === "forgot-verify" ? (
                  <button className="text-slate-500" onClick={() => openAuth("forgot-request")} type="button">
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
