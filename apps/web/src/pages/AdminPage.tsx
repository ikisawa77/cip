import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useAuth } from "../auth";
import { apiFetch } from "../lib/api";

type ProviderConfigRow = {
  id: string;
  providerKey: string;
  isEnabled: boolean;
  configJson: string;
  updatedAt: string | null;
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  totalProducts: number;
};

type ProductRow = {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string;
  type: string;
  priceCents: number;
  compareAtCents: number | null;
  deliveryNote: string | null;
  badge: string | null;
  coverImage: string | null;
  isActive: boolean;
};

type InventorySummaryRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  availableStock: number;
  allocatedStock: number;
};

type InventoryItemRow = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productType: string;
  categoryId: string | null;
  categoryName: string;
  categorySlug: string;
  kind: "code" | "download_link" | "account" | "generic";
  maskedLabel: string;
  payload: string;
  isAllocated: boolean;
  createdAt: string;
  allocatedAt: string | null;
};

type OrderRow = {
  id: string;
  status: string;
  totalCents: number;
  notes: string | null;
  createdAt: string;
};

type JobRow = {
  id: string;
  kind: string;
  status: string;
  payloadJson: string;
  updatedAt: string;
};

const inventoryKinds: Array<InventoryItemRow["kind"]> = ["code", "download_link", "account", "generic"];

const emptyCategoryForm = {
  id: null as string | null,
  slug: "",
  name: "",
  description: "",
  icon: ""
};

const emptyInventoryForm = {
  id: null as string | null,
  productId: "",
  kind: "code" as InventoryItemRow["kind"],
  maskedLabel: "",
  payload: ""
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB"
  }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("th-TH");
}

function getCategoryBadgeText(category: CategoryRow) {
  return `${category.totalProducts} สินค้า`;
}

export function AdminPage() {
  const { user, openAuth } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [providerConfigJson, setProviderConfigJson] = useState("{}");
  const [providerEnabled, setProviderEnabled] = useState(false);
  const [providerFormError, setProviderFormError] = useState<string | null>(null);
  const [providerSyncMessage, setProviderSyncMessage] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [inventoryForm, setInventoryForm] = useState(emptyInventoryForm);
  const [inventoryBulkProductId, setInventoryBulkProductId] = useState("");
  const [inventoryBulkKind, setInventoryBulkKind] = useState<InventoryItemRow["kind"]>("code");
  const [inventoryBulkPayload, setInventoryBulkPayload] = useState("");
  const [inventoryMessage, setInventoryMessage] = useState<string | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("all");
  const [inventoryProductFilter, setInventoryProductFilter] = useState("all");

  const dashboardQuery = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () =>
      apiFetch<{
        ordersCount: number;
        revenueCents: number;
        usersCount: number;
        pendingJobs: number;
      }>("/api/admin/dashboard"),
    enabled: user?.role === "admin"
  });

  const categoriesQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => apiFetch<CategoryRow[]>("/api/admin/categories"),
    enabled: user?.role === "admin"
  });

  const productsQuery = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => apiFetch<ProductRow[]>("/api/admin/products"),
    enabled: user?.role === "admin"
  });

  const providerQuery = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: () => apiFetch<ProviderConfigRow[]>("/api/admin/providers"),
    enabled: user?.role === "admin"
  });

  const orderQuery = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => apiFetch<OrderRow[]>("/api/admin/orders"),
    enabled: user?.role === "admin"
  });

  const inventoryQuery = useQuery({
    queryKey: ["admin", "inventory"],
    queryFn: () => apiFetch<InventorySummaryRow[]>("/api/admin/inventory"),
    enabled: user?.role === "admin"
  });

  const inventoryItemsQuery = useQuery({
    queryKey: ["admin", "inventory", "items"],
    queryFn: () => apiFetch<InventoryItemRow[]>("/api/admin/inventory/items"),
    enabled: user?.role === "admin"
  });

  const jobsQuery = useQuery({
    queryKey: ["admin", "jobs"],
    queryFn: () => apiFetch<JobRow[]>("/api/admin/jobs"),
    enabled: user?.role === "admin"
  });

  const providerMutation = useMutation({
    mutationFn: (providerKey: string) => {
      JSON.parse(providerConfigJson);
      return apiFetch(`/api/admin/providers/${providerKey}`, {
        method: "PUT",
        body: JSON.stringify({
          isEnabled: providerEnabled,
          configJson: providerConfigJson
        })
      });
    },
    onSuccess: async () => {
      setProviderFormError(null);
      setProviderSyncMessage("บันทึกการตั้งค่า provider เรียบร้อย");
      await queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    },
    onError: (error) => {
      setProviderFormError(error instanceof Error ? error.message : "บันทึก provider ไม่สำเร็จ");
    }
  });

  const providerSyncMutation = useMutation({
    mutationFn: (providerKey: string) =>
      apiFetch<{ providerKey: string; ok: boolean; note: string }>(`/api/admin/providers/${providerKey}/sync`, {
        method: "POST",
        body: JSON.stringify({})
      }),
    onSuccess: (result) => {
      setProviderSyncMessage(`${result.providerKey}: ${result.note}`);
    },
    onError: (error) => {
      setProviderSyncMessage(error instanceof Error ? error.message : "sync provider ไม่สำเร็จ");
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          slug: categoryForm.slug,
          name: categoryForm.name,
          description: categoryForm.description,
          icon: categoryForm.icon
        })
      }),
    onSuccess: async () => {
      setCategoryForm(emptyCategoryForm);
      setCategoryError(null);
      setCategoryMessage("เพิ่มหมวดหมู่ใหม่เรียบร้อย");
      await queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (error) => {
      setCategoryError(error instanceof Error ? error.message : "เพิ่มหมวดหมู่ไม่สำเร็จ");
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/categories/${categoryForm.id}`, {
        method: "PUT",
        body: JSON.stringify({
          slug: categoryForm.slug,
          name: categoryForm.name,
          description: categoryForm.description,
          icon: categoryForm.icon
        })
      }),
    onSuccess: async () => {
      setCategoryError(null);
      setCategoryMessage("อัปเดตหมวดหมู่เรียบร้อย");
      await queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (error) => {
      setCategoryError(error instanceof Error ? error.message : "อัปเดตหมวดหมู่ไม่สำเร็จ");
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) =>
      apiFetch(`/api/admin/categories/${categoryId}`, {
        method: "DELETE"
      }),
    onSuccess: async (_, categoryId) => {
      if (categoryForm.id === categoryId) {
        setCategoryForm(emptyCategoryForm);
      }

      setCategoryError(null);
      setCategoryMessage("ลบหมวดหมู่เรียบร้อย");
      await queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "inventory", "items"] });
    },
    onError: (error) => {
      setCategoryError(error instanceof Error ? error.message : "ลบหมวดหมู่ไม่สำเร็จ");
    }
  });

  const createInventoryMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>("/api/admin/inventory/items", {
        method: "POST",
        body: JSON.stringify({
          productId: inventoryForm.productId,
          kind: inventoryForm.kind,
          maskedLabel: inventoryForm.maskedLabel,
          payload: inventoryForm.payload
        })
      }),
    onSuccess: async () => {
      setInventoryForm((current) => ({
        ...emptyInventoryForm,
        productId: current.productId || emptyInventoryForm.productId
      }));
      setInventoryError(null);
      setInventoryMessage("เพิ่มรายการคลังโค้ดเรียบร้อย");
      await queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "inventory", "items"] });
    },
    onError: (error) => {
      setInventoryError(error instanceof Error ? error.message : "เพิ่มคลังโค้ดไม่สำเร็จ");
    }
  });

  const updateInventoryMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/inventory/items/${inventoryForm.id}`, {
        method: "PUT",
        body: JSON.stringify({
          productId: inventoryForm.productId,
          kind: inventoryForm.kind,
          maskedLabel: inventoryForm.maskedLabel,
          payload: inventoryForm.payload
        })
      }),
    onSuccess: async () => {
      setInventoryError(null);
      setInventoryMessage("อัปเดตรายการคลังโค้ดเรียบร้อย");
      await queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "inventory", "items"] });
    },
    onError: (error) => {
      setInventoryError(error instanceof Error ? error.message : "อัปเดตรายการไม่สำเร็จ");
    }
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: (inventoryItemId: string) =>
      apiFetch(`/api/admin/inventory/items/${inventoryItemId}`, {
        method: "DELETE"
      }),
    onSuccess: async (_, inventoryItemId) => {
      if (inventoryForm.id === inventoryItemId) {
        setInventoryForm((current) => ({
          ...emptyInventoryForm,
          productId: current.productId || emptyInventoryForm.productId
        }));
      }

      setInventoryError(null);
      setInventoryMessage("ลบรายการคลังโค้ดเรียบร้อย");
      await queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "inventory", "items"] });
    },
    onError: (error) => {
      setInventoryError(error instanceof Error ? error.message : "ลบรายการคลังโค้ดไม่สำเร็จ");
    }
  });

  const inventoryBulkMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ imported: number }>("/api/admin/inventory/import", {
        method: "POST",
        body: JSON.stringify({
          productId: inventoryBulkProductId,
          kind: inventoryBulkKind,
          rawText: inventoryBulkPayload
        })
      }),
    onSuccess: async (result) => {
      setInventoryBulkPayload("");
      setInventoryError(null);
      setInventoryMessage(`นำเข้าคลังเพิ่ม ${result.imported} รายการเรียบร้อย`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "inventory", "items"] });
    },
    onError: (error) => {
      setInventoryError(error instanceof Error ? error.message : "นำเข้าคลังไม่สำเร็จ");
    }
  });

  const requeueMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiFetch(`/api/admin/jobs/${jobId}/requeue`, {
        method: "POST",
        body: JSON.stringify({})
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
    }
  });

  useEffect(() => {
    if (selectedProvider) {
      return;
    }

    const firstProvider = providerQuery.data?.[0];
    if (!firstProvider) {
      return;
    }

    setSelectedProvider(firstProvider.providerKey);
  }, [providerQuery.data, selectedProvider]);

  useEffect(() => {
    const provider = providerQuery.data?.find((item) => item.providerKey === selectedProvider);
    if (!provider) {
      return;
    }

    setProviderConfigJson(provider.configJson || "{}");
    setProviderEnabled(provider.isEnabled);
    setProviderFormError(null);
    setProviderSyncMessage(null);
  }, [providerQuery.data, selectedProvider]);

  useEffect(() => {
    const firstProduct = productsQuery.data?.[0];
    if (!firstProduct) {
      return;
    }

    setInventoryForm((current) => (current.productId ? current : { ...current, productId: firstProduct.id }));
    setInventoryBulkProductId((current) => current || firstProduct.id);
  }, [productsQuery.data]);

  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const inventoryItems = inventoryItemsQuery.data ?? [];
  const filteredProducts =
    inventoryCategoryFilter === "all" ? products : products.filter((product) => product.categoryId === inventoryCategoryFilter);
  const filteredInventoryItems = inventoryItems.filter((item) => {
    if (inventoryCategoryFilter !== "all" && item.categoryId !== inventoryCategoryFilter) {
      return false;
    }

    if (inventoryProductFilter !== "all" && item.productId !== inventoryProductFilter) {
      return false;
    }

    return true;
  });

  if (!user) {
    return (
      <div className="panel rounded-[2rem] p-6">
        <p className="text-lg font-semibold text-slate-950">เข้าสู่ระบบแอดมินก่อน</p>
        <button className="primary-button mt-4 rounded-full px-4 py-2 text-sm" onClick={() => openAuth("login")}>
          Login
        </button>
      </div>
    );
  }

  if (user.role !== "admin") {
    return <div className="panel rounded-[2rem] p-6">บัญชีนี้ยังไม่ใช่ผู้ดูแลระบบ</div>;
  }

  return (
    <div className="space-y-6">
      <section className="panel rounded-[2.5rem] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="section-label">Admin Command Center</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">จัดการหมวดหมู่และคลังโค้ดจากหน้าเดียว</h1>
            <p className="mt-3 max-w-3xl text-sm muted-text">
              เพิ่มเมนูภายในหน้าแอดมินเพื่อแยกงานชัดเจน ดูภาพรวมยอดขาย จัดการหมวดหมู่สินค้า และดูแล code / link / account stock ได้ครบใน workflow เดียว
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/90 px-4 py-3 text-sm text-slate-700">
            โหมดใช้งาน: <span className="font-semibold text-slate-950">ผู้ดูแลระบบ</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {[
            ["ภาพรวม", "#admin-overview"],
            ["หมวดหมู่สินค้า", "#admin-categories"],
            ["คลังโค้ด", "#admin-inventory"],
            ["Provider", "#admin-providers"],
            ["ออเดอร์ล่าสุด", "#admin-orders"],
            ["คิวงาน", "#admin-jobs"]
          ].map(([label, href]) => (
            <a className="secondary-button rounded-full px-4 py-2 text-sm" href={href} key={href}>
              {label}
            </a>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" id="admin-overview">
        {[
          ["จำนวนออเดอร์", String(dashboardQuery.data?.ordersCount ?? 0)],
          ["รายได้รวม", formatMoney(dashboardQuery.data?.revenueCents ?? 0)],
          ["ผู้ใช้งาน", String(dashboardQuery.data?.usersCount ?? 0)],
          ["งานค้างในคิว", String(dashboardQuery.data?.pendingJobs ?? 0)]
        ].map(([label, value]) => (
          <div className="panel rounded-[2rem] p-5" key={label}>
            <div className="section-label">{label}</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]" id="admin-categories">
        <section className="panel rounded-[2.5rem] p-6">
          <p className="section-label">Category Manager</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">เมนูหมวดหมู่สำหรับแยกการขายให้ชัดเจน</h2>
          <p className="mt-2 text-sm muted-text">
            ใช้ส่วนนี้สร้างหมวดสินค้าหลัก เช่น เติมเกม, code, ลิงก์ดาวน์โหลด, ไอดีเกม หรือพรีเมียมแอป เพื่อแยกสินค้าในร้านให้เข้าใจง่าย
          </p>

          <div className="mt-5 space-y-3">
            <input
              className="input-field"
              onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="ชื่อหมวดหมู่"
              value={categoryForm.name}
            />
            <input
              className="input-field"
              onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder="slug เช่น game-codes"
              value={categoryForm.slug}
            />
            <input
              className="input-field"
              onChange={(event) => setCategoryForm((current) => ({ ...current, icon: event.target.value }))}
              placeholder="ไอคอนหรือคีย์เวิร์ด เช่น key, gamepad, gift"
              value={categoryForm.icon}
            />
            <textarea
              className="input-field min-h-28"
              onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="คำอธิบายหมวดหมู่สั้น ๆ"
              value={categoryForm.description}
            />
            <div className="flex flex-wrap gap-3">
              <button
                className="primary-button rounded-full px-4 py-3 text-sm"
                onClick={() => void (categoryForm.id ? updateCategoryMutation.mutate() : createCategoryMutation.mutate())}
                type="button"
              >
                {categoryForm.id ? "บันทึกการแก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}
              </button>
              <button
                className="secondary-button rounded-full px-4 py-3 text-sm"
                onClick={() => {
                  setCategoryForm(emptyCategoryForm);
                  setCategoryError(null);
                  setCategoryMessage(null);
                }}
                type="button"
              >
                ล้างฟอร์ม
              </button>
            </div>
            {categoryMessage ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{categoryMessage}</div> : null}
            {categoryError ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{categoryError}</div> : null}
          </div>
        </section>

        <section className="panel rounded-[2.5rem] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-label">Category List</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">หมวดหมู่ที่เปิดใช้งานในร้าน</h2>
            </div>
            <div className="rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-slate-600">
              ทั้งหมด {categories.length} หมวด
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {categories.map((category) => (
              <div className="panel-soft rounded-[1.75rem] px-4 py-4" key={category.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{category.name}</h3>
                      <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-slate-700">{getCategoryBadgeText(category)}</span>
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">{category.slug}</div>
                    {category.description ? <p className="mt-3 text-sm muted-text">{category.description}</p> : null}
                    {category.icon ? <div className="mt-2 text-sm text-slate-500">ไอคอน: {category.icon}</div> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="secondary-button rounded-full px-4 py-2 text-sm"
                      onClick={() => {
                        setCategoryForm({
                          id: category.id,
                          slug: category.slug,
                          name: category.name,
                          description: category.description ?? "",
                          icon: category.icon ?? ""
                        });
                        setCategoryError(null);
                        setCategoryMessage(`กำลังแก้ไขหมวดหมู่ ${category.name}`);
                      }}
                      type="button"
                    >
                      แก้ไข
                    </button>
                    <button
                      className="rounded-full border border-rose-200 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-50"
                      onClick={() => {
                        if (window.confirm(`ต้องการลบหมวดหมู่ ${category.name} ใช่หรือไม่`)) {
                          void deleteCategoryMutation.mutate(category.id);
                        }
                      }}
                      type="button"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {categories.length === 0 ? <div className="rounded-[1.75rem] border border-dashed border-[var(--line)] px-4 py-5 text-sm muted-text">ยังไม่มีหมวดหมู่ในระบบ</div> : null}
          </div>
        </section>
      </div>

      <section className="panel rounded-[2.5rem] p-6" id="admin-inventory">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="section-label">Inventory Control</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">เพิ่ม แก้ไข ลบ code ได้จากหลังบ้าน</h2>
            <p className="mt-2 max-w-3xl text-sm muted-text">
              รองรับการขายแบบ code, download link, account และรายการทั่วไป สามารถกรองตามหมวดหมู่และสินค้าเพื่อดู stock ได้ชัดเจน
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select className="input-field min-w-48" onChange={(event) => setInventoryCategoryFilter(event.target.value)} value={inventoryCategoryFilter}>
              <option value="all">ทุกหมวดหมู่</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select className="input-field min-w-56" onChange={(event) => setInventoryProductFilter(event.target.value)} value={inventoryProductFilter}>
              <option value="all">ทุกสินค้า</option>
              {filteredProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="panel-soft rounded-[2rem] p-5">
              <p className="section-label">เพิ่มหรือแก้ไขรายชิ้น</p>
              <div className="mt-4 space-y-3">
                <select
                  className="input-field"
                  onChange={(event) => setInventoryForm((current) => ({ ...current, productId: event.target.value }))}
                  value={inventoryForm.productId}
                >
                  <option value="">เลือกสินค้า</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.type})
                    </option>
                  ))}
                </select>
                <select
                  className="input-field"
                  onChange={(event) => setInventoryForm((current) => ({ ...current, kind: event.target.value as InventoryItemRow["kind"] }))}
                  value={inventoryForm.kind}
                >
                  {inventoryKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
                <input
                  className="input-field"
                  onChange={(event) => setInventoryForm((current) => ({ ...current, maskedLabel: event.target.value }))}
                  placeholder="ชื่อแสดงผล เช่น CODE-A1 หรือ Spotify Premium"
                  value={inventoryForm.maskedLabel}
                />
                <textarea
                  className="input-field min-h-32"
                  onChange={(event) => setInventoryForm((current) => ({ ...current, payload: event.target.value }))}
                  placeholder="ใส่ code, ลิงก์ดาวน์โหลด หรือ account ที่ต้องการขาย"
                  value={inventoryForm.payload}
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    className="primary-button rounded-full px-4 py-3 text-sm"
                    onClick={() => void (inventoryForm.id ? updateInventoryMutation.mutate() : createInventoryMutation.mutate())}
                    type="button"
                  >
                    {inventoryForm.id ? "บันทึกการแก้ไขรายการ" : "เพิ่ม code ใหม่"}
                  </button>
                  <button
                    className="secondary-button rounded-full px-4 py-3 text-sm"
                    onClick={() =>
                      setInventoryForm({
                        ...emptyInventoryForm,
                        productId: inventoryForm.productId || products[0]?.id || ""
                      })
                    }
                    type="button"
                  >
                    ล้างฟอร์ม
                  </button>
                </div>
              </div>
            </div>

            <div className="panel-soft rounded-[2rem] p-5">
              <p className="section-label">นำเข้าหลายรายการ</p>
              <div className="mt-4 space-y-3">
                <select className="input-field" onChange={(event) => setInventoryBulkProductId(event.target.value)} value={inventoryBulkProductId}>
                  <option value="">เลือกสินค้าที่จะนำเข้า</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <select className="input-field" onChange={(event) => setInventoryBulkKind(event.target.value as InventoryItemRow["kind"])} value={inventoryBulkKind}>
                  {inventoryKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
                <textarea
                  className="input-field min-h-40"
                  onChange={(event) => setInventoryBulkPayload(event.target.value)}
                  placeholder={"CODE-001\nCODE-002\nCODE-003"}
                  value={inventoryBulkPayload}
                />
                <button className="primary-button rounded-full px-4 py-3 text-sm" onClick={() => void inventoryBulkMutation.mutate()} type="button">
                  นำเข้ารายการแบบหลายบรรทัด
                </button>
              </div>
            </div>

            {inventoryMessage ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{inventoryMessage}</div> : null}
            {inventoryError ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{inventoryError}</div> : null}
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {inventoryQuery.data?.map((item) => (
                <div className="panel-soft rounded-[1.5rem] px-4 py-4" key={item.id}>
                  <div className="text-sm font-medium text-slate-900">{item.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">{item.type}</div>
                  <div className="mt-3 text-sm muted-text">คงเหลือ: {item.availableStock}</div>
                  <div className="text-sm muted-text">ถูกจ่ายแล้ว: {item.allocatedStock}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {filteredInventoryItems.map((item) => (
                <div className="panel-soft rounded-[1.75rem] px-4 py-4" key={item.id}>
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-950">{item.maskedLabel}</div>
                        <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-600">{item.kind}</span>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-medium ${item.isAllocated ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                        >
                          {item.isAllocated ? "ขายแล้ว" : "พร้อมขาย"}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-slate-700">
                        {item.categoryName} / {item.productName}
                      </div>
                      <div className="mt-3 break-all rounded-[1.25rem] bg-white/90 px-4 py-3 text-sm text-slate-700">{item.payload}</div>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                        <span>สร้างเมื่อ {formatDate(item.createdAt)}</span>
                        {item.allocatedAt ? <span>ขายเมื่อ {formatDate(item.allocatedAt)}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="secondary-button rounded-full px-4 py-2 text-sm"
                        disabled={item.isAllocated}
                        onClick={() => {
                          setInventoryForm({
                            id: item.id,
                            productId: item.productId,
                            kind: item.kind,
                            maskedLabel: item.maskedLabel,
                            payload: item.payload
                          });
                          setInventoryError(null);
                          setInventoryMessage(`กำลังแก้ไขรายการ ${item.maskedLabel}`);
                        }}
                        type="button"
                      >
                        แก้ไข
                      </button>
                      <button
                        className="rounded-full border border-rose-200 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={item.isAllocated}
                        onClick={() => {
                          if (window.confirm(`ต้องการลบรายการ ${item.maskedLabel} ใช่หรือไม่`)) {
                            void deleteInventoryMutation.mutate(item.id);
                          }
                        }}
                        type="button"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredInventoryItems.length === 0 ? (
                <div className="rounded-[1.75rem] border border-dashed border-[var(--line)] px-4 py-5 text-sm muted-text">ยังไม่มีรายการคลังตามตัวกรองที่เลือก</div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]" id="admin-providers">
        <section className="panel rounded-[2.5rem] p-6">
          <p className="section-label">Provider Config</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">สถานะผู้ให้บริการ API</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {providerQuery.data?.map((provider) => {
              const isSelected = provider.providerKey === selectedProvider;

              return (
                <button
                  className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                    isSelected ? "border-[var(--text)] bg-[var(--text)] text-white" : "border-[var(--line)] bg-white/88 text-slate-900"
                  }`}
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.providerKey)}
                  type="button"
                >
                  <div className={`text-sm font-medium uppercase tracking-[0.2em] ${isSelected ? "text-white" : "text-slate-900"}`}>{provider.providerKey}</div>
                  <div className={`mt-2 text-sm ${isSelected ? "text-slate-200" : "text-slate-600"}`}>
                    สถานะ:{" "}
                    <span className={provider.isEnabled ? (isSelected ? "text-emerald-200" : "text-emerald-700") : isSelected ? "text-amber-200" : "text-amber-700"}>
                      {provider.isEnabled ? "เปิดใช้งาน" : "ปิดอยู่"}
                    </span>
                  </div>
                  <div className={`mt-2 text-xs ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                    {provider.updatedAt ? formatDate(provider.updatedAt) : "ยังไม่เคยตั้งค่า"}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedProvider ? (
            <div className="mt-4 rounded-[1.5rem] bg-[var(--text)] px-4 py-4 text-sm text-slate-100">
              <div>กำลังแก้ไข: {selectedProvider}</div>
              <label className="mt-4 flex items-center gap-3 text-sm">
                <input checked={providerEnabled} onChange={(event) => setProviderEnabled(event.target.checked)} type="checkbox" />
                เปิดใช้งาน provider นี้
              </label>
              <textarea
                className="mt-4 min-h-40 w-full rounded-[1.25rem] border border-white/10 bg-slate-950/55 px-4 py-3 font-mono text-xs text-slate-100 outline-none"
                onChange={(event) => setProviderConfigJson(event.target.value)}
                value={providerConfigJson}
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="secondary-button rounded-full bg-white px-4 py-2 text-xs text-slate-900" onClick={() => void providerMutation.mutate(selectedProvider)} type="button">
                  บันทึก config
                </button>
                <button className="rounded-full border border-white/20 px-4 py-2 text-xs text-white" onClick={() => void providerSyncMutation.mutate(selectedProvider)} type="button">
                  sync ตอนนี้
                </button>
              </div>
              {providerFormError ? <div className="mt-3 rounded-2xl bg-rose-500/10 px-4 py-3 text-rose-200">{providerFormError}</div> : null}
              {providerSyncMessage ? <div className="mt-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-emerald-200">{providerSyncMessage}</div> : null}
            </div>
          ) : null}
        </section>

        <section className="panel rounded-[2.5rem] p-6" id="admin-orders">
          <p className="section-label">Recent Orders</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">ออเดอร์ล่าสุด</h2>
          <div className="mt-4 space-y-3">
            {orderQuery.data?.slice(0, 8).map((order) => (
              <div className="panel-soft rounded-[1.5rem] px-4 py-4" key={order.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{order.id}</div>
                    <div className="mt-1 text-sm muted-text">{formatDate(order.createdAt)}</div>
                    {order.notes ? <div className="mt-2 text-sm muted-text">{order.notes}</div> : null}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">{formatMoney(order.totalCents)}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--brand)]">{order.status}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel rounded-[2.5rem] p-6" id="admin-jobs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-label">Queue Jobs</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">งานค้างและงานที่พร้อม requeue</h2>
          </div>
          <div className="rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-slate-600">ทั้งหมด {jobsQuery.data?.length ?? 0} งาน</div>
        </div>
        <div className="mt-4 space-y-3">
          {jobsQuery.data?.map((job) => (
            <div className="panel-soft rounded-[1.5rem] px-4 py-4" key={job.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900">{job.kind}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">{job.status}</div>
                  <div className="mt-2 text-xs text-slate-500">อัปเดตล่าสุด {formatDate(job.updatedAt)}</div>
                  <pre className="mt-3 overflow-auto rounded-2xl bg-[var(--text)] px-4 py-3 text-xs text-slate-100">{job.payloadJson}</pre>
                </div>
                <button className="secondary-button rounded-full px-4 py-2 text-xs" onClick={() => void requeueMutation.mutate(job.id)} type="button">
                  requeue
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
