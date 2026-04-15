import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, CreditCard, QrCode, ShieldCheck, WalletCards } from "lucide-react";
import { useState } from "react";
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

const quickAmounts = [50, 100, 300, 500, 1000];

const topupMethods: Array<{
  id: TopupMethod;
  title: string;
  body: string;
}> = [
  {
    id: "promptpay_qr",
    title: "PromptPay QR",
    body: "เหมาะกับการทดสอบ flow สร้างยอดโอนเฉพาะและดู payment intent ทันที"
  },
  {
    id: "truemoney_gift",
    title: "TrueMoney Gift",
    body: "เตรียมโครงไว้สำหรับรับลิงก์อั่งเปาและต่อยอด provider จริงในรอบถัดไป"
  },
  {
    id: "kbiz_match",
    title: "K-Biz Match",
    body: "เหมาะกับ flow จับคู่ยอดอัตโนมัติเมื่อเปิดใช้งานกับระบบบัญชีจริง"
  }
];

function formatMoney(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB"
  }).format(cents / 100);
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

  const topupMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ paymentIntentId: string }>("/api/wallet/topup-intents", {
        method: "POST",
        body: JSON.stringify({
          amountBaht: Number(amountBaht),
          method: selectedMethod
        })
      }),
    onSuccess: async (result) => {
      setLatestIntentId(result.paymentIntentId);
      await queryClient.invalidateQueries({ queryKey: ["wallet", "history"] });
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
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
      ]);
    }
  });

  return (
    <div className="space-y-6">
      <section className="panel rounded-[2.75rem] overflow-hidden px-6 py-8 md:px-10 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-end">
          <div className="max-w-3xl">
            <div className="chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-[var(--brand)]">
              <WalletCards size={16} /> เติมเงิน Wallet จากหน้าเฉพาะ
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">หน้าเติมเงินที่แยกชัดจากการซื้อสินค้า เพื่อให้ลูกค้าใช้งานง่ายขึ้น</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 muted-text">
              เลือกจำนวนเงิน วิธีเติม และสร้าง payment intent ได้จากหน้าเดียว เหมาะกับร้านที่ต้องการให้ลูกค้าเติม Wallet ก่อนกลับไปซื้อสินค้าในหมวดต่าง ๆ
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="secondary-button rounded-full px-5 py-3 text-sm font-medium" to="/#store-categories">
                กลับไปเลือกหมวดสินค้า
              </Link>
              <Link className="primary-button rounded-full px-5 py-3 text-sm font-medium" to="/account">
                เปิดหน้าบัญชีและประวัติ
              </Link>
            </div>
          </div>

          <div className="panel-soft rounded-[2rem] p-5">
            <div className="section-label">Wallet Snapshot</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{formatMoney(walletHistoryQuery.data?.balanceCents ?? user?.walletBalanceCents ?? 0)}</div>
            <div className="mt-2 text-sm muted-text">{user ? "ยอดคงเหลือล่าสุดของบัญชีที่ล็อกอินอยู่" : "เข้าสู่ระบบเพื่อเริ่มสร้างรายการเติมเงินและดูประวัติย้อนหลัง"}</div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="panel rounded-[1.5rem] px-4 py-4 text-sm text-slate-700">
                <QrCode className="text-[var(--brand)]" size={18} />
                <div className="mt-3 font-medium text-slate-950">QR พร้อมใช้</div>
              </div>
              <div className="panel rounded-[1.5rem] px-4 py-4 text-sm text-slate-700">
                <Coins className="text-[var(--brand)]" size={18} />
                <div className="mt-3 font-medium text-slate-950">ยอดเฉพาะต่อรายการ</div>
              </div>
              <div className="panel rounded-[1.5rem] px-4 py-4 text-sm text-slate-700">
                <ShieldCheck className="text-[var(--brand)]" size={18} />
                <div className="mt-3 font-medium text-slate-950">เหมาะกับ localhost</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
        <section className="panel rounded-[2.5rem] p-6">
          <div className="section-label">Top-up Form</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">เลือกยอดและช่องทางเติมเงิน</h2>
          <p className="mt-2 text-sm muted-text">สร้างรายการเติมเงินใหม่ได้ทันที และถ้าอยู่ใน localhost สามารถจำลองการชำระเงินเพื่ออัปเดต Wallet ได้จากหน้านี้</p>

          {!user ? (
            <div className="mt-6 rounded-[1.75rem] border border-dashed border-[var(--line)] px-5 py-6 text-sm text-slate-700">
              <div className="font-medium text-slate-950">ต้องเข้าสู่ระบบก่อนจึงจะสร้างรายการเติมเงินได้</div>
              <div className="mt-2 muted-text">หลังล็อกอินแล้วกลับมาที่หน้านี้เพื่อสร้าง payment intent และทดสอบ flow เติมเงิน</div>
              <button className="primary-button mt-4 rounded-full px-5 py-3 text-sm" onClick={() => openAuth("login", "/topup")}>
                เปิดหน้าล็อกอิน
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="grid gap-3 sm:grid-cols-5">
                {quickAmounts.map((amount) => (
                  <button
                    className={`rounded-full px-4 py-3 text-sm transition ${amountBaht === String(amount) ? "bg-[var(--text)] text-white" : "secondary-button"}`}
                    key={amount}
                    onClick={() => setAmountBaht(String(amount))}
                    type="button"
                  >
                    {amount} บาท
                  </button>
                ))}
              </div>

              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-700">จำนวนเงินที่ต้องการเติม</span>
                  <input className="input-field" onChange={(event) => setAmountBaht(event.target.value)} value={amountBaht} />
                </label>

                <div className="grid gap-3">
                  {topupMethods.map((method) => (
                    <button
                      className={`rounded-[1.6rem] border px-4 py-4 text-left transition ${
                        selectedMethod === method.id ? "border-[var(--text)] bg-[var(--text)] text-white" : "border-[var(--line)] bg-white/90 text-slate-900"
                      }`}
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      type="button"
                    >
                      <div className="text-sm font-semibold">{method.title}</div>
                      <div className={`mt-2 text-sm ${selectedMethod === method.id ? "text-slate-200" : "text-slate-600"}`}>{method.body}</div>
                    </button>
                  ))}
                </div>

                <button className="primary-button rounded-full px-5 py-3 text-sm font-medium" onClick={() => void topupMutation.mutate()}>
                  สร้างรายการเติมเงิน
                </button>
              </div>

              {topupMutation.data ? (
                <div className="rounded-[1.6rem] bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  <div className="font-medium text-emerald-800">สร้าง Payment Intent แล้ว</div>
                  <div className="mt-2">รหัสรายการ: {topupMutation.data.paymentIntentId}</div>
                  <div className="mt-1">ช่องทาง: {selectedMethod}</div>
                  <div className="mt-1">ยอดที่ขอเติม: {amountBaht} บาท</div>
                  {latestIntentId ? (
                    <button className="primary-button mt-4 rounded-full px-4 py-2 text-xs" onClick={() => void settleMutation.mutate(latestIntentId)} type="button">
                      จำลองชำระเงินบน localhost
                    </button>
                  ) : null}
                </div>
              ) : null}

              {topupMutation.error instanceof Error ? (
                <div className="rounded-[1.6rem] bg-rose-50 px-4 py-4 text-sm text-rose-700">{topupMutation.error.message}</div>
              ) : null}
              {settleMutation.isSuccess ? <div className="rounded-[1.6rem] bg-[var(--brand-soft)] px-4 py-4 text-sm text-[var(--brand-strong)]">อัปเดตยอด Wallet จากการจำลองชำระเงินแล้ว</div> : null}
            </div>
          )}
        </section>

        <section className="panel rounded-[2.5rem] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="section-label">Recent Wallet Activity</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">ประวัติการเติมและการใช้งานล่าสุด</h2>
            </div>
            <Link className="text-sm text-[var(--brand)]" to="/account">
              เปิดหน้าบัญชีทั้งหมด
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {user && walletHistoryQuery.data ? (
              walletHistoryQuery.data.transactions.slice(0, 6).map((transaction) => (
                <div className="panel-soft rounded-[1.5rem] px-4 py-4" key={transaction.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{transaction.detail}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">{transaction.type}</div>
                    </div>
                    <div className={`text-sm font-medium ${transaction.amountCents >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatMoney(transaction.amountCents)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-[var(--line)] px-5 py-6 text-sm muted-text">เมื่อเข้าสู่ระบบแล้ว หน้านี้จะแสดงประวัติ Wallet ล่าสุดและรายการเติมเงินที่สร้างจากหน้านี้</div>
            )}
          </div>

          <div className="mt-6 grid gap-3">
            {[
              "เหมาะกับลูกค้าที่ต้องการเติม Wallet ก่อนเลือกซื้อสินค้าในหมวดต่าง ๆ",
              "ช่วยแยก flow เติมเงินออกจากหน้าบัญชีให้เข้าใจง่ายขึ้น โดยเฉพาะบนมือถือ",
              "สามารถต่อยอด QR จริง, ลิงก์อั่งเปา และการจับคู่ยอดอัตโนมัติได้จากหน้าเดียว"
            ].map((item) => (
              <div className="panel-soft rounded-[1.5rem] px-4 py-4 text-sm muted-text" key={item}>
                <CreditCard className="mb-2 text-[var(--brand)]" size={16} />
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
