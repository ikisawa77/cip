import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Coins, ShoppingBag } from "lucide-react";
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

function formatMoney(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB"
  }).format(cents / 100);
}

export function ProductPage() {
  const { slug = "" } = useParams();
  const { user, openAuth } = useAuth();
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
      })
  });

  if (productQuery.isLoading) {
    return <div className="panel rounded-[2rem] p-6">กำลังโหลดสินค้า...</div>;
  }

  if (!productQuery.data) {
    return <div className="panel rounded-[2rem] p-6">ไม่พบสินค้า</div>;
  }

  const product = productQuery.data;

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-slate-600" to="/">
        <ArrowLeft size={16} /> กลับหน้าหลัก
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel overflow-hidden rounded-[2.5rem]">
          {product.coverImage ? <img alt={product.name} className="h-full min-h-[340px] w-full object-cover" src={product.coverImage} /> : null}
        </div>

        <motion.div className="panel rounded-[2.5rem] p-6" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-teal-700">{product.type}</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">{product.name}</h1>
            </div>
            {product.badge ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{product.badge}</span>
            ) : null}
          </div>

          <p className="mt-4 text-base leading-8 text-slate-600">{product.description}</p>
          <div className="mt-5 rounded-[1.5rem] bg-slate-950 px-5 py-4 text-white">
            <div className="text-sm text-white/70">ราคาขาย</div>
            <div className="mt-1 text-3xl font-semibold">{formatMoney(product.priceCents)}</div>
          </div>

          <div className="mt-5 space-y-3 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
            <div className="flex items-center gap-2"><Coins size={16} /> สต็อกพร้อมส่ง: {product.availableStock}</div>
            {product.deliveryNote ? (
              <div className="flex items-start gap-2"><AlertCircle className="mt-0.5" size={16} /> {product.deliveryNote}</div>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
              onClick={() => {
                if (!user) {
                  openAuth();
                  return;
                }

                void orderMutation.mutateAsync("wallet");
              }}
            >
              ซื้อด้วย Wallet
            </button>
            <button
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700"
              onClick={() => {
                if (!user) {
                  openAuth();
                  return;
                }

                void orderMutation.mutateAsync("promptpay_qr");
              }}
            >
              ซื้อผ่าน PromptPay
            </button>
          </div>

          {orderMutation.isSuccess ? (
            <div className="mt-4 rounded-[1.5rem] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              สร้างออเดอร์แล้ว: {orderMutation.data.orderId}
              {orderMutation.data.paymentIntentId ? ` | Payment Intent: ${orderMutation.data.paymentIntentId}` : " | ชำระด้วย Wallet สำเร็จ"}
            </div>
          ) : null}
          {orderMutation.error instanceof Error ? (
            <div className="mt-4 rounded-[1.5rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">{orderMutation.error.message}</div>
          ) : null}

          <div className="mt-6 inline-flex items-center gap-2 text-sm text-slate-600">
            <ShoppingBag size={16} /> เหมาะสำหรับทดสอบ flow สินค้าและ checkout บน localhost
          </div>
        </motion.div>
      </div>
    </div>
  );
}
