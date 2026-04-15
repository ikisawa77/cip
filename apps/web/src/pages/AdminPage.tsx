import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { footerContentDefaults, homepageContentDefaults, type FooterContent, type HomepageContent } from "@cip/shared";
import {
  BadgeDollarSign,
  Boxes,
  FolderCog,
  Home,
  KeyRound,
  LayoutDashboard,
  PackageCheck,
  PackagePlus,
  PlugZap,
  ReceiptText,
  RefreshCcw,
  ScanSearch,
  ShieldCheck,
  Tags,
  UserRound,
  Workflow
} from "lucide-react";
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

const productTypes = [
  "TOPUP_API",
  "DIGITAL_CODE",
  "DOWNLOAD_LINK",
  "PREMIUM_API",
  "ID_PASS_ORDER",
  "ACCOUNT_STOCK",
  "RANDOM_POOL",
  "WALLET_TOPUP"
] as const;

const emptyProductForm = {
  id: null as string | null,
  categoryId: "",
  slug: "",
  name: "",
  description: "",
  type: "DIGITAL_CODE" as ProductRow["type"],
  priceBaht: "",
  compareAtBaht: "",
  deliveryNote: "",
  badge: "",
  coverImage: "",
  isActive: true
};

function createHomepageContentForm(): HomepageContent {
  return {
    ...homepageContentDefaults,
    trustLabels: [
      homepageContentDefaults.trustLabels[0],
      homepageContentDefaults.trustLabels[1],
      homepageContentDefaults.trustLabels[2]
    ],
    supportCards: homepageContentDefaults.supportCards.map((card) => ({ ...card })) as HomepageContent["supportCards"]
  };
}

function createFooterContentForm(): FooterContent {
  return {
    ...footerContentDefaults,
    statusPills: [
      footerContentDefaults.statusPills[0],
      footerContentDefaults.statusPills[1],
      footerContentDefaults.statusPills[2]
    ],
    quickLinks: footerContentDefaults.quickLinks.map((link) => ({ ...link })) as FooterContent["quickLinks"],
    supportLinks: footerContentDefaults.supportLinks.map((link) => ({ ...link })) as FooterContent["supportLinks"]
  };
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB"
  }).format(cents / 100);
}

function parseBahtToCents(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100);
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

function updateSupportCard(
  content: HomepageContent,
  index: number,
  field: "title" | "body",
  value: string
): HomepageContent {
  return {
    ...content,
    supportCards: content.supportCards.map((card, cardIndex) => (cardIndex === index ? { ...card, [field]: value } : card)) as HomepageContent["supportCards"]
  };
}

function updateTrustLabel(content: HomepageContent, index: number, value: string): HomepageContent {
  return {
    ...content,
    trustLabels: content.trustLabels.map((label, labelIndex) => (labelIndex === index ? value : label)) as HomepageContent["trustLabels"]
  };
}

function updateFooterStatusPill(content: FooterContent, index: number, value: string): FooterContent {
  return {
    ...content,
    statusPills: content.statusPills.map((pill, pillIndex) => (pillIndex === index ? value : pill)) as FooterContent["statusPills"]
  };
}

function updateFooterLink(
  content: FooterContent,
  group: "quickLinks" | "supportLinks",
  index: number,
  field: "label" | "href",
  value: string
): FooterContent {
  return {
    ...content,
    [group]: content[group].map((link, linkIndex) => (linkIndex === index ? { ...link, [field]: value } : link)) as FooterContent[typeof group]
  };
}

const adminNavItems = [
  { label: "ภาพรวม", href: "#admin-overview", icon: LayoutDashboard },
  { label: "ข้อความหน้าแรก", href: "#admin-homepage", icon: Home },
  { label: "ข้อความ footer", href: "#admin-footer", icon: PackageCheck },
  { label: "หมวดหมู่สินค้า", href: "#admin-categories", icon: Tags },
  { label: "คลังโค้ด", href: "#admin-inventory", icon: KeyRound },
  { label: "สินค้า", href: "#admin-products", icon: PackagePlus },
  { label: "Provider", href: "#admin-providers", icon: PlugZap },
  { label: "ออเดอร์ล่าสุด", href: "#admin-orders", icon: ReceiptText },
  { label: "คิวงาน", href: "#admin-jobs", icon: Workflow }
] as const;

const overviewCardMeta = [
  { label: "จำนวนออเดอร์", icon: ReceiptText },
  { label: "รายได้รวม", icon: PackageCheck },
  { label: "ผู้ใช้งาน", icon: UserRound },
  { label: "งานค้างในคิว", icon: Workflow }
] as const;

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
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [productMessage, setProductMessage] = useState<string | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const [homepageForm, setHomepageForm] = useState<HomepageContent>(createHomepageContentForm);
  const [homepageMessage, setHomepageMessage] = useState<string | null>(null);
  const [homepageError, setHomepageError] = useState<string | null>(null);
  const [footerForm, setFooterForm] = useState<FooterContent>(createFooterContentForm);
  const [footerMessage, setFooterMessage] = useState<string | null>(null);
  const [footerError, setFooterError] = useState<string | null>(null);
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

  const homepageContentQuery = useQuery({
    queryKey: ["admin", "content", "homepage"],
    queryFn: () => apiFetch<HomepageContent>("/api/admin/content/homepage"),
    enabled: user?.role === "admin"
  });

  const footerContentQuery = useQuery({
    queryKey: ["admin", "content", "footer"],
    queryFn: () => apiFetch<FooterContent>("/api/admin/content/footer"),
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

  const createProductMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>("/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          categoryId: productForm.categoryId,
          slug: productForm.slug,
          name: productForm.name,
          description: productForm.description,
          type: productForm.type,
          priceCents: parseBahtToCents(productForm.priceBaht),
          compareAtCents: productForm.compareAtBaht ? parseBahtToCents(productForm.compareAtBaht) : null,
          deliveryNote: productForm.deliveryNote,
          badge: productForm.badge,
          coverImage: productForm.coverImage,
          isActive: productForm.isActive
        })
      }),
    onSuccess: async () => {
      setProductForm((current) => ({
        ...emptyProductForm,
        categoryId: current.categoryId || categoriesQuery.data?.[0]?.id || ""
      }));
      setProductError(null);
      setProductMessage("เพิ่มสินค้าและตั้งราคาเรียบร้อย");
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (error) => {
      setProductError(error instanceof Error ? error.message : "เพิ่มสินค้าไม่สำเร็จ");
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/products/${productForm.id}`, {
        method: "PUT",
        body: JSON.stringify({
          categoryId: productForm.categoryId,
          slug: productForm.slug,
          name: productForm.name,
          description: productForm.description,
          type: productForm.type,
          priceCents: parseBahtToCents(productForm.priceBaht),
          compareAtCents: productForm.compareAtBaht ? parseBahtToCents(productForm.compareAtBaht) : null,
          deliveryNote: productForm.deliveryNote,
          badge: productForm.badge,
          coverImage: productForm.coverImage,
          isActive: productForm.isActive
        })
      }),
    onSuccess: async () => {
      setProductError(null);
      setProductMessage("อัปเดตราคาและข้อมูลสินค้าเรียบร้อย");
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (error) => {
      setProductError(error instanceof Error ? error.message : "อัปเดตสินค้าไม่สำเร็จ");
    }
  });

  const updateHomepageContentMutation = useMutation({
    mutationFn: () =>
      apiFetch<HomepageContent>("/api/admin/content/homepage", {
        method: "PUT",
        body: JSON.stringify(homepageForm)
      }),
    onSuccess: async (result) => {
      setHomepageForm({
        ...result,
        trustLabels: [result.trustLabels[0], result.trustLabels[1], result.trustLabels[2]],
        supportCards: result.supportCards.map((card) => ({ ...card })) as HomepageContent["supportCards"]
      });
      setHomepageError(null);
      setHomepageMessage("บันทึกข้อความหน้าแรกเรียบร้อย");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "content", "homepage"] }),
        queryClient.invalidateQueries({ queryKey: ["content", "homepage"] })
      ]);
    },
    onError: (error) => {
      setHomepageError(error instanceof Error ? error.message : "บันทึกข้อความหน้าแรกไม่สำเร็จ");
    }
  });

  const updateFooterContentMutation = useMutation({
    mutationFn: () =>
      apiFetch<FooterContent>("/api/admin/content/footer", {
        method: "PUT",
        body: JSON.stringify(footerForm)
      }),
    onSuccess: async (result) => {
      setFooterForm({
        ...result,
        statusPills: [result.statusPills[0], result.statusPills[1], result.statusPills[2]],
        quickLinks: result.quickLinks.map((link) => ({ ...link })) as FooterContent["quickLinks"],
        supportLinks: result.supportLinks.map((link) => ({ ...link })) as FooterContent["supportLinks"]
      });
      setFooterError(null);
      setFooterMessage("บันทึก footer เรียบร้อย");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "content", "footer"] }),
        queryClient.invalidateQueries({ queryKey: ["content", "footer"] })
      ]);
    },
    onError: (error) => {
      setFooterError(error instanceof Error ? error.message : "บันทึก footer ไม่สำเร็จ");
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
    if (!homepageContentQuery.data) {
      return;
    }

    setHomepageForm({
      ...homepageContentQuery.data,
      trustLabels: [
        homepageContentQuery.data.trustLabels[0],
        homepageContentQuery.data.trustLabels[1],
        homepageContentQuery.data.trustLabels[2]
      ],
      supportCards: homepageContentQuery.data.supportCards.map((card) => ({ ...card })) as HomepageContent["supportCards"]
    });
    setHomepageError(null);
  }, [homepageContentQuery.data]);

  useEffect(() => {
    if (!footerContentQuery.data) {
      return;
    }

    setFooterForm({
      ...footerContentQuery.data,
      statusPills: [footerContentQuery.data.statusPills[0], footerContentQuery.data.statusPills[1], footerContentQuery.data.statusPills[2]],
      quickLinks: footerContentQuery.data.quickLinks.map((link) => ({ ...link })) as FooterContent["quickLinks"],
      supportLinks: footerContentQuery.data.supportLinks.map((link) => ({ ...link })) as FooterContent["supportLinks"]
    });
    setFooterError(null);
  }, [footerContentQuery.data]);

  useEffect(() => {
    const firstProduct = productsQuery.data?.[0];
    if (!firstProduct) {
      return;
    }

    setInventoryForm((current) => (current.productId ? current : { ...current, productId: firstProduct.id }));
    setInventoryBulkProductId((current) => current || firstProduct.id);
  }, [productsQuery.data]);

  useEffect(() => {
    const firstCategory = categoriesQuery.data?.[0];
    if (!firstCategory) {
      return;
    }

    setProductForm((current) => (current.categoryId ? current : { ...current, categoryId: firstCategory.id }));
  }, [categoriesQuery.data]);

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
        <div className="section-head">
          <div className="section-head__icon">
            <ShieldCheck size={18} />
          </div>
          <div className="section-label">Admin Access</div>
        </div>
        <p className="text-lg font-semibold text-slate-950">เข้าสู่ระบบแอดมินก่อน</p>
        <button className="primary-button mt-4 rounded-full px-4 py-2 text-sm" onClick={() => openAuth("login")}>
          Login
        </button>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="panel rounded-[2rem] p-6">
        <div className="section-head">
          <div className="section-head__icon">
            <LayoutDashboard size={18} />
          </div>
          <div className="section-label">Admin Access</div>
        </div>
        <p className="mt-3 text-lg font-semibold text-slate-950">บัญชีนี้ยังไม่ใช่ผู้ดูแลระบบ</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel rounded-[2.5rem] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="section-head">
              <div className="section-head__icon">
                <LayoutDashboard size={18} />
              </div>
              <p className="section-label">Admin Command Center</p>
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">จัดการหมวดหมู่และคลังโค้ดจากหน้าเดียว</h1>
            <p className="mt-3 max-w-3xl text-sm muted-text">
              เพิ่มเมนูภายในหน้าแอดมินเพื่อแยกงานชัดเจน ดูภาพรวมยอดขาย จัดการหมวดหมู่สินค้า และดูแล code / link / account stock ได้ครบใน workflow เดียว
            </p>
          </div>
          <div className="icon-chip text-sm">
            <ShieldCheck className="icon-chip__icon" size={15} />
            โหมดใช้งาน: <span className="font-semibold text-slate-950">ผู้ดูแลระบบ</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {adminNavItems.map(({ label, href, icon: Icon }) => (
            <a className="secondary-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm" href={href} key={href}>
              <Icon size={15} />
              {label}
            </a>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" id="admin-overview">
        {[
          String(dashboardQuery.data?.ordersCount ?? 0),
          formatMoney(dashboardQuery.data?.revenueCents ?? 0),
          String(dashboardQuery.data?.usersCount ?? 0),
          String(dashboardQuery.data?.pendingJobs ?? 0)
        ].map((value, index) => {
          const item = overviewCardMeta[index];
          const Icon = item.icon;

          return (
            <div className="panel rounded-[2rem] p-5" key={item.label}>
              <div className="section-head">
                <div className="section-head__icon">
                  <Icon size={18} />
                </div>
                <div className="section-label">{item.label}</div>
              </div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]" id="admin-homepage">
        <section className="panel rounded-[2.5rem] p-6">
          <div className="section-head">
            <div className="section-head__icon">
              <Home size={18} />
            </div>
            <p className="section-label">Homepage Content</p>
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">แก้ไขข้อความหน้าแรกทั้งหมด</h2>
          <p className="mt-2 text-sm muted-text">
            ใช้ส่วนนี้จัดการข้อความที่ลูกค้าเห็นในหน้าแรก ทั้ง hero, ปุ่มหลัก, quick search, จุดขาย และข้อความส่วนหมวดสินค้า โดยไม่ต้องกลับไปแก้โค้ดเอง
          </p>

          <div className="mt-5 space-y-6">
            <div className="panel-soft rounded-[1.9rem] p-5">
              <div className="section-label">Hero Section</div>
              <div className="mt-4 space-y-3">
                <input
                  className="input-field"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, heroBadge: event.target.value }))}
                  placeholder="ข้อความ badge ด้านบน"
                  value={homepageForm.heroBadge}
                />
                <textarea
                  className="input-field min-h-28"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, heroTitle: event.target.value }))}
                  placeholder="หัวข้อใหญ่หน้าแรก"
                  value={homepageForm.heroTitle}
                />
                <textarea
                  className="input-field min-h-32"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, heroDescription: event.target.value }))}
                  placeholder="คำอธิบายใต้หัวข้อใหญ่"
                  value={homepageForm.heroDescription}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="input-field"
                    onChange={(event) => setHomepageForm((current) => ({ ...current, primaryCtaLabel: event.target.value }))}
                    placeholder="ข้อความปุ่มหลัก"
                    value={homepageForm.primaryCtaLabel}
                  />
                  <input
                    className="input-field"
                    onChange={(event) => setHomepageForm((current) => ({ ...current, secondaryCtaLabel: event.target.value }))}
                    placeholder="ข้อความปุ่มรอง"
                    value={homepageForm.secondaryCtaLabel}
                  />
                </div>
              </div>
            </div>

            <div className="panel-soft rounded-[1.9rem] p-5">
              <div className="section-label">Quick Search และ Trust Points</div>
              <div className="mt-4 space-y-3">
                <input
                  className="input-field"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, quickSearchLabel: event.target.value }))}
                  placeholder="หัวข้อกล่องค้นหา"
                  value={homepageForm.quickSearchLabel}
                />
                <input
                  className="input-field"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, quickSearchPlaceholder: event.target.value }))}
                  placeholder="ข้อความ placeholder ช่องค้นหา"
                  value={homepageForm.quickSearchPlaceholder}
                />
                <textarea
                  className="input-field min-h-24"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, quickSearchEmptyText: event.target.value }))}
                  placeholder="ข้อความตอนค้นหาแล้วไม่พบสินค้า"
                  value={homepageForm.quickSearchEmptyText}
                />
                <div className="grid gap-3 md:grid-cols-3">
                  {homepageForm.trustLabels.map((label, index) => (
                    <input
                      className="input-field"
                      key={`trust-${index}`}
                      onChange={(event) => setHomepageForm((current) => updateTrustLabel(current, index, event.target.value))}
                      placeholder={`Trust point ${index + 1}`}
                      value={label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="panel-soft rounded-[1.9rem] p-5">
              <div className="section-label">จุดขาย 3 การ์ด</div>
              <div className="mt-4 space-y-4">
                <input
                  className="input-field"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, supportSectionLabel: event.target.value }))}
                  placeholder="คำขึ้นต้นของการ์ด เช่น Support"
                  value={homepageForm.supportSectionLabel}
                />
                {homepageForm.supportCards.map((card, index) => (
                  <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/80 p-4" key={`support-card-${index}`}>
                    <div className="text-sm font-medium text-slate-900">การ์ดจุดขาย {index + 1}</div>
                    <div className="mt-3 space-y-3">
                      <input
                        className="input-field"
                        onChange={(event) => setHomepageForm((current) => updateSupportCard(current, index, "title", event.target.value))}
                        placeholder="หัวข้อการ์ด"
                        value={card.title}
                      />
                      <textarea
                        className="input-field min-h-24"
                        onChange={(event) => setHomepageForm((current) => updateSupportCard(current, index, "body", event.target.value))}
                        placeholder="รายละเอียดการ์ด"
                        value={card.body}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-soft rounded-[1.9rem] p-5">
              <div className="section-label">ส่วนหมวดสินค้า</div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  className="input-field"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, categorySectionLabel: event.target.value }))}
                  placeholder="label ของ section หมวด"
                  value={homepageForm.categorySectionLabel}
                />
                <input
                  className="input-field"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, allCategoriesLabel: event.target.value }))}
                  placeholder="ข้อความปุ่มทุกหมวด"
                  value={homepageForm.allCategoriesLabel}
                />
                <textarea
                  className="input-field min-h-24 md:col-span-2"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, categorySectionTitle: event.target.value }))}
                  placeholder="หัวข้อส่วนหมวดสินค้า"
                  value={homepageForm.categorySectionTitle}
                />
                <textarea
                  className="input-field min-h-28 md:col-span-2"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, categorySectionDescription: event.target.value }))}
                  placeholder="คำอธิบายส่วนหมวดสินค้า"
                  value={homepageForm.categorySectionDescription}
                />
                <input
                  className="input-field"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, filteredCategoryPrefix: event.target.value }))}
                  placeholder="ข้อความตอนกำลังกดกรองหมวด"
                  value={homepageForm.filteredCategoryPrefix}
                />
                <input
                  className="input-field"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, categoryPanelLabel: event.target.value }))}
                  placeholder="ป้าย label บนการ์ดหมวด"
                  value={homepageForm.categoryPanelLabel}
                />
                <textarea
                  className="input-field min-h-24 md:col-span-2"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, categoryFallbackDescription: event.target.value }))}
                  placeholder="ข้อความ fallback ของหมวด"
                  value={homepageForm.categoryFallbackDescription}
                />
                <input
                  className="input-field"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, categoryBrowseLabel: event.target.value }))}
                  placeholder="ข้อความลิงก์เปิดหน้าหมวด"
                  value={homepageForm.categoryBrowseLabel}
                />
                <input
                  className="input-field"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, categoryTopupLabel: event.target.value }))}
                  placeholder="ข้อความลิงก์ไปหน้าเติมเงิน"
                  value={homepageForm.categoryTopupLabel}
                />
                <textarea
                  className="input-field min-h-24 md:col-span-2"
                  onChange={(event) => setHomepageForm((current) => ({ ...current, categoryEmptyText: event.target.value }))}
                  placeholder="ข้อความตอนหมวดนี้ไม่มีสินค้า"
                  value={homepageForm.categoryEmptyText}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="primary-button rounded-full px-5 py-3 text-sm" onClick={() => void updateHomepageContentMutation.mutate()} type="button">
                บันทึกข้อความหน้าแรก
              </button>
              <button
                className="secondary-button rounded-full px-5 py-3 text-sm"
                onClick={() => {
                  setHomepageForm(
                    homepageContentQuery.data
                      ? {
                          ...homepageContentQuery.data,
                          trustLabels: [
                            homepageContentQuery.data.trustLabels[0],
                            homepageContentQuery.data.trustLabels[1],
                            homepageContentQuery.data.trustLabels[2]
                          ],
                          supportCards: homepageContentQuery.data.supportCards.map((card) => ({ ...card })) as HomepageContent["supportCards"]
                        }
                      : createHomepageContentForm()
                  );
                  setHomepageError(null);
                  setHomepageMessage(null);
                }}
                type="button"
              >
                รีเซ็ตฟอร์มข้อความ
              </button>
            </div>

            {homepageMessage ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{homepageMessage}</div> : null}
            {homepageError ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{homepageError}</div> : null}
          </div>
        </section>

        <section className="panel rounded-[2.5rem] p-6">
          <div className="section-head">
            <div className="section-head__icon">
              <Boxes size={18} />
            </div>
            <p className="section-label">Homepage Preview Notes</p>
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">สรุปข้อความที่จะไปแสดงบนหน้าแรก</h2>
          <div className="mt-5 space-y-4">
            <div className="panel-soft rounded-[1.75rem] p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">Hero Badge</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{homepageForm.heroBadge}</div>
            </div>
            <div className="panel-soft rounded-[1.75rem] p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">Hero Title</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{homepageForm.heroTitle}</div>
              <p className="mt-3 text-sm leading-7 muted-text">{homepageForm.heroDescription}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="icon-chip">{homepageForm.primaryCtaLabel}</span>
                <span className="icon-chip">{homepageForm.secondaryCtaLabel}</span>
              </div>
            </div>
            <div className="panel-soft rounded-[1.75rem] p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">Trust Points</div>
              <div className="mt-3 grid gap-3">
                {homepageForm.trustLabels.map((label, index) => (
                  <div className="icon-chip justify-start text-sm" key={`preview-trust-${index}`}>
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <div className="panel-soft rounded-[1.75rem] p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">Support Cards</div>
              <div className="mt-4 space-y-3">
                {homepageForm.supportCards.map((card, index) => (
                  <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/90 px-4 py-4" key={`preview-card-${index}`}>
                    <div className="text-sm font-semibold text-slate-950">{card.title}</div>
                    <p className="mt-2 text-sm leading-7 muted-text">{card.body}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel-soft rounded-[1.75rem] p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">หมวดสินค้า</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{homepageForm.categorySectionTitle}</div>
              <p className="mt-2 text-sm leading-7 muted-text">{homepageForm.categorySectionDescription}</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-700">
                <div>ปุ่มทุกหมวด: {homepageForm.allCategoriesLabel}</div>
                <div>ข้อความกรองหมวด: {homepageForm.filteredCategoryPrefix}</div>
                <div>ข้อความ fallback: {homepageForm.categoryFallbackDescription}</div>
                <div>ลิงก์เปิดหน้าหมวด: {homepageForm.categoryBrowseLabel}</div>
                <div>ลิงก์เติมเงิน: {homepageForm.categoryTopupLabel}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]" id="admin-footer">
        <section className="panel rounded-[2.5rem] p-6">
          <div className="section-head">
            <div className="section-head__icon">
              <PackageCheck size={18} />
            </div>
            <p className="section-label">Footer Content</p>
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">แก้ไข footer ได้ทั้งหมดจากหลังบ้าน</h2>
          <p className="mt-2 text-sm muted-text">
            ใช้ส่วนนี้ปรับ footer แบบครบทั้งข้อความหลัก จุดขาย ลิงก์ทางลัด และข้อความติดต่อตอนท้ายเว็บ เพื่อให้ทุกหน้าดูมีน้ำหนักและพร้อมขายมากขึ้น
          </p>

          <div className="mt-5 space-y-6">
            <div className="panel-soft rounded-[1.9rem] p-5">
              <div className="section-label">Hero Footer</div>
              <div className="mt-4 space-y-3">
                <input
                  className="input-field"
                  onChange={(event) => setFooterForm((current) => ({ ...current, badge: event.target.value }))}
                  placeholder="ข้อความ badge ของ footer"
                  value={footerForm.badge}
                />
                <textarea
                  className="input-field min-h-28"
                  onChange={(event) => setFooterForm((current) => ({ ...current, headline: event.target.value }))}
                  placeholder="หัวข้อใหญ่ของ footer"
                  value={footerForm.headline}
                />
                <textarea
                  className="input-field min-h-28"
                  onChange={(event) => setFooterForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="คำอธิบายใต้หัวข้อใหญ่"
                  value={footerForm.description}
                />
              </div>
            </div>

            <div className="panel-soft rounded-[1.9rem] p-5">
              <div className="section-label">Status Pills</div>
              <div className="mt-4 grid gap-3">
                {footerForm.statusPills.map((pill, index) => (
                  <input
                    className="input-field"
                    key={`footer-pill-${index}`}
                    onChange={(event) => setFooterForm((current) => updateFooterStatusPill(current, index, event.target.value))}
                    placeholder={`ข้อความสถานะ ${index + 1}`}
                    value={pill}
                  />
                ))}
              </div>
            </div>

            <div className="panel-soft rounded-[1.9rem] p-5">
              <div className="section-label">ลิงก์ทางลัดชุดที่ 1</div>
              <div className="mt-4 space-y-3">
                <input
                  className="input-field"
                  onChange={(event) => setFooterForm((current) => ({ ...current, quickLinksTitle: event.target.value }))}
                  placeholder="หัวข้อชุดลิงก์แรก"
                  value={footerForm.quickLinksTitle}
                />
                {footerForm.quickLinks.map((link, index) => (
                  <div className="grid gap-3 md:grid-cols-2" key={`quick-link-${index}`}>
                    <input
                      className="input-field"
                      onChange={(event) => setFooterForm((current) => updateFooterLink(current, "quickLinks", index, "label", event.target.value))}
                      placeholder="ข้อความลิงก์"
                      value={link.label}
                    />
                    <input
                      className="input-field"
                      onChange={(event) => setFooterForm((current) => updateFooterLink(current, "quickLinks", index, "href", event.target.value))}
                      placeholder="ปลายทางลิงก์ เช่น /topup หรือ /#store-categories"
                      value={link.href}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-soft rounded-[1.9rem] p-5">
              <div className="section-label">ลิงก์ทางลัดชุดที่ 2 และติดต่อ</div>
              <div className="mt-4 space-y-3">
                <input
                  className="input-field"
                  onChange={(event) => setFooterForm((current) => ({ ...current, supportLinksTitle: event.target.value }))}
                  placeholder="หัวข้อชุดลิงก์ที่สอง"
                  value={footerForm.supportLinksTitle}
                />
                {footerForm.supportLinks.map((link, index) => (
                  <div className="grid gap-3 md:grid-cols-2" key={`support-link-${index}`}>
                    <input
                      className="input-field"
                      onChange={(event) => setFooterForm((current) => updateFooterLink(current, "supportLinks", index, "label", event.target.value))}
                      placeholder="ข้อความลิงก์"
                      value={link.label}
                    />
                    <input
                      className="input-field"
                      onChange={(event) => setFooterForm((current) => updateFooterLink(current, "supportLinks", index, "href", event.target.value))}
                      placeholder="ปลายทางลิงก์"
                      value={link.href}
                    />
                  </div>
                ))}
                <input
                  className="input-field"
                  onChange={(event) => setFooterForm((current) => ({ ...current, contactTitle: event.target.value }))}
                  placeholder="หัวข้อส่วนติดต่อ"
                  value={footerForm.contactTitle}
                />
                <textarea
                  className="input-field min-h-24"
                  onChange={(event) => setFooterForm((current) => ({ ...current, contactLine: event.target.value }))}
                  placeholder="ข้อความติดต่อหลัก"
                  value={footerForm.contactLine}
                />
                <textarea
                  className="input-field min-h-24"
                  onChange={(event) => setFooterForm((current) => ({ ...current, contactSubline: event.target.value }))}
                  placeholder="ข้อความอธิบายเสริม"
                  value={footerForm.contactSubline}
                />
                <input
                  className="input-field"
                  onChange={(event) => setFooterForm((current) => ({ ...current, copyright: event.target.value }))}
                  placeholder="ข้อความลิขสิทธิ์หรือข้อความปิดท้าย"
                  value={footerForm.copyright}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="primary-button rounded-full px-5 py-3 text-sm" onClick={() => void updateFooterContentMutation.mutate()} type="button">
                บันทึก footer
              </button>
              <button
                className="secondary-button rounded-full px-5 py-3 text-sm"
                onClick={() => {
                  setFooterForm(
                    footerContentQuery.data
                      ? {
                          ...footerContentQuery.data,
                          statusPills: [footerContentQuery.data.statusPills[0], footerContentQuery.data.statusPills[1], footerContentQuery.data.statusPills[2]],
                          quickLinks: footerContentQuery.data.quickLinks.map((link) => ({ ...link })) as FooterContent["quickLinks"],
                          supportLinks: footerContentQuery.data.supportLinks.map((link) => ({ ...link })) as FooterContent["supportLinks"]
                        }
                      : createFooterContentForm()
                  );
                  setFooterError(null);
                  setFooterMessage(null);
                }}
                type="button"
              >
                รีเซ็ตฟอร์ม footer
              </button>
            </div>

            {footerMessage ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{footerMessage}</div> : null}
            {footerError ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{footerError}</div> : null}
          </div>
        </section>

        <section className="panel rounded-[2.5rem] p-6">
          <div className="section-head">
            <div className="section-head__icon">
              <ShieldCheck size={18} />
            </div>
            <p className="section-label">Footer Preview Notes</p>
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">สรุป footer ที่จะถูกนำไปแสดง</h2>
          <div className="mt-5 space-y-4">
            <div className="panel-soft rounded-[1.75rem] p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">{footerForm.badge}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{footerForm.headline}</div>
              <p className="mt-3 text-sm leading-7 muted-text">{footerForm.description}</p>
            </div>
            <div className="panel-soft rounded-[1.75rem] p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">Status Pills</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {footerForm.statusPills.map((pill) => (
                  <span className="icon-chip text-sm" key={pill}>
                    {pill}
                  </span>
                ))}
              </div>
            </div>
            <div className="panel-soft rounded-[1.75rem] p-5">
              <div className="text-sm font-semibold text-slate-950">{footerForm.quickLinksTitle}</div>
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                {footerForm.quickLinks.map((link) => (
                  <div key={`preview-quick-${link.label}-${link.href}`}>
                    {link.label} → {link.href}
                  </div>
                ))}
              </div>
            </div>
            <div className="panel-soft rounded-[1.75rem] p-5">
              <div className="text-sm font-semibold text-slate-950">{footerForm.supportLinksTitle}</div>
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                {footerForm.supportLinks.map((link) => (
                  <div key={`preview-support-${link.label}-${link.href}`}>
                    {link.label} → {link.href}
                  </div>
                ))}
              </div>
            </div>
            <div className="panel-soft rounded-[1.75rem] p-5">
              <div className="text-sm font-semibold text-slate-950">{footerForm.contactTitle}</div>
              <p className="mt-2 text-sm leading-7 muted-text">{footerForm.contactLine}</p>
              <p className="mt-2 text-sm leading-7 muted-text">{footerForm.contactSubline}</p>
              <div className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">{footerForm.copyright}</div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]" id="admin-categories">
        <section className="panel rounded-[2.5rem] p-6">
          <div className="section-head">
            <div className="section-head__icon">
              <FolderCog size={18} />
            </div>
            <p className="section-label">Category Manager</p>
          </div>
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
              <div className="section-head">
                <div className="section-head__icon">
                  <Tags size={18} />
                </div>
                <p className="section-label">Category List</p>
              </div>
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
                      <span className="section-head__icon h-10 w-10 shrink-0">
                        <Tags size={16} />
                      </span>
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

      <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]" id="admin-products">
        <section className="panel rounded-[2.5rem] p-6">
          <div className="section-head">
            <div className="section-head__icon">
              <PackagePlus size={18} />
            </div>
            <p className="section-label">Product Manager</p>
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">กำหนดราคาและแก้ไขราคาสินค้า</h2>
          <p className="mt-2 text-sm muted-text">ใช้ส่วนนี้เพิ่มสินค้าใหม่ กำหนดราคาขาย ราคาอ้างอิง และแก้ไขข้อมูลสินค้าที่หน้าร้านต้องแสดงให้ลูกค้าเห็น</p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <select
              className="input-field"
              onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))}
              value={productForm.categoryId}
            >
              <option value="">เลือกหมวดหมู่สินค้า</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              className="input-field"
              onChange={(event) => setProductForm((current) => ({ ...current, type: event.target.value as ProductRow["type"] }))}
              value={productForm.type}
            >
              {productTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              className="input-field"
              onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="ชื่อสินค้า"
              value={productForm.name}
            />
            <input
              className="input-field"
              onChange={(event) => setProductForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder="slug เช่น valorant-60-point-code"
              value={productForm.slug}
            />
            <input
              className="input-field"
              inputMode="decimal"
              onChange={(event) => setProductForm((current) => ({ ...current, priceBaht: event.target.value }))}
              placeholder="ราคาขาย (บาท)"
              value={productForm.priceBaht}
            />
            <input
              className="input-field"
              inputMode="decimal"
              onChange={(event) => setProductForm((current) => ({ ...current, compareAtBaht: event.target.value }))}
              placeholder="ราคาเต็มหรือราคาเดิม (บาท)"
              value={productForm.compareAtBaht}
            />
            <input
              className="input-field"
              onChange={(event) => setProductForm((current) => ({ ...current, badge: event.target.value }))}
              placeholder="ป้ายสินค้า เช่น แนะนำ หรือ พร้อมส่ง"
              value={productForm.badge}
            />
            <input
              className="input-field"
              onChange={(event) => setProductForm((current) => ({ ...current, coverImage: event.target.value }))}
              placeholder="ลิงก์รูปหน้าปกสินค้า"
              value={productForm.coverImage}
            />
          </div>

          <textarea
            className="input-field mt-3 min-h-28"
            onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="รายละเอียดสินค้าสำหรับหน้าร้าน"
            value={productForm.description}
          />
          <textarea
            className="input-field mt-3 min-h-24"
            onChange={(event) => setProductForm((current) => ({ ...current, deliveryNote: event.target.value }))}
            placeholder="ข้อความแจ้งวิธีรับสินค้า หรือเงื่อนไขหลังสั่งซื้อ"
            value={productForm.deliveryNote}
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="icon-chip text-sm">
              <input
                checked={productForm.isActive}
                onChange={(event) => setProductForm((current) => ({ ...current, isActive: event.target.checked }))}
                type="checkbox"
              />
              เปิดขายสินค้า
            </label>
            <div className="icon-chip text-sm">
              <BadgeDollarSign className="icon-chip__icon" size={15} />
              ราคาที่จะบันทึก: {formatMoney(parseBahtToCents(productForm.priceBaht))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="primary-button rounded-full px-4 py-3 text-sm"
              onClick={() => void (productForm.id ? updateProductMutation.mutate() : createProductMutation.mutate())}
              type="button"
            >
              {productForm.id ? "บันทึกการแก้ไขราคาและสินค้า" : "เพิ่มสินค้าใหม่พร้อมราคา"}
            </button>
            <button
              className="secondary-button rounded-full px-4 py-3 text-sm"
              onClick={() => {
                setProductForm({
                  ...emptyProductForm,
                  categoryId: categories[0]?.id ?? ""
                });
                setProductError(null);
                setProductMessage(null);
              }}
              type="button"
            >
              ล้างฟอร์มสินค้า
            </button>
          </div>

          {productMessage ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{productMessage}</div> : null}
          {productError ? <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{productError}</div> : null}
        </section>

        <section className="panel rounded-[2.5rem] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="section-head">
                <div className="section-head__icon">
                  <BadgeDollarSign size={18} />
                </div>
                <p className="section-label">Product Price List</p>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">สินค้าที่ตั้งราคาไว้ในร้าน</h2>
            </div>
            <div className="icon-chip text-sm">{products.length} สินค้า</div>
          </div>

          <div className="mt-5 space-y-3">
            {products.map((product) => {
              const category = categories.find((item) => item.id === product.categoryId);

              return (
                <div className="panel-soft rounded-[1.75rem] px-4 py-4" key={product.id}>
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="section-head__icon h-10 w-10 shrink-0">
                          <PackageCheck size={16} />
                        </span>
                        <div className="text-base font-semibold text-slate-950">{product.name}</div>
                        <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-medium text-[var(--brand)]">{product.type}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${product.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                          {product.isActive ? "เปิดขาย" : "ปิดขาย"}
                        </span>
                      </div>
                      <div className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-400">{product.slug}</div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-700">
                        <span>หมวด: {category?.name ?? "-"}</span>
                        <span>ราคาขาย: {formatMoney(product.priceCents)}</span>
                        <span>ราคาเดิม: {product.compareAtCents ? formatMoney(product.compareAtCents) : "-"}</span>
                      </div>
                      {product.badge ? <div className="mt-2 text-sm muted-text">ป้าย: {product.badge}</div> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="secondary-button rounded-full px-4 py-2 text-sm"
                        onClick={() => {
                          setProductForm({
                            id: product.id,
                            categoryId: product.categoryId,
                            slug: product.slug,
                            name: product.name,
                            description: product.description,
                            type: product.type,
                            priceBaht: String(product.priceCents / 100),
                            compareAtBaht: product.compareAtCents ? String(product.compareAtCents / 100) : "",
                            deliveryNote: product.deliveryNote ?? "",
                            badge: product.badge ?? "",
                            coverImage: product.coverImage ?? "",
                            isActive: product.isActive
                          });
                          setProductError(null);
                          setProductMessage(`กำลังแก้ไขสินค้า ${product.name}`);
                        }}
                        type="button"
                      >
                        แก้ไขราคา
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {products.length === 0 ? <div className="rounded-[1.75rem] border border-dashed border-[var(--line)] px-4 py-5 text-sm muted-text">ยังไม่มีสินค้าในระบบ</div> : null}
          </div>
        </section>
      </div>

      <section className="panel rounded-[2.5rem] p-6" id="admin-inventory">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="section-head">
              <div className="section-head__icon">
                <KeyRound size={18} />
              </div>
              <p className="section-label">Inventory Control</p>
            </div>
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
              <div className="section-head">
                <div className="section-head__icon">
                  <ScanSearch size={18} />
                </div>
                <p className="section-label">เพิ่มหรือแก้ไขรายชิ้น</p>
              </div>
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
              <div className="section-head">
                <div className="section-head__icon">
                  <Boxes size={18} />
                </div>
                <p className="section-label">นำเข้าหลายรายการ</p>
              </div>
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
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                    <PackageCheck size={15} className="text-[var(--brand)]" />
                    {item.name}
                  </div>
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
                        <span className="section-head__icon h-10 w-10 shrink-0">
                          <KeyRound size={16} />
                        </span>
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
          <div className="section-head">
            <div className="section-head__icon">
              <PlugZap size={18} />
            </div>
            <p className="section-label">Provider Config</p>
          </div>
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
          <div className="section-head">
            <div className="section-head__icon">
              <ReceiptText size={18} />
            </div>
            <p className="section-label">Recent Orders</p>
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">ออเดอร์ล่าสุด</h2>
          <div className="mt-4 space-y-3">
            {orderQuery.data?.slice(0, 8).map((order) => (
              <div className="panel-soft rounded-[1.5rem] px-4 py-4" key={order.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                      <ReceiptText size={15} className="text-[var(--brand)]" />
                      {order.id}
                    </div>
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
            <div className="section-head">
              <div className="section-head__icon">
                <Workflow size={18} />
              </div>
              <p className="section-label">Queue Jobs</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">งานค้างและงานที่พร้อม requeue</h2>
          </div>
          <div className="rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-slate-600">ทั้งหมด {jobsQuery.data?.length ?? 0} งาน</div>
        </div>
        <div className="mt-4 space-y-3">
          {jobsQuery.data?.map((job) => (
            <div className="panel-soft rounded-[1.5rem] px-4 py-4" key={job.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                    <RefreshCcw size={15} className="text-[var(--brand)]" />
                    {job.kind}
                  </div>
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
