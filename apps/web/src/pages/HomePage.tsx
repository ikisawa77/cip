import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Search, ShieldCheck, Sparkles, TimerReset, Wallet } from "lucide-react";
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

const supportPoints = [
  {
    title: "Fulfillment ที่พร้อมขายจริง",
    body: "รองรับทั้ง code, download link, wallet, top-up API และ flow ที่ต่อยอดไป production ได้"
  },
  {
    title: "หลังบ้านที่ไม่ใช่แค่เดโม",
    body: "มี inventory, provider config, queue jobs และเอกสารไทยครบสำหรับส่งต่องาน"
  },
  {
    title: "Checkout ที่ออกแบบให้ลื่น",
    body: "ลูกค้าเห็นสินค้าเร็ว ตัดสินใจง่าย และไหลไปสู่ Login, Wallet หรือ PromptPay ได้ชัด"
  }
];

const trustPoints = [
  { icon: ShieldCheck, label: "Webhook + job queue" },
  { icon: Wallet, label: "Wallet / PromptPay" },
  { icon: TimerReset, label: "พร้อมทดสอบ localhost" }
];

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

  const featuredProducts = categories.flatMap((category) => category.products).slice(0, 3);

  return (
    <div className="space-y-10 pb-8">
      <section className="relative overflow-hidden rounded-[2.7rem] border border-white/8 bg-[#07111d] px-6 py-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] md:px-10 md:py-12 lg:px-12 lg:py-14">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_34%,rgba(255,138,106,0.12)_78%,rgba(105,240,208,0.12))]" />
        <div className="absolute -right-16 top-8 h-56 w-56 rounded-full bg-[rgba(255,138,106,0.18)] blur-3xl" />
        <div className="absolute left-8 top-1/3 h-40 w-40 rounded-full bg-[rgba(105,240,208,0.14)] blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="max-w-3xl">
            <motion.div
              className="chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-slate-100"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Sparkles size={15} className="text-[var(--brand)]" />
              showroom สำหรับร้านเติมเกมยุคใหม่
            </motion.div>

            <motion.h1
              className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.05em] text-white md:text-7xl"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              เปลี่ยนหน้าแรกให้รู้สึกเหมือน
              <span className="block text-[var(--brand)]">digital arcade showroom</span>
            </motion.h1>

            <motion.p
              className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              คัดหน้าร้านให้ขายง่ายขึ้นด้วยภาพลักษณ์ที่แรงกว่าเดิม, flow login ที่ดู premium,
              และ catalog ที่จัดวางแบบ editorial แทน card grid ธรรมดา
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <a className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950" href="#catalog">
                ดูสินค้าทั้งหมด
              </a>
              <Link className="rounded-full border border-white/14 px-5 py-3 text-sm font-medium text-white" to="/admin">
                เปิดหลังบ้านตัวอย่าง
              </Link>
            </motion.div>

            <motion.div
              className="mt-8 flex flex-wrap gap-4 text-sm text-slate-300"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
            >
              {trustPoints.map(({ icon: Icon, label }) => (
                <div className="inline-flex items-center gap-2" key={label}>
                  <Icon size={16} className="text-[var(--brand)]" />
                  {label}
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            className="grid gap-4 md:grid-cols-[1.1fr_0.9fr] lg:grid-cols-1"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12 }}
          >
            <div className="rounded-[2rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
              <div className="eyebrow">Quick Search</div>
              <label className="relative mt-4 block">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="w-full rounded-full border border-white/10 bg-black/20 px-11 py-3 text-sm text-white outline-none"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหาสินค้า, หมวด, หรือคำอธิบาย"
                  value={search}
                />
              </label>
              <div className="mt-5 grid gap-3">
                {featuredProducts.map((product) => (
                  <Link
                    className="group flex items-center justify-between rounded-[1.4rem] border border-white/8 bg-black/18 px-4 py-4 transition hover:border-white/18 hover:bg-black/28"
                    key={product.id}
                    to={`/product/${product.slug}`}
                  >
                    <div>
                      <div className="text-sm text-slate-300">{product.type}</div>
                      <div className="mt-1 text-base font-medium text-white">{product.name}</div>
                    </div>
                    <div className="inline-flex items-center gap-2 text-sm text-[var(--brand)]">
                      {formatMoney(product.priceCents)} <ArrowRight size={15} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {supportPoints.map((item, index) => (
          <motion.article
            className="rounded-[2rem] border border-white/8 bg-white/4 px-5 py-6 text-slate-100 backdrop-blur-xl"
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ delay: index * 0.06 }}
            key={item.title}
          >
            <div className="eyebrow">Support {String(index + 1).padStart(2, "0")}</div>
            <h2 className="mt-3 text-2xl font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{item.body}</p>
          </motion.article>
        ))}
      </section>

      <section className="rounded-[2rem] border border-white/8 bg-white/3 px-5 py-5 backdrop-blur-xl" id="catalog">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="eyebrow">Catalog Direction</div>
            <h2 className="mt-2 text-3xl font-semibold text-white">สินค้าถูกจัดวางเป็นแถวแบบ editorial</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
              แต่ละหมวดทำหน้าที่ของตัวเองชัดเจน: อธิบาย mood, ดึงสินค้าเด่นขึ้นมา และพาไปหน้ารายละเอียดแบบไม่ต้องอ่านเยอะ
            </p>
          </div>
          <div className="text-sm text-slate-400">{deferredSearch ? `กำลังกรองด้วยคำว่า "${search}"` : "พร้อมสำหรับการขายจริงบน localhost"}</div>
        </div>
      </section>

      <div className="space-y-8">
        <AnimatePresence initial={false}>
          {categories.map((category, categoryIndex) => (
            <motion.section
              className="grid gap-6 rounded-[2.4rem] border border-white/8 bg-white/4 p-5 backdrop-blur-xl lg:grid-cols-[0.72fr_1.28fr] lg:p-6"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: categoryIndex * 0.04 }}
              key={category.id}
            >
              <div className="relative overflow-hidden rounded-[2rem] bg-[#09101d] p-5">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(105,240,208,0.12),transparent_35%,rgba(255,138,106,0.14))]" />
                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[rgba(255,138,106,0.16)] blur-3xl" />
                <div className="relative">
                  <div className="eyebrow">Category</div>
                  <h3 className="mt-3 text-3xl font-semibold text-white">{category.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{category.description ?? "หมวดนี้พร้อมต่อยอด flow สินค้าและ checkout ได้ทันที"}</p>
                  <div className="mt-8 text-sm text-slate-400">{category.products.length} products shown</div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {category.products.length > 0 ? (
                  category.products.map((product, productIndex) => (
                    <motion.article
                      className="overflow-hidden rounded-[1.8rem] border border-white/8 bg-black/18 transition hover:border-white/16 hover:bg-black/24"
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ delay: productIndex * 0.04 }}
                      key={product.id}
                    >
                      {product.coverImage ? (
                        <div className="h-52 overflow-hidden">
                          <img alt={product.name} className="h-full w-full object-cover transition duration-700 hover:scale-[1.04]" src={product.coverImage} />
                        </div>
                      ) : null}
                      <div className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">{product.type}</div>
                            <h4 className="mt-2 text-xl font-semibold text-white">{product.name}</h4>
                          </div>
                          {product.badge ? (
                            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-200">{product.badge}</span>
                          ) : null}
                        </div>

                        <p className="text-sm leading-7 text-slate-300">{product.description}</p>

                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <div className="text-2xl font-semibold text-white">{formatMoney(product.priceCents)}</div>
                            {product.compareAtCents ? (
                              <div className="text-sm text-slate-500 line-through">{formatMoney(product.compareAtCents)}</div>
                            ) : null}
                          </div>
                          <Link className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950" to={`/product/${product.slug}`}>
                            เปิดดู <ArrowRight size={16} />
                          </Link>
                        </div>
                      </div>
                    </motion.article>
                  ))
                ) : (
                  <div className="rounded-[1.8rem] border border-dashed border-white/12 px-5 py-10 text-sm text-slate-400">
                    ไม่พบสินค้าที่ตรงกับคำค้นในหมวดนี้
                  </div>
                )}
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
