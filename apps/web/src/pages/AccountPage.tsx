import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, WalletCards } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

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

type OrderListItem = {
  id: string;
  status: string;
  totalCents: number;
  createdAt: string;
};

type OrderDetail = {
  id: string;
  status: string;
  totalCents: number;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPriceCents: number;
    deliveryPayload: string | null;
  }>;
  paymentIntent: {
    id: string;
    referenceCode: string;
    status: string;
    uniqueAmountCents: number;
    expiresAt: string;
  } | null;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB"
  }).format(cents / 100);
}

export function AccountPage() {
  const { user, openAuth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [amountBaht, setAmountBaht] = useState("100");
  const queryClient = useQueryClient();
  const selectedOrderId = searchParams.get("order");

  const balanceQuery = useQuery({
    queryKey: ["wallet", "history"],
    queryFn: () => apiFetch<WalletHistory>("/api/wallet/history"),
    enabled: Boolean(user)
  });
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiFetch<OrderListItem[]>("/api/orders"),
    enabled: Boolean(user)
  });
  const orderDetailQuery = useQuery({
    queryKey: ["orders", selectedOrderId],
    queryFn: () => apiFetch<OrderDetail>(`/api/orders/${selectedOrderId}`),
    enabled: Boolean(user && selectedOrderId)
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
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["orders", selectedOrderId] }),
        queryClient.invalidateQueries({ queryKey: ["wallet", "history"] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
      ]);
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
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="panel rounded-[2.5rem] p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm text-teal-700">
            <WalletCards size={16} /> Wallet ของ {user.displayName}
          </div>
          <div className="mt-4 text-4xl font-semibold text-slate-950">
            {formatMoney(balanceQuery.data?.balanceCents ?? user.walletBalanceCents)}
          </div>
          <p className="mt-2 text-sm text-slate-600">ใช้ทดสอบซื้อสินค้าแบบส่งอัตโนมัติและ flow คำสั่งซื้อได้ทันที</p>

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
              <button
                className="block w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-left transition hover:-translate-y-0.5"
                key={order.id}
                onClick={() => setSearchParams({ order: order.id })}
                type="button"
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
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="panel rounded-[2.5rem] p-6">
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-teal-700">
            <CreditCard size={16} /> รายการ Wallet ล่าสุด
          </div>
          <div className="mt-4 space-y-3">
            {balanceQuery.data?.transactions.map((transaction) => (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4" key={transaction.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{transaction.detail}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">{transaction.type}</div>
                  </div>
                  <div className={`text-sm font-medium ${transaction.amountCents >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatMoney(transaction.amountCents)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel rounded-[2.5rem] p-6">
          <div className="text-sm uppercase tracking-[0.3em] text-teal-700">Order Detail</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">รายละเอียดคำสั่งซื้อ</h2>
          {!selectedOrderId ? <p className="mt-4 text-sm text-slate-600">เลือกออเดอร์จากรายการด้านบนเพื่อดูรายละเอียด</p> : null}

          {orderDetailQuery.data ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4">
                <div className="text-sm text-slate-500">{orderDetailQuery.data.id}</div>
                <div className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(orderDetailQuery.data.totalCents)}</div>
                <div className="mt-2 text-sm text-slate-600">สถานะ: {orderDetailQuery.data.status}</div>
                <div className="text-sm text-slate-600">วิธีชำระ: {orderDetailQuery.data.paymentMethod}</div>
                {orderDetailQuery.data.notes ? <div className="mt-2 text-sm text-slate-600">หมายเหตุ: {orderDetailQuery.data.notes}</div> : null}
              </div>

              {orderDetailQuery.data.paymentIntent ? (
                <div className="rounded-[1.5rem] bg-amber-50 px-4 py-4 text-sm text-amber-800">
                  <div>Reference: {orderDetailQuery.data.paymentIntent.referenceCode}</div>
                  <div>ยอดโอนเฉพาะ: {formatMoney(orderDetailQuery.data.paymentIntent.uniqueAmountCents)}</div>
                  <div>สถานะชำระ: {orderDetailQuery.data.paymentIntent.status}</div>
                  {orderDetailQuery.data.paymentIntent.status === "pending" ? (
                    <button
                      className="mt-3 rounded-full bg-slate-950 px-4 py-2 text-xs text-white"
                      onClick={() => void settleMutation.mutate(orderDetailQuery.data!.paymentIntent!.id)}
                      type="button"
                    >
                      จำลองชำระเงินบน localhost
                    </button>
                  ) : null}
                </div>
              ) : null}

              {orderDetailQuery.data.items.map((item) => (
                <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4" key={item.id}>
                  <div className="text-sm text-slate-500">สินค้า #{item.productId}</div>
                  <div className="mt-2 text-sm text-slate-700">จำนวน: {item.quantity}</div>
                  <div className="text-sm text-slate-700">ราคาต่อชิ้น: {formatMoney(item.unitPriceCents)}</div>
                  {item.deliveryPayload ? (
                    <pre className="mt-3 overflow-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs text-slate-100">
                      {item.deliveryPayload}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
