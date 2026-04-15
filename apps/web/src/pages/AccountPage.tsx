import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, LockKeyhole, PackageSearch, ReceiptText, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
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

type AuthSessionRow = {
  id: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

const authNotes = [
  {
    icon: ShieldCheck,
    text: "ระบบใช้ session cookie แบบ httpOnly และ hash token ก่อนเก็บลงฐานข้อมูล"
  },
  {
    icon: LockKeyhole,
    text: "เมื่อรหัสผ่านถูกรีเซ็ตหรือเปลี่ยน ระบบจะล้าง session เดิมเพื่อกันการใช้งานต่อจากอุปกรณ์เก่า"
  },
  {
    icon: Sparkles,
    text: "หน้า account ดึงรายการ session จริงจาก backend เพื่อให้ผู้ใช้ปิด session ที่ไม่ต้องการได้"
  }
];

function formatMoney(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB"
  }).format(cents / 100);
}

export function AccountPage() {
  const { changePassword, openAuth, session, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [amountBaht, setAmountBaht] = useState("100");
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
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
  const sessionsQuery = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: () => apiFetch<AuthSessionRow[]>("/api/auth/sessions"),
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

  const changePasswordMutation = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) => changePassword(input),
    onSuccess: async () => {
      setSecurityMessage("เปลี่ยนรหัสผ่านสำเร็จ และรีเฟรช session ปัจจุบันให้แล้ว");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] })
      ]);
    },
    onError: (error) => {
      setSecurityMessage(error instanceof Error ? error.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    }
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch<void>(`/api/auth/sessions/${sessionId}`, {
        method: "DELETE"
      }),
    onSuccess: async () => {
      setSecurityMessage("อัปเดตรายการ session แล้ว");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] })
      ]);
    },
    onError: (error) => {
      setSecurityMessage(error instanceof Error ? error.message : "ปิด session ไม่สำเร็จ");
    }
  });

  if (!user) {
    return (
      <div className="panel rounded-[2rem] p-6">
        <p className="text-lg font-semibold text-slate-950">ต้องเข้าสู่ระบบก่อน</p>
        <p className="mt-2 text-sm muted-text">ใช้บัญชีเดโมหรือสมัครใหม่เพื่อทดสอบ wallet ประวัติคำสั่งซื้อ และหน้าจัดการบัญชี</p>
        <button className="primary-button mt-4 rounded-full px-4 py-2 text-sm" onClick={() => openAuth("login")}>
          เปิดหน้าล็อกอิน
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
        <section className="panel rounded-[2.5rem] p-6">
          <div className="section-head">
            <div className="section-head__icon">
              <WalletCards size={18} />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm text-[var(--brand)]">
              Wallet ของ {user.displayName}
            </div>
          </div>
          <div className="mt-4 text-4xl font-semibold text-slate-950">{formatMoney(balanceQuery.data?.balanceCents ?? user.walletBalanceCents)}</div>
          <p className="mt-2 text-sm muted-text">ใช้สำหรับทดสอบการซื้อด้วย Wallet และติดตามผลลัพธ์หลังสร้าง payment intent บน localhost</p>

          <div className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-700">จำนวนเงินที่ต้องการเติม</span>
              <input className="input-field" onChange={(event) => setAmountBaht(event.target.value)} value={amountBaht} />
            </label>
            <button className="primary-button w-full rounded-full px-4 py-3 text-sm" onClick={() => void topupMutation.mutate()}>
              สร้างรายการเติมเงิน PromptPay
            </button>
            {topupMutation.data ? (
              <div className="rounded-[1.4rem] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                สร้าง Payment Intent แล้ว: {topupMutation.data.paymentIntentId}
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel rounded-[2.5rem] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="section-head">
                <div className="section-head__icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="section-label">Security Center</div>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">บัญชีและความปลอดภัย</h2>
              <p className="mt-2 text-sm muted-text">จัดการรหัสผ่าน ดู session ที่ยังเปิดอยู่ และตรวจสอบวันหมดอายุของ session ปัจจุบันได้จากหน้าเดียว</p>
            </div>
            <div className="panel-soft rounded-[1.4rem] px-4 py-3 text-sm text-slate-700">
              <div>{user.email}</div>
              <div className="mt-1 text-xs muted-text">Session ปัจจุบันหมดอายุ {session ? new Date(session.expiresAt).toLocaleString("th-TH") : "-"}</div>
            </div>
          </div>

          <form
            className="mt-6 grid gap-3 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              setSecurityMessage(null);
              void changePasswordMutation.mutate({
                currentPassword: String(formData.get("currentPassword") ?? ""),
                newPassword: String(formData.get("newPassword") ?? "")
              });
              event.currentTarget.reset();
            }}
          >
            <input className="input-field" name="currentPassword" placeholder="รหัสผ่านปัจจุบัน" required type="password" />
            <input className="input-field" name="newPassword" placeholder="รหัสผ่านใหม่" required type="password" />
            <button className="primary-button rounded-full px-4 py-3 text-sm" type="submit">
              เปลี่ยนรหัสผ่าน
            </button>
          </form>

          {securityMessage ? <div className="mt-4 rounded-[1.4rem] bg-[var(--brand-soft)] px-4 py-3 text-sm text-[var(--brand-strong)]">{securityMessage}</div> : null}

          <div className="mt-6 grid gap-3">
            {sessionsQuery.data?.map((item) => (
              <div className="panel-soft rounded-[1.5rem] px-4 py-4" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                      <ShieldCheck size={16} /> {item.current ? "อุปกรณ์นี้" : "Session อื่น"}
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.25em] text-slate-400">created {new Date(item.createdAt).toLocaleString("th-TH")}</div>
                    <div className="mt-1 text-sm muted-text">หมดอายุ {new Date(item.expiresAt).toLocaleString("th-TH")}</div>
                  </div>
                  {!item.current ? (
                    <button className="secondary-button rounded-full px-4 py-2 text-xs" onClick={() => void revokeSessionMutation.mutate(item.id)} type="button">
                      ปิด session นี้
                    </button>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs text-emerald-700">กำลังใช้งาน</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <section className="panel rounded-[2.5rem] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="section-head">
                <div className="section-head__icon">
                  <PackageSearch size={18} />
                </div>
                <div className="section-label">Orders</div>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">ประวัติการสั่งซื้อ</h2>
            </div>
            <Link className="text-sm muted-text" to="/">
              กลับไปเลือกสินค้า
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {ordersQuery.data?.map((order) => (
              <button className="panel-soft card-hover block w-full rounded-[1.5rem] px-4 py-4 text-left" key={order.id} onClick={() => setSearchParams({ order: order.id })} type="button">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                      <ReceiptText size={15} className="text-[var(--brand)]" />
                      {order.id}
                    </div>
                    <div className="mt-1 text-sm muted-text">{new Date(order.createdAt).toLocaleString("th-TH")}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">{formatMoney(order.totalCents)}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--brand)]">{order.status}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="panel rounded-[2.5rem] p-6">
          <div className="section-head">
            <div className="section-head__icon">
              <ReceiptText size={18} />
            </div>
            <div className="section-label">Order Detail</div>
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">รายละเอียดคำสั่งซื้อ</h2>
          {!selectedOrderId ? <p className="mt-4 text-sm muted-text">เลือกออเดอร์จากรายการด้านซ้ายเพื่อดูรายละเอียด</p> : null}

          {orderDetailQuery.data ? (
            <div className="mt-5 space-y-4">
              <div className="panel-soft rounded-[1.5rem] px-4 py-4">
                <div className="text-sm muted-text">{orderDetailQuery.data.id}</div>
                <div className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(orderDetailQuery.data.totalCents)}</div>
                <div className="mt-2 text-sm muted-text">สถานะ: {orderDetailQuery.data.status}</div>
                <div className="text-sm muted-text">วิธีชำระ: {orderDetailQuery.data.paymentMethod}</div>
                {orderDetailQuery.data.notes ? <div className="mt-2 text-sm muted-text">หมายเหตุ: {orderDetailQuery.data.notes}</div> : null}
              </div>

              {orderDetailQuery.data.paymentIntent ? (
                <div className="rounded-[1.5rem] bg-amber-50 px-4 py-4 text-sm text-amber-700">
                  <div>Reference: {orderDetailQuery.data.paymentIntent.referenceCode}</div>
                  <div>ยอดโอนเฉพาะ: {formatMoney(orderDetailQuery.data.paymentIntent.uniqueAmountCents)}</div>
                  <div>สถานะชำระ: {orderDetailQuery.data.paymentIntent.status}</div>
                  {orderDetailQuery.data.paymentIntent.status === "pending" ? (
                    <button className="primary-button mt-3 rounded-full px-4 py-2 text-xs" onClick={() => void settleMutation.mutate(orderDetailQuery.data.paymentIntent!.id)} type="button">
                      จำลองชำระเงินบน localhost
                    </button>
                  ) : null}
                </div>
              ) : null}

              {orderDetailQuery.data.items.map((item) => (
                <div className="panel-soft rounded-[1.5rem] px-4 py-4" key={item.id}>
                  <div className="text-sm muted-text">สินค้า #{item.productId}</div>
                  <div className="mt-2 text-sm text-slate-700">จำนวน: {item.quantity}</div>
                  <div className="text-sm text-slate-700">ราคาต่อชิ้น: {formatMoney(item.unitPriceCents)}</div>
                  {item.deliveryPayload ? (
                    <pre className="mt-3 overflow-auto rounded-2xl bg-[var(--text)] px-4 py-3 text-xs text-slate-100">{item.deliveryPayload}</pre>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="panel rounded-[2.5rem] p-6">
          <div className="inline-flex items-center gap-2 text-sm section-label">
            <CreditCard size={16} /> Wallet Activity
          </div>
          <div className="mt-4 space-y-3">
            {balanceQuery.data?.transactions.map((transaction) => (
              <div className="panel-soft rounded-[1.5rem] px-4 py-4" key={transaction.id}>
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
          <div className="inline-flex items-center gap-2 text-sm section-label">
            <LockKeyhole size={16} /> Auth Notes
          </div>
          <div className="mt-4 grid gap-3">
            {authNotes.map(({ icon: Icon, text }) => (
              <div className="panel-soft rounded-[1.5rem] px-4 py-4 text-sm muted-text" key={text}>
                <div className="info-row">
                  <Icon className="info-row__icon" size={16} />
                  <span>{text}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
