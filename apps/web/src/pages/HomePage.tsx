import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { apiFetch } from "../lib/api";

type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  products: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    badge: string | null;
    type: string;
    priceCents: number;
    compareAtCents: number | null;
    coverImage: string | null;
  }>;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB"
  }).format(cents / 100);
}

export function HomePage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const catalogQuery = useQuery({
    queryKey: ["catalog"],
    queryFn: () => apiFetch<CatalogCategory[]>("/api/catalog")
  });

  const categories =
    catalogQuery.data?.map((category) => ({
      ...category,
      products: category.products.filter((product) => {
        if (!deferredSearch) {
          return true;
        }

        const haystack = `${product.name} ${product.description} ${category.name}`.toLowerCase();
        return haystack.includes(deferredSearch);
      })
    })) ?? [];

  return (
    <div className="space-y-8">
      <section className="hero-grid panel overflow-hidden rounded-[2.5rem] px-6 py-8 md:px-10 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-teal-800">
              <Sparkles size={16} /> พร้อมทดสอบบน localhost และพร้อม deploy บน Nokhosting
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              ร้านเติมเกมและขายโค้ดเกมภาษาไทย ที่พร้อมต่อยอดเป็นธุรกิจจริง
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              ครอบคลุมทั้งโค้ดเกม, ลิงก์ดาวน์โหลด, เติมเกมอัตโนมัติ, แอปพรีเมียม, ID-PASS, สุ่ม, Wallet,
              Webhook, Admin Panel และ workflow push/handoff ภาษาไทย
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white" href="#catalog">
                ดูสินค้าทั้งหมด
              </a>
              <Link className="rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700" to="/admin">
                เปิดหลังบ้านตัวอย่าง
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            {[
              ["Auto Workflow", "PromptPay, K-BIZ, webhook, และ cron jobs สำหรับ shared hosting"],
              ["Digital Fulfillment", "โค้ด, ลิงก์ดาวน์โหลด, ไอดีเกม และ random pool พร้อมส่ง"],
              ["ไทยทั้งระบบ", "เอกสาร handoff, หลังบ้าน และ flow ลูกค้าภาษาไทยครบ"]
            ].map(([title, description], index) => (
              <motion.div
                key={title}
                className="rounded-[2rem] border border-white/70 bg-white/90 p-5"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index }}
              >
                <p className="text-sm uppercase tracking-[0.3em] text-teal-700">{title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel rounded-[2rem] px-5 py-5" id="catalog">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-teal-700">Catalog</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">หมวดหมู่สินค้า</h2>
          </div>

          <label className="relative block w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full rounded-full border border-slate-200 bg-white px-11 py-3 text-sm outline-none"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาสินค้า, หมวด, หรือคำอธิบาย"
              value={search}
            />
          </label>
        </div>
      </section>

      <div className="space-y-6">
        {categories.map((category, categoryIndex) => (
          <section className="space-y-4" key={category.id}>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">{category.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{category.description}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {category.products.map((product, productIndex) => (
                <motion.article
                  className="panel overflow-hidden rounded-[2rem]"
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={product.id}
                  transition={{ delay: categoryIndex * 0.05 + productIndex * 0.04 }}
                >
                  {product.coverImage ? (
                    <div className="h-44 bg-slate-200">
                      <img alt={product.name} className="h-full w-full object-cover" src={product.coverImage} />
                    </div>
                  ) : null}
                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold text-slate-950">{product.name}</h4>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{product.description}</p>
                      </div>
                      {product.badge ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                          {product.badge}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-2xl font-semibold text-slate-950">{formatMoney(product.priceCents)}</div>
                        {product.compareAtCents ? (
                          <div className="text-sm text-slate-400 line-through">{formatMoney(product.compareAtCents)}</div>
                        ) : null}
                      </div>
                      <Link
                        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm text-white"
                        to={`/product/${product.slug}`}
                      >
                        ดูรายละเอียด <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
