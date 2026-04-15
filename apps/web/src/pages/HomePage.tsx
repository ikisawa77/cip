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
    title: "พร้อมขายสินค้าหลายรูปแบบ",
    body: "รองรับทั้งโค้ดเกม ลิงก์ดาวน์โหลด เติมเกมอัตโนมัติ Wallet และ flow ที่ต่อยอด provider จริงได้ทันที"
  },
  {
    title: "หลังบ้านพร้อมใช้งานต่อ",
    body: "มี inventory, provider config, queue jobs และเอกสารภาษาไทยสำหรับส่งต่องานข้ามเครื่อง"
  },
  {
    title: "ออกแบบให้อ่านง่ายและตัดสินใจไว",
    body: "จัดหมวดสินค้าให้สแกนง่าย ลดสิ่งรบกวนบนหน้าร้าน และพาลูกค้าไปสู่การซื้อได้ชัดขึ้น"
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
    <div className="space-y-8 pb-8">
      <section className="hero-grid panel overflow-hidden rounded-[2.75rem] px-6 py-8 md:px-10 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="max-w-3xl">
            <motion.div className="chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-[var(--brand)]" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <Sparkles size={16} /> ทดสอบบน localhost และต่อยอดขึ้น Nokhosting ได้
            </motion.div>

            <motion.h1
              className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              ร้านเติมเกมและดิจิทัลกูดส์ที่ดูสะอาด ใช้ง่าย และพร้อมขายจริง
            </motion.h1>

            <motion.p className="mt-4 max-w-2xl text-base leading-8 muted-text md:text-lg" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              ใช้ฟอนต์ Prompt ทั้งระบบ จัดโครงหน้าใหม่ให้อ่านง่ายขึ้น ลดสีที่รบกวนสายตา และยังคง flow สำคัญอย่าง catalog, auth, wallet, order และ admin ไว้ครบ
            </motion.p>

            <motion.div className="mt-6 flex flex-wrap gap-3" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <a className="primary-button rounded-full px-5 py-3 text-sm font-medium" href="#catalog">
                ดูหมวดสินค้าทั้งหมด
              </a>
              <Link className="secondary-button rounded-full px-5 py-3 text-sm font-medium" to="/admin">
                เปิดหลังบ้านตัวอย่าง
              </Link>
            </motion.div>

            <motion.div className="mt-8 flex flex-wrap gap-4 text-sm muted-text" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
              {trustPoints.map(({ icon: Icon, label }) => (
                <div className="inline-flex items-center gap-2" key={label}>
                  <Icon size={16} className="text-[var(--brand)]" />
                  {label}
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div className="grid gap-4" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }}>
            <div className="panel-soft rounded-[2rem] p-5">
              <div className="section-label">Quick Search</div>
              <label className="relative mt-4 block">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="input-field rounded-full px-11 py-3 text-sm"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหาสินค้า หมวด หรือคำอธิบาย"
                  value={search}
                />
              </label>

              <div className="mt-5 grid gap-3">
                {featuredProducts.length > 0 ? (
                  featuredProducts.map((product) => (
                    <Link className="panel card-hover flex items-center justify-between rounded-[1.4rem] px-4 py-4" key={product.id} to={`/product/${product.slug}`}>
                      <div>
                        <div className="text-sm muted-text">{product.type}</div>
                        <div className="mt-1 text-base font-medium text-slate-900">{product.name}</div>
                      </div>
                      <div className="inline-flex items-center gap-2 text-sm text-[var(--brand)]">
                        {formatMoney(product.priceCents)} <ArrowRight size={15} />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="panel rounded-[1.4rem] px-4 py-4 text-sm muted-text">กำลังโหลดรายการสินค้า...</div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {supportPoints.map((item, index) => (
          <motion.article
            className="panel-soft rounded-[2rem] px-5 py-6"
            initial={{ opacity: 0, y: 24 }}
            transition={{ delay: index * 0.06 }}
            viewport={{ once: true, amount: 0.35 }}
            whileInView={{ opacity: 1, y: 0 }}
            key={item.title}
          >
            <div className="section-label">Support {String(index + 1).padStart(2, "0")}</div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 muted-text">{item.body}</p>
          </motion.article>
        ))}
      </section>

      <section className="panel rounded-[2rem] px-5 py-5" id="catalog">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="section-label">Catalog</div>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950">หมวดสินค้าแบบชัดและสแกนง่าย</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 muted-text">
              แต่ละหมวดถูกจัดวางให้เห็นสินค้าเด่นก่อน แล้วค่อยอ่านรายละเอียดตามต้องการ ช่วยให้ทั้งฝั่งลูกค้าและแอดมินเข้าใจโครงร้านได้เร็วขึ้น
            </p>
          </div>
          <div className="text-sm muted-text">{deferredSearch ? `กำลังกรองด้วยคำว่า "${search}"` : "พร้อมสำหรับการทดสอบ flow สั่งซื้อบน localhost"}</div>
        </div>
      </section>

      <div className="space-y-6">
        <AnimatePresence initial={false}>
          {categories.map((category, categoryIndex) => (
            <motion.section
              className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]"
              initial={{ opacity: 0, y: 32 }}
              transition={{ duration: 0.35, delay: categoryIndex * 0.04 }}
              viewport={{ once: true, amount: 0.2 }}
              whileInView={{ opacity: 1, y: 0 }}
              key={category.id}
            >
              <div className="panel-soft rounded-[2rem] p-5">
                <div className="section-label">Category</div>
                <h3 className="mt-3 text-3xl font-semibold text-slate-950">{category.name}</h3>
                <p className="mt-3 text-sm leading-7 muted-text">{category.description ?? "หมวดนี้พร้อมต่อยอด flow สินค้าและ checkout ได้ทันที"}</p>
                <div className="mt-8 text-sm muted-text">{category.products.length} รายการที่แสดง</div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {category.products.length > 0 ? (
                  category.products.map((product, productIndex) => (
                    <motion.article
                      className="panel card-hover overflow-hidden rounded-[2rem]"
                      initial={{ opacity: 0, y: 18 }}
                      transition={{ delay: productIndex * 0.04 }}
                      viewport={{ once: true, amount: 0.3 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      key={product.id}
                    >
                      {product.coverImage ? (
                        <div className="h-52 overflow-hidden bg-slate-100">
                          <img alt={product.name} className="h-full w-full object-cover transition duration-700 hover:scale-[1.03]" src={product.coverImage} />
                        </div>
                      ) : null}
                      <div className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">{product.type}</div>
                            <h4 className="mt-2 text-xl font-semibold text-slate-950">{product.name}</h4>
                          </div>
                          {product.badge ? (
                            <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-medium text-[var(--brand)]">{product.badge}</span>
                          ) : null}
                        </div>

                        <p className="text-sm leading-7 muted-text">{product.description}</p>

                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <div className="text-2xl font-semibold text-slate-950">{formatMoney(product.priceCents)}</div>
                            {product.compareAtCents ? (
                              <div className="text-sm text-slate-400 line-through">{formatMoney(product.compareAtCents)}</div>
                            ) : null}
                          </div>
                          <Link className="primary-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm" to={`/product/${product.slug}`}>
                            ดูรายละเอียด <ArrowRight size={16} />
                          </Link>
                        </div>
                      </div>
                    </motion.article>
                  ))
                ) : (
                  <div className="panel-soft rounded-[1.8rem] px-5 py-10 text-sm muted-text">ไม่พบสินค้าที่ตรงกับคำค้นในหมวดนี้</div>
                )}
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
