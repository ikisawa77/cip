import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Boxes, Filter, Search, Tags } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiFetch } from "../lib/api";
import { prefetchRouteForPath, scheduleRouteChunkPrefetch } from "../lib/route-prefetch";

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

export function CategoryPage() {
  const { slug = "" } = useParams();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const catalogQuery = useQuery({
    queryKey: ["catalog"],
    queryFn: () => apiFetch<CatalogCategory[]>("/api/catalog")
  });

  const category = catalogQuery.data?.find((item) => item.slug === slug) ?? null;
  const visibleProducts =
    category?.products.filter((product) => {
      if (!deferredSearch) {
        return true;
      }

      const haystack = `${product.name} ${product.description} ${product.type}`.toLowerCase();
      return haystack.includes(deferredSearch);
    }) ?? [];

  useEffect(() => {
    scheduleRouteChunkPrefetch(["product-page", "topup-page"]);
  }, []);

  if (catalogQuery.isLoading) {
    return <div className="panel rounded-[2rem] p-6">กำลังโหลดหมวดหมู่...</div>;
  }

  if (!category) {
    return (
      <div className="panel rounded-[2rem] p-6">
        <div className="text-lg font-semibold text-slate-950">ไม่พบหมวดหมู่ที่ต้องการ</div>
        <Link className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--brand)]" to="/">
          <ArrowLeft size={16} /> กลับหน้าร้าน
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm muted-text">
        <Link className="hover:text-slate-950" to="/">
          หน้าร้าน
        </Link>
        <span>/</span>
        <span className="text-slate-950">{category.name}</span>
      </nav>

      <section className="panel rounded-[2.75rem] overflow-hidden px-6 py-8 md:px-10 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div>
            <div className="section-head">
              <div className="section-head__icon">
                <Tags size={18} />
              </div>
              <div className="section-label">Category Detail</div>
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">{category.name}</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 muted-text">
              {category.description ?? "หมวดนี้ถูกจัดไว้สำหรับรวมสินค้าที่เกี่ยวข้องกัน เพื่อให้ลูกค้าเลือกและตัดสินใจได้ง่ายขึ้น"}
            </p>
            <div className="mt-5 icon-chip text-sm">
              <Boxes className="icon-chip__icon" size={15} />
              {visibleProducts.length} รายการในหมวดนี้
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="secondary-button rounded-full px-5 py-3 text-sm font-medium" to="/">
                <ArrowLeft size={16} /> กลับทุกหมวด
              </Link>
              <Link
                className="primary-button rounded-full px-5 py-3 text-sm font-medium"
                onFocus={() => prefetchRouteForPath("/topup")}
                onMouseEnter={() => prefetchRouteForPath("/topup")}
                to="/topup"
              >
                เติมเงินก่อนซื้อ
              </Link>
            </div>
          </div>

          <div className="panel-soft rounded-[2rem] p-5">
            <div className="section-head">
              <div className="section-head__icon">
                <Filter size={18} />
              </div>
              <div className="section-label">Filter In Category</div>
            </div>
            <label className="relative mt-4 block">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="input-field rounded-full px-11 py-3 text-sm"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาเฉพาะในหมวดนี้"
                value={search}
              />
            </label>
            <div className="mt-5 text-sm muted-text">กำลังแสดง {visibleProducts.length} รายการในหมวดนี้</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {visibleProducts.map((product, index) => (
          <motion.article
            className="panel card-hover overflow-hidden rounded-[2rem]"
            initial={{ opacity: 0, y: 18 }}
            transition={{ delay: index * 0.04 }}
            viewport={{ once: true, amount: 0.3 }}
            whileInView={{ opacity: 1, y: 0 }}
            key={product.id}
          >
            {product.coverImage ? (
              <div className="h-56 overflow-hidden bg-slate-100">
                <img alt={product.name} className="h-full w-full object-cover transition duration-700 hover:scale-[1.03]" src={product.coverImage} />
              </div>
            ) : null}
            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-[var(--brand)]">
                    <Tags size={13} />
                    {product.type}
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">{product.name}</h2>
                </div>
                {product.badge ? <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-medium text-[var(--brand)]">{product.badge}</span> : null}
              </div>

              <p className="text-sm leading-7 muted-text">{product.description}</p>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold text-slate-950">{formatMoney(product.priceCents)}</div>
                  {product.compareAtCents ? <div className="text-sm text-slate-400 line-through">{formatMoney(product.compareAtCents)}</div> : null}
                </div>
                <Link
                  className="primary-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
                  onFocus={() => prefetchRouteForPath(`/product/${product.slug}`)}
                  onMouseEnter={() => prefetchRouteForPath(`/product/${product.slug}`)}
                  to={`/product/${product.slug}`}
                >
                  ดูรายละเอียด <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </motion.article>
        ))}
      </section>

      {visibleProducts.length === 0 ? (
        <div className="panel-soft rounded-[2rem] px-5 py-8 text-sm muted-text">ไม่พบสินค้าที่ตรงกับคำค้นในหมวดนี้</div>
      ) : null}
    </div>
  );
}
