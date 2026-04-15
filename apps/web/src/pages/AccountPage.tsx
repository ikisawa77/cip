import { useMutation, useQuery } from "@tanstack/react-query";
import { WalletCards } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth";
import { apiFetch } from "../lib/api";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB"
  }).format(cents / 100);
}

export function AccountPage() {
  const { user, openAuth } = useAuth();
  const [amountBaht, setAmountBaht] = useState("100");
  const balanceQuery = useQuery({
    queryKey: ["wallet", "history"],
    queryFn: () => apiFetch<{ balanceCents: number }>("/api/wallet/history"),
    enabled: Boolean(user)
  });
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiFetch<Array<{ id: string; status: string; totalCents: number; createdAt: string }>>("/api/orders"),
    enabled: Boolean(user)
  });
  const topupMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ paymentIntentId: string }>("/api/wallet/topup-intents", {
        method: "POST",
        body: JSON.stringify({
          amountBaht: Number(amountBaht),
          method: "promptpay_qr"
        })
      }),
    onSuccess: async () => {
      await balanceQuery.refetch();
    }
  });

  if (!user) {
    return (
      <div className="panel rounded-[2rem] p-6">
        <p className="text-lg font-semibold text-slate-950">ต้องเข้าสู่ระบบก่อน</p>
        <p className="mt-2 text-sm text-slate-600">ใช้บัญชี demo หรือสมัครใหม่เพื่อทดสอบ wallet และ order history</p>
        <button className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-sm text-white" onClick={openAuth}>
          เปิดหน้าล็อกอิน
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="panel rounded-[2.5rem] p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm text-teal-700">
          <WalletCards size={16} /> Wallet ของ {user.displayName}
        </div>
        <div className="mt-4 text-4xl font-semibold text-slate-950">
          {formatMoney(balanceQuery.data?.balanceCents ?? user.walletBalanceCents)}
        </div>
        <p className="mt-2 text-sm text-slate-600">ใช้ทดสอบซื้อสินค้าแบบส่งอัตโนมัติและ order flow ได้ทันที</p>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-700">จำนวนเงินที่ต้องการเติม</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              onChange={(event) => setAmountBaht(event.target.value)}
              value={amountBaht}
            />
          </label>
          <button className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm text-white" onClick={() => void topupMutation.mutate()}>
            สร้างรายการเติมเงิน PromptPay
          </button>
          {topupMutation.data ? (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              สร้าง Payment Intent แล้ว: {topupMutation.data.paymentIntentId}
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel rounded-[2.5rem] p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-teal-700">Orders</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">ประวัติการสั่งซื้อ</h2>
          </div>
          <Link className="text-sm text-slate-600" to="/">
            กลับไปเลือกสินค้า
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {ordersQuery.data?.map((order) => (
            <Link
              className="block rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 transition hover:-translate-y-0.5"
              key={order.id}
              to={`/account?order=${order.id}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">{order.id}</div>
                  <div className="mt-1 text-sm text-slate-500">{new Date(order.createdAt).toLocaleString("th-TH")}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-900">{formatMoney(order.totalCents)}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-teal-700">{order.status}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
