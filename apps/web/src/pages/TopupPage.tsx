import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { PaymentIntentPresentation } from "@cip/shared";
import { ArrowRight, Coins, Copy, CreditCard, QrCode, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth";
import { apiFetch } from "../lib/api";

type WalletHistory = {
  balanceCents: number;
  transactions: Array<{
    id: string;
    type: string;
    amountCents: number;
    detail: string;
    createdAt: string;
  }>;
};

type TopupMethod = "promptpay_qr" | "truemoney_gift" | "kbiz_match";

type MethodCard = {
  id: TopupMethod;
  title: string;
  eyebrow: string;
  body: string;
  accent: string;
};

const quickAmounts = [50, 100, 300, 500, 1000];

const topupMethods: MethodCard[] = [
  {
    id: "promptpay_qr",
    title: "PromptPay QR",
    eyebrow: "เร็วที่สุด",
    body: "สร้างยอดชำระเฉพาะรายการและใช้ทดสอบ flow เติมเงินบน localhost ได้ทันที",
    accent: "bg-[linear-gradient(135deg,#17313b,#17718a)] text-white border-transparent"
  },
  {
    id: "truemoney_gift",
    title: "TrueMoney Gift",
    eyebrow: "พร้อมต่อยอด",
    body: "เหมาะกับร้านที่ต้องการแยก flow เติมเงินทางอั่งเปาและขยาย provider จริงในรอบถัดไป",
    accent: "bg-[linear-gradient(135deg,#ffffff,#eff7fa)] text-slate-900 border-[var(--line)]"
  },
  {
    id: "kbiz_match",
    title: "K-Biz Match",
    eyebrow: "automation",
    body: "เหมาะกับงานจับคู่ยอดอัตโนมัติเมื่อมีรายการโอนเข้าจริงและต้องการลดงานตรวจมือ",
    accent: "bg-[linear-gradient(135deg,#eef8fb,#dff1f6)] text-slate-900 border-[rgba(23,113,138,0.16)]"
  }
];

const topupSteps = [
  "เลือกจำนวนเงินที่ต้องการเติมหรือใช้ยอดด่วน",
  "เลือกช่องทางเติมเงินที่เหมาะกับลูกค้า",
  "สร้าง payment intent แล้วใช้ localhost จำลองการชำระ",
  "ตรวจยอด Wallet และประวัติล่าสุดได้ทันที"
];

function formatMoney(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB"
  }).format(cents / 100);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("th-TH");
}

export function TopupPage() {
  const { user, openAuth } = useAuth();
  const queryClient = useQueryClient();
  const [amountBaht, setAmountBaht] = useState("100");
  const [selectedMethod, setSelectedMethod] = useState<TopupMethod>("promptpay_qr");
  const [latestIntentId, setLatestIntentId] = useState<string | null>(null);

  const walletHistoryQuery = useQuery({
    queryKey: ["wallet", "history"],
    queryFn: () => apiFetch<WalletHistory>("/api/wallet/history"),
    enabled: Boolean(user)
  });

  const paymentIntentQuery = useQuery({
    queryKey: ["payment-intent", latestIntentId],
    queryFn: () => apiFetch<PaymentIntentPresentation>(`/api/payment-intents/${latestIntentId}`),
    enabled: Boolean(user && latestIntentId)
  });

  const topupMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ paymentIntentId: string; paymentIntent: PaymentIntentPresentation | null }>("/api/wallet/topup-intents", {
        method: "POST",
        body: JSON.stringify({
          amountBaht: Number(amountBaht),
          method: selectedMethod
        })
      }),
    onSuccess: async (result) => {
      setLatestIntentId(result.paymentIntentId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wallet", "history"] }),
        queryClient.invalidateQueries({ queryKey: ["payment-intent", result.paymentIntentId] })
      ]);
    }
  });

  const settleMutation = useMutation({
    mutationFn: (paymentIntentId: string) =>
      apiFetch<{ ok: boolean }>(`/api/dev/settle-payment/${paymentIntentId}`, {
        method: "POST",
        body: JSON.stringify({})
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wallet", "history"] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["payment-intent", latestIntentId] })
      ]);
    }
  });

  const selectedMethodMeta = topupMethods.find((item) => item.id === selectedMethod) ?? topupMethods[0];
  const parsedAmountBaht = Number(amountBaht) || 0;
  const previewCents = Math.max(parsedAmountBaht, 0) * 100;
  const latestTransactions = walletHistoryQuery.data?.transactions.slice(0, 5) ?? [];
  const positiveTransactions = latestTransactions.filter((item) => item.amountCents > 0).length;
  const promptpayIntent = paymentIntentQuery.data?.provider === "promptpay_qr" ? paymentIntentQuery.data : null;
  const summaryStats = useMemo(
    () => [
      {
        label: "ยอด Wallet ล่าสุด",
        value: formatMoney(walletHistoryQuery.data?.balanceCents ?? user?.walletBalanceCents ?? 0)
      },
      {
        label: "ยอดที่กำลังจะเติม",
        value: formatMoney(previewCents)
      },
      {
        label: "รายการเติมล่าสุด",
        value: `${positiveTransactions} รายการ`
      }
    ],
    [positiveTransactions, previewCents, user?.walletBalanceCents, walletHistoryQuery.data?.balanceCents]
  );

  return (
    <div className="space-y-6 pb-8">
      <section className="panel relative overflow-hidden rounded-[2.9rem] px-6 py-8 md:px-10 md:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(23,113,138,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(111,183,199,0.14),transparent_32%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-end">
          <div className="max-w-3xl">
            <motion.div className="chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-[var(--brand)]" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <WalletCards size={16} /> Wallet top-up station
            </motion.div>

            <motion.h1
              className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
            >
              เติมเงินให้รู้สึกง่ายขึ้น เหมือนเป็นขั้นตอนหลักของร้าน ไม่ใช่แค่ฟอร์มอีกหน้า
            </motion.h1>

            <motion.p className="mt-4 max-w-2xl text-base leading-8 muted-text md:text-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              หน้านี้ถูกจัดใหม่ให้ลูกค้าเข้าใจ flow เติมเงินในครั้งเดียว เห็นยอด เลือกวิธีเติม และกลับไปช้อปต่อได้ลื่นขึ้น โดยยังรองรับการทดสอบ payment intent และการจำลองชำระเงินบน localhost เหมือนเดิม
            </motion.p>

            <motion.div className="mt-6 flex flex-wrap gap-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <Link className="primary-button rounded-full px-5 py-3 text-sm font-medium" to="/#store-categories">
                กลับไปเลือกหมวดสินค้า
              </Link>
              <Link className="secondary-button rounded-full px-5 py-3 text-sm font-medium" to="/account">
                เปิดหน้าบัญชีและประวัติ
              </Link>
            </motion.div>

            <motion.div className="mt-8 grid gap-3 md:grid-cols-3" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
              {summaryStats.map((item) => (
                <div className="panel-soft rounded-[1.6rem] px-4 py-4" key={item.label}>
                  <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div className="grid gap-4" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }}>
            <div className="rounded-[2.2rem] border border-[rgba(23,113,138,0.12)] bg-[linear-gradient(160deg,#15303a_0%,#1a4250_100%)] px-5 py-5 text-white shadow-[0_30px_80px_rgba(20,52,62,0.18)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-white/55">Selected Method</div>
                  <div className="mt-2 text-2xl font-semibold">{selectedMethodMeta.title}</div>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.24em] text-white/70">{selectedMethodMeta.eyebrow}</div>
              </div>
              <p className="mt-4 text-sm leading-7 text-white/72">{selectedMethodMeta.body}</p>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <div className="text-sm text-white/55">ยอดที่เลือก</div>
                  <div className="mt-1 text-3xl font-semibold">{formatMoney(previewCents)}</div>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/8 px-4 py-3 text-right text-sm">
                  <div className="text-white/55">เหมาะกับ</div>
                  <div className="mt-1 font-medium text-white">ลูกค้าที่ต้องการเติมก่อนช้อป</div>
                </div>
              </div>
            </div>

            <div className="panel-soft rounded-[2rem] p-5">
              <div className="section-label">Flow Overview</div>
              <div className="mt-4 space-y-3">
                {topupSteps.map((step, index) => (
                  <div className="flex items-start gap-3" key={step}>
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--text)] text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <div className="text-sm leading-7 text-slate-700">{step}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <section className="panel rounded-[2.7rem] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="section-label">Top-up Form</div>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">จัดการยอดและช่องทางเติมเงินในจังหวะเดียว</h2>
            </div>
            <div className="rounded-full border border-[var(--line)] bg-white/90 px-4 py-2 text-sm text-slate-700">
              ช่องทางที่เลือก: <span className="font-semibold text-slate-950">{selectedMethodMeta.title}</span>
            </div>
          </div>

          {!user ? (
            <div className="mt-6 rounded-[2rem] border border-dashed border-[var(--line)] bg-white/70 px-5 py-6 text-sm text-slate-700">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-2 text-xs font-medium uppercase tracking-[0.2em] text-[var(--brand)]">
                <Sparkles size={14} /> access required
              </div>
              <div className="mt-4 text-xl font-semibold text-slate-950">เข้าสู่ระบบก่อนเพื่อเริ่มสร้างรายการเติมเงิน</div>
              <div className="mt-3 max-w-2xl leading-7 muted-text">หลังล็อกอินแล้ว หน้านี้จะสามารถสร้าง payment intent, จำลองชำระเงินบน localhost และดูผลลัพธ์ใน Wallet ได้ครบจากที่เดียว</div>
              <button className="primary-button mt-5 rounded-full px-5 py-3 text-sm" onClick={() => openAuth("login", "/topup")}>
                เปิดหน้าล็อกอิน
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid gap-3 md:grid-cols-5">
                {quickAmounts.map((amount) => (
                  <button
                    className={`rounded-[1.4rem] px-4 py-4 text-sm font-medium transition ${
                      amountBaht === String(amount)
                        ? "bg-[var(--text)] text-white shadow-[0_18px_36px_rgba(22,49,59,0.12)]"
                        : "panel-soft text-slate-800"
                    }`}
                    key={amount}
                    onClick={() => setAmountBaht(String(amount))}
                    type="button"
                  >
                    {amount} บาท
                  </button>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-700">จำนวนเงินที่ต้องการเติม</span>
                    <input className="input-field rounded-[1.4rem] px-4 py-4 text-base" onChange={(event) => setAmountBaht(event.target.value)} value={amountBaht} />
                  </label>

                  <div className="rounded-[1.8rem] bg-[linear-gradient(140deg,#eff8fb,#ffffff)] px-5 py-5">
                    <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">Preview</div>
                    <div className="mt-3 text-4xl font-semibold text-slate-950">{formatMoney(previewCents)}</div>
                    <div className="mt-2 text-sm leading-7 muted-text">ยอดนี้จะถูกใช้สร้าง payment intent ใหม่ตามช่องทางที่เลือกไว้ด้านขวา</div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {topupMethods.map((method) => {
                    const isSelected = selectedMethod === method.id;

                    return (
                      <button
                        className={`rounded-[1.9rem] border px-5 py-5 text-left transition ${
                          isSelected ? method.accent : "bg-white/92 text-slate-900 border-[var(--line)] hover:-translate-y-[2px]"
                        }`}
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className={`text-xs uppercase tracking-[0.24em] ${isSelected ? "text-white/65" : "text-[var(--brand)]"}`}>{method.eyebrow}</div>
                            <div className="mt-2 text-xl font-semibold">{method.title}</div>
                          </div>
                          <div className={`rounded-full px-3 py-2 text-xs font-medium ${isSelected ? "bg-white/10 text-white" : "bg-[var(--brand-soft)] text-[var(--brand)]"}`}>
                            {method.id}
                          </div>
                        </div>
                        <p className={`mt-3 text-sm leading-7 ${isSelected ? "text-white/78" : "text-slate-600"}`}>{method.body}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="primary-button rounded-full px-6 py-3 text-sm font-medium" onClick={() => void topupMutation.mutate()}>
                  สร้างรายการเติมเงิน
                </button>
                {latestIntentId ? (
                  <button className="secondary-button rounded-full px-6 py-3 text-sm font-medium" onClick={() => void settleMutation.mutate(latestIntentId)}>
                    จำลองชำระเงินบน localhost
                  </button>
                ) : null}
              </div>

              {topupMutation.data ? (
                <div className="rounded-[2rem] bg-[linear-gradient(140deg,#e9f9f3,#f7fffb)] px-5 py-5 text-sm text-emerald-700">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-emerald-700/75">Payment Intent Ready</div>
                      <div className="mt-2 text-lg font-semibold text-emerald-800">รายการเติมเงินถูกสร้างแล้ว</div>
                      <div className="mt-3 leading-7">
                        รหัสรายการ: <span className="font-medium">{topupMutation.data.paymentIntentId}</span>
                      </div>
                      <div className="leading-7">ช่องทาง: {selectedMethodMeta.title}</div>
                      <div className="leading-7">ยอดที่ขอเติม: {amountBaht} บาท</div>
                    </div>
                    <div className="rounded-[1.5rem] border border-emerald-200 bg-white/80 px-4 py-3 text-xs uppercase tracking-[0.2em] text-emerald-700">
                      พร้อมชำระ
                    </div>
                  </div>
                </div>
              ) : null}

              {promptpayIntent ? (
                <div className="grid gap-4 rounded-[2rem] border border-[rgba(23,113,138,0.14)] bg-[linear-gradient(150deg,#ffffff,#f2f9fb)] p-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="panel-soft flex items-center justify-center rounded-[1.8rem] p-4">
                    {promptpayIntent.promptpay?.qrDataUrl ? (
                      <img alt="PromptPay QR" className="h-auto w-full max-w-[280px] rounded-[1.4rem] bg-white p-3" src={promptpayIntent.promptpay.qrDataUrl} />
                    ) : (
                      <div className="rounded-[1.6rem] border border-dashed border-[var(--line)] px-5 py-8 text-center text-sm muted-text">
                        ยังไม่มี QR พร้อมใช้งาน กรุณาตั้งค่า provider `promptpay` จากหลังบ้านก่อน
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="section-label">PromptPay Checkout</div>
                    <div className="text-2xl font-semibold text-slate-950">สแกนเพื่อเติมเงินด้วยยอดเฉพาะรายการนี้</div>
                    <div className="text-sm leading-7 muted-text">
                      {promptpayIntent.promptpay?.instructions}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="panel-soft rounded-[1.4rem] px-4 py-4">
                        <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">ยอดที่ต้องโอน</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(promptpayIntent.uniqueAmountCents)}</div>
                      </div>
                      <div className="panel-soft rounded-[1.4rem] px-4 py-4">
                        <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">Reference</div>
                        <div className="mt-2 text-sm font-semibold text-slate-950">{promptpayIntent.referenceCode}</div>
                      </div>
                      <div className="panel-soft rounded-[1.4rem] px-4 py-4">
                        <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">บัญชีรับเงิน</div>
                        <div className="mt-2 text-sm font-semibold text-slate-950">{promptpayIntent.promptpay?.accountLabel}</div>
                        <div className="mt-1 text-sm text-slate-600">{promptpayIntent.promptpay?.receiverHint}</div>
                      </div>
                      <div className="panel-soft rounded-[1.4rem] px-4 py-4">
                        <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">หมดอายุ</div>
                        <div className="mt-2 text-sm font-semibold text-slate-950">{formatDate(promptpayIntent.expiresAt)}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="secondary-button inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm"
                        onClick={() => {
                          if (promptpayIntent.referenceCode) {
                            void navigator.clipboard.writeText(promptpayIntent.referenceCode);
                          }
                        }}
                        type="button"
                      >
                        <Copy size={15} />
                        คัดลอกรหัสอ้างอิง
                      </button>
                      <div className={`rounded-full px-4 py-3 text-sm font-medium ${promptpayIntent.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        สถานะ: {promptpayIntent.status === "paid" ? "ชำระแล้ว" : "รอชำระ"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {topupMutation.error instanceof Error ? <div className="rounded-[1.8rem] bg-rose-50 px-4 py-4 text-sm text-rose-700">{topupMutation.error.message}</div> : null}
              {settleMutation.isSuccess ? (
                <div className="rounded-[1.8rem] bg-[var(--brand-soft)] px-4 py-4 text-sm text-[var(--brand-strong)]">
                  อัปเดตยอด Wallet จากการจำลองชำระเงินแล้ว สามารถเปิดหน้าบัญชีหรือดูรายการล่าสุดด้านขวาได้เลย
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="panel rounded-[2.7rem] overflow-hidden p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="section-label">Wallet Snapshot</div>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950">ประวัติเติมเงินและสัญญาณล่าสุดของบัญชี</h2>
              </div>
              <Link className="text-sm font-medium text-[var(--brand)]" to="/account">
                ไปหน้าบัญชี <ArrowRight size={15} className="inline" />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[2rem] bg-[linear-gradient(150deg,#15303a,#1d4857)] px-5 py-5 text-white">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/65">
                  <WalletCards size={14} /> current balance
                </div>
                <div className="mt-3 text-4xl font-semibold">{formatMoney(walletHistoryQuery.data?.balanceCents ?? user?.walletBalanceCents ?? 0)}</div>
                <div className="mt-2 text-sm leading-7 text-white/72">ใช้ดูผลลัพธ์หลังเติมเงินหรือจำลองชำระเงินบน localhost ได้ทันทีจากหน้านี้</div>
              </div>

              <div className="grid gap-3">
                <div className="panel-soft rounded-[1.8rem] px-4 py-4">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                    <QrCode size={16} className="text-[var(--brand)]" /> รองรับยอดเฉพาะต่อรายการ
                  </div>
                  <div className="mt-2 text-sm leading-7 muted-text">เหมาะกับ flow QR และการจับคู่ยอดอัตโนมัติในรอบเชื่อม provider จริง</div>
                </div>
                <div className="panel-soft rounded-[1.8rem] px-4 py-4">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                    <ShieldCheck size={16} className="text-[var(--brand)]" /> ทดสอบ localhost ได้ทันที
                  </div>
                  <div className="mt-2 text-sm leading-7 muted-text">สร้าง intent แล้วกดจำลองชำระเพื่อเช็ก Wallet และ transaction history ได้โดยไม่ต้องออกจากหน้า</div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel rounded-[2.7rem] p-6">
            <div className="section-label">Recent Activity</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">รายการล่าสุดที่ลูกค้าจะอยากเห็นทันทีหลังเติมเงิน</h2>

            <div className="mt-5 space-y-3">
              {user && latestTransactions.length > 0 ? (
                latestTransactions.map((transaction) => (
                  <div className="panel-soft rounded-[1.6rem] px-4 py-4" key={transaction.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900">{transaction.detail}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">{transaction.type}</div>
                        <div className="mt-2 text-xs text-slate-500">{formatDate(transaction.createdAt)}</div>
                      </div>
                      <div className={`rounded-full px-3 py-2 text-sm font-medium ${transaction.amountCents >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {formatMoney(transaction.amountCents)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.8rem] border border-dashed border-[var(--line)] px-5 py-6 text-sm muted-text">
                  {user
                    ? "ยังไม่มีรายการล่าสุดให้แสดง ลองสร้าง payment intent ใหม่จากฟอร์มด้านซ้ายได้เลย"
                    : "เมื่อเข้าสู่ระบบแล้ว หน้านี้จะแสดงประวัติ Wallet ล่าสุดและรายการเติมเงินที่สร้างจากหน้านี้"}
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-3">
              {[
                "เหมาะกับลูกค้าที่ต้องการเติม Wallet ก่อนเลือกซื้อสินค้าในหมวดต่าง ๆ",
                "อ่านง่ายขึ้นบนมือถือ เพราะแยกภาพรวม ยอด และฟอร์มออกจากกันชัดเจน",
                "พร้อมต่อยอด QR จริง, ลิงก์อั่งเปา และการจับคู่ยอดอัตโนมัติจากหน้าเดียว"
              ].map((item) => (
                <div className="panel-soft rounded-[1.5rem] px-4 py-4 text-sm muted-text" key={item}>
                  <CreditCard className="mb-2 text-[var(--brand)]" size={16} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
