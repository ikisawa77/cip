import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Coins, LockKeyhole, QrCode, ShoppingBag, Tags, WalletCards } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../auth";
import { apiFetch } from "../lib/api";

type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  deliveryNote: string | null;
  badge: string | null;
  coverImage: string | null;
  type: string;
  priceCents: number;
  availableStock: number;
};

type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  products: Array<{
    id: string;
    slug: string;
    name: string;
  }>;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB"
  }).format(cents / 100);
}

export function ProductPage() {
  const { slug = "" } = useParams();
  const { user, openAuth } = useAuth();
  const queryClient = useQueryClient();
  const [confirmPaymentMethod, setConfirmPaymentMethod] = useState<"wallet" | "promptpay_qr" | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const catalogQuery = useQuery({
    queryKey: ["catalog"],
    queryFn: () => apiFetch<CatalogCategory[]>("/api/catalog")
  });
  const productQuery = useQuery({
    queryKey: ["product", slug],
    queryFn: () => apiFetch<ProductDetail>(`/api/products/${slug}`)
  });
  const orderMutation = useMutation({
    mutationFn: (paymentMethod: "wallet" | "promptpay_qr") =>
      apiFetch<{ orderId: string; paymentIntentId: string | null }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          productId: productQuery.data!.id,
          quantity: 1,
          paymentMethod,
          formInput: {}
        })
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet", "history"] }),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["product", slug] })
      ]);
    }
  });
  const confirmPasswordMutation = useMutation({
    mutationFn: (password: string) =>
      apiFetch<{ ok: boolean; message: string }>("/api/auth/confirm-password", {
        method: "POST",
        body: JSON.stringify({ password })
      })
  });

  if (productQuery.isLoading) {
    return <div className="panel rounded-[2rem] p-6">กำลังโหลดสินค้า...</div>;
  }

  if (!productQuery.data) {
    return <div className="panel rounded-[2rem] p-6">ไม่พบสินค้า</div>;
  }

  const product = productQuery.data;
  const currentCategory = catalogQuery.data?.find((category) => category.products.some((item) => item.slug === product.slug)) ?? null;

  const openConfirmDialog = (paymentMethod: "wallet" | "promptpay_qr") => {
    if (!user) {
      openAuth("login", `/product/${slug}`);
      return;
    }

    setConfirmPassword("");
    confirmPasswordMutation.reset();
    setConfirmPaymentMethod(paymentMethod);
  };

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm muted-text">
        <Link className="inline-flex items-center gap-2 hover:text-slate-950" to="/">
          <ArrowLeft size={16} /> หน้าร้าน
        </Link>
        {currentCategory ? (
          <>
            <span>/</span>
            <Link className="hover:text-slate-950" to={`/category/${currentCategory.slug}`}>
              {currentCategory.name}
            </Link>
          </>
        ) : null}
        <span>/</span>
        <span className="text-slate-950">{product.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="panel overflow-hidden rounded-[2.5rem]">
          {product.coverImage ? <img alt={product.name} className="h-full min-h-[340px] w-full object-cover" src={product.coverImage} /> : null}
        </div>

        <motion.div className="panel rounded-[2.5rem] p-6" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="section-head">
                <div className="section-head__icon">
                  <ShoppingBag size={18} />
                </div>
                <p className="section-label">{product.type}</p>
              </div>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">{product.name}</h1>
              {currentCategory ? (
                <Link className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--brand)]" to={`/category/${currentCategory.slug}`}>
                  <Tags size={15} />
                  หมวด: {currentCategory.name}
                </Link>
              ) : null}
            </div>
            {product.badge ? <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-medium text-[var(--brand)]">{product.badge}</span> : null}
          </div>

          <p className="mt-4 text-base leading-8 muted-text">{product.description}</p>
          <div className="mt-5 rounded-[1.5rem] bg-[var(--text)] px-5 py-4 text-white">
            <div className="text-sm text-white/70">ราคาขาย</div>
            <div className="mt-1 text-3xl font-semibold">{formatMoney(product.priceCents)}</div>
          </div>

          <div className="panel-soft mt-5 space-y-3 rounded-[1.5rem] px-5 py-4 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <Coins size={16} /> สต็อกพร้อมส่ง: {product.availableStock}
            </div>
            {product.deliveryNote ? (
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5" size={16} /> {product.deliveryNote}
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              className="primary-button inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
              onClick={() => {
                openConfirmDialog("wallet");
              }}
            >
              <WalletCards size={16} />
              ซื้อด้วย Wallet
            </button>
            <button
              className="secondary-button inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
              onClick={() => {
                openConfirmDialog("promptpay_qr");
              }}
            >
              <QrCode size={16} />
              ซื้อผ่าน PromptPay
            </button>
          </div>

          {orderMutation.isSuccess ? (
            <div className="mt-4 rounded-[1.5rem] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              สร้างออเดอร์แล้ว: {orderMutation.data.orderId}
              {orderMutation.data.paymentIntentId ? ` | Payment Intent: ${orderMutation.data.paymentIntentId}` : " | ชำระด้วย Wallet สำเร็จ"}
              {!orderMutation.data.paymentIntentId ? " | ระบบรีเฟรชยอด Wallet ให้แล้ว" : ""}
            </div>
          ) : null}
          {orderMutation.error instanceof Error ? <div className="mt-4 rounded-[1.5rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">{orderMutation.error.message}</div> : null}

          <div className="mt-6 inline-flex items-center gap-2 text-sm muted-text">
            <ShoppingBag size={16} /> หน้านี้พร้อมสำหรับทดสอบ flow ซื้อสินค้าและเช็กสถานะคำสั่งซื้อบน localhost
          </div>
          <div className="mt-4">
            <Link className="secondary-button inline-flex rounded-full px-4 py-2 text-sm" to="/topup">
              เติม Wallet ก่อนซื้อสินค้านี้
            </Link>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {confirmPaymentMethod ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/28 px-4 py-8 backdrop-blur-md"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
          >
            <motion.div
              animate={{ y: 0, opacity: 1, scale: 1 }}
              className="panel-strong w-full max-w-lg rounded-[2.2rem] p-6"
              exit={{ y: 12, opacity: 0, scale: 0.985 }}
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
            >
              <div className="section-head">
                <div className="section-head__icon">
                  <LockKeyhole size={18} />
                </div>
                <div className="section-label">Purchase Confirmation</div>
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">ยืนยันรหัสผ่านก่อนสั่งซื้อ</h2>
              <p className="mt-3 text-sm leading-7 muted-text">
                ระบบจะตรวจรหัสผ่านของบัญชีนี้ก่อนสร้างออเดอร์จริง เพื่อป้องกันการกดซื้อผิดหรือสั่งซื้อจากเครื่องที่ยังเปิด session ค้างไว้
              </p>

              <div className="panel-soft mt-5 rounded-[1.6rem] px-4 py-4 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span>วิธีชำระ</span>
                  <span className="font-medium text-slate-950">{confirmPaymentMethod === "wallet" ? "Wallet" : "PromptPay"}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>ราคาสินค้า</span>
                  <span className="font-medium text-slate-950">{formatMoney(product.priceCents)}</span>
                </div>
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm text-slate-700">รหัสผ่านบัญชีของคุณ</span>
                <input
                  className="input-field"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="กรอกรหัสผ่านเพื่อยืนยันการสั่งซื้อ"
                  type="password"
                  value={confirmPassword}
                />
              </label>

              {confirmPasswordMutation.error instanceof Error ? (
                <div className="mt-4 rounded-[1.4rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">{confirmPasswordMutation.error.message}</div>
              ) : null}
              {orderMutation.error instanceof Error ? (
                <div className="mt-4 rounded-[1.4rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">{orderMutation.error.message}</div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  className="primary-button rounded-full px-5 py-3 text-sm font-medium"
                  disabled={confirmPasswordMutation.isPending || orderMutation.isPending || !confirmPassword}
                  onClick={async () => {
                    try {
                      await confirmPasswordMutation.mutateAsync(confirmPassword);
                      await orderMutation.mutateAsync(confirmPaymentMethod);
                      setConfirmPaymentMethod(null);
                      setConfirmPassword("");
                    } catch {
                      return;
                    }
                  }}
                  type="button"
                >
                  {confirmPasswordMutation.isPending || orderMutation.isPending ? "กำลังยืนยัน..." : "ยืนยันและสั่งซื้อ"}
                </button>
                <button
                  className="secondary-button rounded-full px-5 py-3 text-sm font-medium"
                  onClick={() => {
                    setConfirmPaymentMethod(null);
                    setConfirmPassword("");
                    confirmPasswordMutation.reset();
                    orderMutation.reset();
                  }}
                  type="button"
                >
                  ยกเลิก
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
