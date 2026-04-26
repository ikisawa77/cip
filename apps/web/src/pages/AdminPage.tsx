import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { footerContentDefaults, homepageContentDefaults, promptpayConfigDefaults, type FooterContent, type HomepageContent } from "@cip/shared";
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
  paymentMethod?: "wallet" | "promptpay_qr";
  userId?: string;
  userEmail?: string;
  userDisplayName?: string;
  providerKey?: string | null;
  providerOrderId?: string | null;
  providerStatus?: string | null;
};

type AuditLogRow = {
  id: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  detail: string;
  createdAt: string;
};

type WebhookEventRow = {
  id: string;
  providerKey: string;
  eventType: string;
  payloadJson: string;
  processed: boolean;
  createdAt: string;
  replayCount: number;
  lastReplayOk: boolean | null;
  lastReplayMessage: string | null;
  lastReplayAt: string | null;
};

type WebhookReplayAttemptRow = {
  id: string;
  webhookEventId: string;
  actorUserId: string | null;
  ok: boolean;
  message: string;
  createdAt: string;
};

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type KbizMonitoringRow = {
  latestImportAt: string | null;
  processedFiles: number;
  recentProcessedFiles: Array<{
    id: string;
    filePath: string;
    fileSignature: string;
    importedAt: string;
    sourceCreatedAt: string | null;
  }>;
  recentEvents: Array<{
    id: string;
    createdAt: string;
    processed: boolean;
    payloadJson: string;
  }>;
};

type OrderDetailRow = {
  id: string;
  status: string;
  subtotalCents: number;
  totalCents: number;
  paymentMethod: "wallet" | "promptpay_qr";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPriceCents: number;
    deliveryPayload: string | null;
  }>;
  formInput: Record<string, string>;
  paymentIntent: PaymentIntentRow | null;
  providerLink: {
    providerKey: string;
    providerOrderId: string | null;
    latestStatus: string;
    updatedAt: string;
  } | null;
  audits: AuditLogRow[];
};

type JobRow = {
  id: string;
  kind: string;
  status: string;
  payloadJson: string;
  updatedAt: string;
  lastError?: string | null;
};

type PaymentIntentRow = {
  id: string;
  provider: "promptpay_qr" | "kbiz_match" | "truemoney_gift";
  status: "pending" | "paid" | "expired" | "failed";
  amountCents: number;
  uniqueAmountCents: number;
  referenceCode: string;
  expiresAt: string;
  paidAt: string | null;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  targetType: "wallet" | "order";
  targetId: string;
  createdAt: string;
  promptpay: {
    isConfigured: boolean;
    merchantName: string;
    merchantCity: string;
    accountLabel: string;
    instructions: string;
    receiverType: "phone" | "nationalId" | "taxId";
    receiverHint: string;
    qrPayload: string | null;
    qrDataUrl: string | null;
  } | null;
};

type PaymentMatcherResult = {
  total: number;
  matched: number;
  unmatched: number;
  results: Array<{
    transactionId: string;
    amountCents: number;
    matched: boolean;
    reason: string;
    paymentIntentId: string | null;
    referenceCode: string | null;
  }>;
};

const inventoryKinds: Array<InventoryItemRow["kind"]> = ["code", "download_link", "account", "generic"];

const emptyCategoryForm = {
  id: null as string | null,
  slug: "",
  name: "",
  description: "",
  icon: ""
};

const providerConfigExamples: Record<string, { title: string; description: string; value: Record<string, unknown> }> = {
  promptpay: {
    title: "ตัวอย่าง config สำหรับ PromptPay",
    description: "ใช้ provider นี้สำหรับสร้าง QR รับเงินจริงบนหน้า `/topup` และ `/product/:slug`",
    value: promptpayConfigDefaults
  },
  kbiz: {
    title: "ตัวอย่าง config สำหรับ K-Biz statement bridge",
    description: "ตั้ง sourceDir ให้ชี้ไปโฟลเดอร์ export statement และใส่ archiveDir ถ้าต้องการย้ายไฟล์ที่ import แล้ว",
    value: {
      sourceDir: "C:\\\\bank-export\\\\kbiz",
      archiveDir: "C:\\\\bank-export\\\\kbiz\\\\processed",
      errorDir: "C:\\\\bank-export\\\\kbiz\\\\error",
      filePattern: "kbiz.*\\.(csv|json)$",
      recursive: true,
      stableMs: 5000,
      archiveDuplicates: true,
      maxFiles: 5
    }
  },
  wepay: {
    title: "ตัวอย่าง config สำหรับ Wepay bridge",
    description: "รองรับทั้งโหมด webhook จริงและโหมด instant สำหรับทดสอบ flow provider order",
    value: {
      mode: "webhook",
      endpoint: "https://provider.example.com/api/orders",
      method: "POST",
      apiKey: "env:WEPAY_API_KEY",
      authHeaderName: "Authorization",
      authScheme: "Bearer",
      callbackSecret: "env:WEPAY_CALLBACK_SECRET",
      staticPayload: {
        channel: "cip-store"
      }
    }
  },
  "24payseller": {
    title: "ตัวอย่าง config สำหรับ 24Payseller bridge",
    description: "เหมาะกับสินค้าแบบ ID/PASS order โดยระบบจะส่ง formInput ไปให้ provider และรอ callback กลับมาปิดงานหรือส่ง account payload",
    value: {
      mode: "webhook",
      endpoint: "https://provider.example.com/api/orders",
      method: "POST",
      apiKey: "env:WEPAY_API_KEY",
      authHeaderName: "Authorization",
      authScheme: "Bearer",
      callbackSecret: "env:PAYS24SELLER_CALLBACK_SECRET",
      staticPayload: {
        productGroup: "id-pass",
        source: "cip-store"
      }
    }
  },
  peamsub24hr: {
    title: "ตัวอย่าง config สำหรับ Peamsub24hr bridge",
    description: "เหมาะกับสินค้า premium หรือ subscription โดยระบบจะส่ง formInput ไปให้ provider และรอ callback กลับมาพร้อม credential payload",
    value: {
      mode: "webhook",
      endpoint: "https://provider.example.com/api/premium-orders",
      method: "POST",
      apiKey: "env:PEAMSUB24HR_API_KEY",
      authHeaderName: "Authorization",
      authScheme: "Bearer",
      callbackSecret: "env:PEAMSUB24HR_CALLBACK_SECRET",
      staticPayload: {
        packageType: "premium",
        source: "cip-store"
      }
    }
  },
  truemoney: {
    title: "TrueMoney top-up bridge",
    description: "Webhook config example for truemoney_gift payment intents and external bridge callbacks.",
    value: {
      callbackSecret: "env:TRUEMONEY_CALLBACK_SECRET",
      acceptedStatuses: ["success", "redeemed", "completed"],
      notes: "POST /api/webhooks/truemoney with referenceCode and status=success"
    }
  },
  rdcw: {
    title: "ตัวอย่าง config สำหรับ RDCW bridge",
    description: "เหมาะกับสินค้า account stock หรือ code delivery ที่ provider จะตอบกลับผ่าน webhook พร้อม code / pin / serial / downloadUrl",
    value: {
      mode: "webhook",
      endpoint: "https://provider.example.com/api/stock-orders",
      method: "POST",
      apiKey: "env:RDCW_API_KEY",
      authHeaderName: "Authorization",
      authScheme: "Bearer",
      callbackSecret: "env:RDCW_CALLBACK_SECRET",
      staticPayload: {
        source: "cip-store",
        category: "account-stock"
      }
    }
  }
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

function buildQueryString(input: Record<string, string | null | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    const normalizedValue = value?.trim();
    if (normalizedValue) {
      params.set(key, normalizedValue);
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
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
  { label: "การชำระเงิน", href: "#admin-payments", icon: BadgeDollarSign },
  { label: "ออเดอร์ล่าสุด", href: "#admin-orders", icon: ReceiptText },
  { label: "คิวงาน", href: "#admin-jobs", icon: Workflow }
] as const;

const overviewCardMeta = [
  { label: "จำนวนออเดอร์", icon: ReceiptText },
  { label: "รายได้รวม", icon: PackageCheck },
  { label: "ผู้ใช้งาน", icon: UserRound },
  { label: "งานค้างในคิว", icon: Workflow }
] as const;

const adminFilterStorageKey = "cip.admin.saved-filters.v1";

type AdminSavedFilters = {
  paymentSearch: string;
  paymentProviderFilter: string;
  paymentStatusFilter: string;
  orderSearch: string;
  orderStatusFilter: string;
  orderPaymentMethodFilter: string;
  orderProviderFilter: string;
  auditSearch: string;
  auditEntityTypeFilter: string;
  auditActionFilter: string;
  webhookSearch: string;
  webhookProviderFilter: string;
  webhookEventTypeFilter: string;
  webhookProcessedFilter: string;
  webhookReplayStatusFilter: string;
};

function readAdminSavedFilters(): Partial<AdminSavedFilters> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(adminFilterStorageKey);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "object" && parsed && !Array.isArray(parsed) ? (parsed as Partial<AdminSavedFilters>) : {};
  } catch {
    return {};
  }
}

function writeAdminSavedFilters(input: Partial<AdminSavedFilters>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(adminFilterStorageKey, JSON.stringify(input));
}

function clearAdminSavedFilters() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(adminFilterStorageKey);
}

function getTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = getTotalPages(items.length, pageSize);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    page: safePage,
    totalPages,
    items: items.slice(start, start + pageSize)
  };
}

function PaginationControls({
  page,
  totalPages,
  onPageChange
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-[var(--line)] bg-white/88 px-4 py-3 text-sm text-slate-600">
      <div>
        หน้า <span className="font-semibold text-slate-950">{page}</span> จาก{" "}
        <span className="font-semibold text-slate-950">{totalPages}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="secondary-button rounded-full px-4 py-2 text-xs" disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button">
          ก่อนหน้า
        </button>
        <button className="secondary-button rounded-full px-4 py-2 text-xs" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} type="button">
          ถัดไป
        </button>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { user, openAuth } = useAuth();
  const queryClient = useQueryClient();
  const [initialSavedFilters] = useState(readAdminSavedFilters);
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
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSearch, setPaymentSearch] = useState(initialSavedFilters.paymentSearch ?? "");
  const [paymentProviderFilter, setPaymentProviderFilter] = useState(initialSavedFilters.paymentProviderFilter ?? "all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(initialSavedFilters.paymentStatusFilter ?? "all");
  const [paymentPage, setPaymentPage] = useState(1);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState(initialSavedFilters.orderSearch ?? "");
  const [orderStatusFilter, setOrderStatusFilter] = useState(initialSavedFilters.orderStatusFilter ?? "all");
  const [orderPaymentMethodFilter, setOrderPaymentMethodFilter] = useState(initialSavedFilters.orderPaymentMethodFilter ?? "all");
  const [orderProviderFilter, setOrderProviderFilter] = useState(initialSavedFilters.orderProviderFilter ?? "all");
  const [ordersPage, setOrdersPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState(initialSavedFilters.auditSearch ?? "");
  const [auditEntityTypeFilter, setAuditEntityTypeFilter] = useState(initialSavedFilters.auditEntityTypeFilter ?? "all");
  const [auditActionFilter, setAuditActionFilter] = useState(initialSavedFilters.auditActionFilter ?? "all");
  const [auditPage, setAuditPage] = useState(1);
  const [webhookSearch, setWebhookSearch] = useState(initialSavedFilters.webhookSearch ?? "");
  const [webhookProviderFilter, setWebhookProviderFilter] = useState(initialSavedFilters.webhookProviderFilter ?? "all");
  const [webhookEventTypeFilter, setWebhookEventTypeFilter] = useState(initialSavedFilters.webhookEventTypeFilter ?? "all");
  const [webhookProcessedFilter, setWebhookProcessedFilter] = useState(initialSavedFilters.webhookProcessedFilter ?? "all");
  const [webhookReplayStatusFilter, setWebhookReplayStatusFilter] = useState(initialSavedFilters.webhookReplayStatusFilter ?? "all");
  const [webhookPage, setWebhookPage] = useState(1);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [webhookMessage, setWebhookMessage] = useState<string | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [jobsPage, setJobsPage] = useState(1);
  const [paymentMatcherPayload, setPaymentMatcherPayload] = useState(
    JSON.stringify(
      [
        {
          transactionId: "txn-demo-001",
          amountCents: 10019,
          occurredAt: new Date().toISOString(),
          note: "รายการโอนจาก statement ตัวอย่าง"
        }
      ],
      null,
      2
    )
  );

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
    queryKey: ["admin", "orders", orderSearch, orderStatusFilter, orderPaymentMethodFilter, orderProviderFilter, ordersPage],
    queryFn: () =>
      apiFetch<PaginatedResponse<OrderRow>>(
        `/api/admin/orders${buildQueryString({
          query: orderSearch,
          status: orderStatusFilter !== "all" ? orderStatusFilter : undefined,
          paymentMethod: orderPaymentMethodFilter !== "all" ? orderPaymentMethodFilter : undefined,
          providerKey: orderProviderFilter !== "all" ? orderProviderFilter : undefined,
          page: String(ordersPage),
          pageSize: "8"
        })}`
      ),
    enabled: user?.role === "admin"
  });

  const selectedOrderDetailQuery = useQuery({
    queryKey: ["admin", "orders", "detail", selectedOrderId],
    queryFn: () => apiFetch<OrderDetailRow>(`/api/admin/orders/${selectedOrderId}`),
    enabled: user?.role === "admin" && Boolean(selectedOrderId)
  });

  const auditLogsQuery = useQuery({
    queryKey: ["admin", "audit-logs", selectedOrderId, auditSearch, auditEntityTypeFilter, auditActionFilter, auditPage],
    queryFn: () =>
      apiFetch<PaginatedResponse<AuditLogRow>>(
        `/api/admin/audit-logs${buildQueryString({
          entityType:
            selectedOrderId || auditEntityTypeFilter === "all"
              ? selectedOrderId
                ? "order"
                : undefined
              : auditEntityTypeFilter,
          entityId: selectedOrderId,
          action: auditActionFilter !== "all" ? auditActionFilter : undefined,
          query: auditSearch,
          page: String(auditPage),
          pageSize: "8"
        })}`
      ),
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
    queryKey: ["admin", "jobs", jobsPage],
    queryFn: () => apiFetch<PaginatedResponse<JobRow>>(`/api/admin/jobs${buildQueryString({ page: String(jobsPage), pageSize: "8" })}`),
    enabled: user?.role === "admin"
  });
  const paymentIntentsQuery = useQuery({
    queryKey: ["admin", "payment-intents", paymentSearch, paymentProviderFilter, paymentStatusFilter, paymentPage],
    queryFn: () =>
      apiFetch<PaginatedResponse<PaymentIntentRow>>(
        `/api/admin/payment-intents${buildQueryString({
          query: paymentSearch,
          provider: paymentProviderFilter !== "all" ? paymentProviderFilter : undefined,
          status: paymentStatusFilter !== "all" ? paymentStatusFilter : undefined,
          page: String(paymentPage),
          pageSize: "8"
        })}`
      ),
    enabled: user?.role === "admin"
  });
  const kbizMonitoringQuery = useQuery({
    queryKey: ["admin", "kbiz-monitoring"],
    queryFn: () => apiFetch<KbizMonitoringRow>("/api/admin/kbiz-monitoring"),
    enabled: user?.role === "admin"
  });
  const webhooksQuery = useQuery({
    queryKey: ["admin", "webhooks", webhookSearch, webhookProviderFilter, webhookEventTypeFilter, webhookProcessedFilter, webhookReplayStatusFilter, webhookPage],
    queryFn: () =>
      apiFetch<PaginatedResponse<WebhookEventRow>>(
        `/api/admin/webhooks${buildQueryString({
          query: webhookSearch,
          providerKey: webhookProviderFilter !== "all" ? webhookProviderFilter : undefined,
          eventType: webhookEventTypeFilter !== "all" ? webhookEventTypeFilter : undefined,
          processed: webhookProcessedFilter !== "all" ? webhookProcessedFilter : undefined,
          replayStatus: webhookReplayStatusFilter !== "all" ? webhookReplayStatusFilter : undefined,
          page: String(webhookPage),
          pageSize: "8"
        })}`
      ),
    enabled: user?.role === "admin"
  });
  const webhookReplayHistoryQuery = useQuery({
    queryKey: ["admin", "webhooks", "replay-history", selectedWebhookId],
    queryFn: () => apiFetch<WebhookReplayAttemptRow[]>(`/api/admin/webhooks/${selectedWebhookId}/replay-history`),
    enabled: user?.role === "admin" && Boolean(selectedWebhookId)
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
    onSuccess: async (result) => {
      setProviderSyncMessage(`${result.providerKey}: ${result.note}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "webhooks"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "webhooks", "replay-history"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "kbiz-monitoring"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] })
      ]);
    },
    onError: (error) => {
      setProviderSyncMessage(error instanceof Error ? error.message : "sync provider ไม่สำเร็จ");
    }
  });

  const webhookReplayMutation = useMutation({
    mutationFn: (webhookId: string) =>
      apiFetch<{ ok: boolean; message: string }>(`/api/admin/webhooks/${webhookId}/replay`, {
        method: "POST",
        body: JSON.stringify({})
      }),
    onSuccess: async (result) => {
      setWebhookError(null);
      setWebhookMessage(result.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "webhooks"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "orders", "detail"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "kbiz-monitoring"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "payment-intents"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
      ]);
    },
    onError: (error) => {
      setWebhookMessage(null);
      setWebhookError(error instanceof Error ? error.message : "replay webhook ไม่สำเร็จ");
    }
  });

  const orderActionMutation = useMutation({
    mutationFn: ({
      orderId,
      action,
      note
    }: {
      orderId: string;
      action: "manual-fulfill" | "retry" | "manual-review" | "refund";
      note?: string;
    }) =>
      apiFetch<OrderDetailRow>(`/api/admin/orders/${orderId}/${action}`, {
        method: "POST",
        body: JSON.stringify(note ? { note } : {})
      }),
    onSuccess: async (result, variables) => {
      setOrderError(null);
      setOrderMessage(`อัปเดตออเดอร์ ${result.id} ด้วย action ${variables.action} เรียบร้อย`);
      setSelectedOrderId(result.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "orders", "detail", result.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
      ]);
    },
    onError: (error) => {
      setOrderMessage(null);
      setOrderError(error instanceof Error ? error.message : "จัดการออเดอร์ไม่สำเร็จ");
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
  const paymentStatusMutation = useMutation({
    mutationFn: ({
      paymentIntentId,
      status,
      note
    }: {
      paymentIntentId: string;
      status: "paid" | "failed" | "expired";
      note?: string;
    }) =>
      apiFetch<PaymentIntentRow>(`/api/admin/payment-intents/${paymentIntentId}/status`, {
        method: "POST",
        body: JSON.stringify({ status, note })
      }),
    onSuccess: async (result) => {
      setPaymentError(null);
      setPaymentMessage(`อัปเดต ${result.referenceCode} เป็น ${result.status} เรียบร้อย`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "payment-intents"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "orders"] })
      ]);
    },
    onError: (error) => {
      setPaymentMessage(null);
      setPaymentError(error instanceof Error ? error.message : "อัปเดต payment intent ไม่สำเร็จ");
    }
  });
  const paymentMatcherMutation = useMutation({
    mutationFn: () =>
      apiFetch<PaymentMatcherResult>("/api/admin/payment-intents/match-transactions", {
        method: "POST",
        body: JSON.stringify({
          transactions: JSON.parse(paymentMatcherPayload)
        })
      }),
    onSuccess: async (result) => {
      setPaymentError(null);
      setPaymentMessage(`จับคู่แล้ว ${result.matched}/${result.total} รายการ`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "payment-intents"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "orders"] })
      ]);
    },
    onError: (error) => {
      setPaymentMessage(null);
      setPaymentError(error instanceof Error ? error.message : "จับคู่ธุรกรรมไม่สำเร็จ");
    }
  });

  const paymentMatcherResult = paymentMatcherMutation.data ?? null;

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
    const operationsPageOrders = orderQuery.data?.items ?? [];
    const firstOrder = operationsPageOrders[0];
    if (!firstOrder) {
      if (selectedOrderId) {
        setSelectedOrderId(null);
      }
      return;
    }

    const stillExists = operationsPageOrders.some((order) => order.id === selectedOrderId);
    if (!selectedOrderId || !stillExists) {
      setSelectedOrderId(firstOrder.id);
    }
  }, [orderQuery.data, selectedOrderId]);

  useEffect(() => {
    writeAdminSavedFilters({
      paymentSearch,
      paymentProviderFilter,
      paymentStatusFilter,
      orderSearch,
      orderStatusFilter,
      orderPaymentMethodFilter,
      orderProviderFilter,
      auditSearch,
      auditEntityTypeFilter,
      auditActionFilter,
      webhookSearch,
      webhookProviderFilter,
      webhookEventTypeFilter,
      webhookProcessedFilter,
      webhookReplayStatusFilter
    });
  }, [
    paymentSearch,
    paymentProviderFilter,
    paymentStatusFilter,
    orderSearch,
    orderStatusFilter,
    orderPaymentMethodFilter,
    orderProviderFilter,
    auditSearch,
    auditEntityTypeFilter,
    auditActionFilter,
    webhookSearch,
    webhookProviderFilter,
    webhookEventTypeFilter,
    webhookProcessedFilter,
    webhookReplayStatusFilter
  ]);

  useEffect(() => {
    setPaymentPage(1);
  }, [paymentSearch, paymentProviderFilter, paymentStatusFilter]);

  useEffect(() => {
    setOrdersPage(1);
  }, [orderSearch, orderStatusFilter, orderPaymentMethodFilter, orderProviderFilter]);

  useEffect(() => {
    setAuditPage(1);
  }, [auditSearch, auditEntityTypeFilter, auditActionFilter, selectedOrderId]);

  useEffect(() => {
    setWebhookPage(1);
  }, [webhookSearch, webhookProviderFilter, webhookEventTypeFilter, webhookProcessedFilter, webhookReplayStatusFilter]);

  useEffect(() => {
    const currentWebhookRows = webhooksQuery.data?.items ?? [];
    const firstWebhook = currentWebhookRows[0] ?? null;

    if (!firstWebhook) {
      if (selectedWebhookId) {
        setSelectedWebhookId(null);
      }
      return;
    }

    const stillExists = currentWebhookRows.some((event) => event.id === selectedWebhookId);
    if (!selectedWebhookId || !stillExists) {
      setSelectedWebhookId(firstWebhook.id);
    }
  }, [selectedWebhookId, webhooksQuery.data]);

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
  const pagedPaymentIntents =
    paymentIntentsQuery.data ?? ({ items: [], total: 0, page: paymentPage, pageSize: 8, totalPages: 1 } satisfies PaginatedResponse<PaymentIntentRow>);
  const pagedOrders =
    orderQuery.data ?? ({ items: [], total: 0, page: ordersPage, pageSize: 8, totalPages: 1 } satisfies PaginatedResponse<OrderRow>);
  const operationsOrders = pagedOrders;
  const pagedAuditLogs =
    auditLogsQuery.data ?? ({ items: [], total: 0, page: auditPage, pageSize: 8, totalPages: 1 } satisfies PaginatedResponse<AuditLogRow>);
  const pagedWebhooks =
    webhooksQuery.data ?? ({ items: [], total: 0, page: webhookPage, pageSize: 8, totalPages: 1 } satisfies PaginatedResponse<WebhookEventRow>);
  const selectedWebhook = pagedWebhooks.items.find((event) => event.id === selectedWebhookId) ?? pagedWebhooks.items[0] ?? null;
  const webhookEventTypes = Array.from(new Set((webhooksQuery.data?.items ?? []).map((event) => event.eventType))).sort();
  const pagedJobs =
    jobsQuery.data ?? ({ items: [], total: 0, page: jobsPage, pageSize: 8, totalPages: 1 } satisfies PaginatedResponse<JobRow>);
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

  function resetPaymentFilters() {
    setPaymentSearch("");
    setPaymentProviderFilter("all");
    setPaymentStatusFilter("all");
  }

  function resetOrderFilters() {
    setOrderSearch("");
    setOrderStatusFilter("all");
    setOrderPaymentMethodFilter("all");
    setOrderProviderFilter("all");
  }

  function resetAuditFilters() {
    setAuditSearch("");
    setAuditEntityTypeFilter("all");
    setAuditActionFilter("all");
  }

  function resetWebhookFilters() {
    setWebhookSearch("");
    setWebhookProviderFilter("all");
    setWebhookEventTypeFilter("all");
    setWebhookProcessedFilter("all");
    setWebhookReplayStatusFilter("all");
  }

  function clearSavedAdminFilters() {
    clearAdminSavedFilters();
    resetPaymentFilters();
    resetOrderFilters();
    resetAuditFilters();
    resetWebhookFilters();
  }

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
                {providerConfigExamples[selectedProvider] ? (
                  <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4 text-xs leading-7 text-slate-200">
                    <div className="font-semibold text-white">{providerConfigExamples[selectedProvider].title}</div>
                    <div className="mt-2">{providerConfigExamples[selectedProvider].description}</div>
                    <pre className="mt-3 overflow-auto rounded-[1rem] bg-slate-950/55 px-4 py-3 text-[11px] text-slate-100">
                      {JSON.stringify(providerConfigExamples[selectedProvider].value, null, 2)}
                    </pre>
                  </div>
                ) : null}
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

        <section className="panel rounded-[2.5rem] p-6" id="admin-payments">
          <div className="section-head">
            <div className="section-head__icon">
              <BadgeDollarSign size={18} />
            </div>
            <p className="section-label">Payment Intents</p>
          </div>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">รายการชำระเงินล่าสุด</h2>
              <p className="mt-2 text-sm muted-text">ใช้ยืนยันการโอนจากหลังบ้าน หรือทำเครื่องหมายว่า failed / expired ได้โดยไม่ต้องพึ่งปุ่ม dev</p>
            </div>
            <div className="rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-slate-600">
              ทั้งหมด {pagedPaymentIntents.total} รายการ
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[1.3fr_0.8fr_0.8fr_auto]">
            <input className="input-field" onChange={(event) => setPaymentSearch(event.target.value)} placeholder="ค้นหา reference / user / target" value={paymentSearch} />
            <select className="input-field" onChange={(event) => setPaymentProviderFilter(event.target.value)} value={paymentProviderFilter}>
              <option value="all">ทุก provider</option>
              <option value="promptpay_qr">promptpay_qr</option>
              <option value="truemoney_gift">truemoney_gift</option>
              <option value="kbiz_match">kbiz_match</option>
            </select>
            <select className="input-field" onChange={(event) => setPaymentStatusFilter(event.target.value)} value={paymentStatusFilter}>
              <option value="all">ทุกสถานะ</option>
              <option value="pending">pending</option>
              <option value="paid">paid</option>
              <option value="expired">expired</option>
              <option value="failed">failed</option>
            </select>
            <button className="secondary-button rounded-full px-4 py-2 text-xs" onClick={resetPaymentFilters} type="button">
              รีเซ็ต filter
            </button>
          </div>
          <div className="mt-3 text-xs text-slate-500">ระบบจะจำ filter ล่าสุดของแอดมินไว้บนเครื่องนี้ให้อัตโนมัติ</div>

          <div className="mt-4 grid gap-3">
            {pagedPaymentIntents.items.map((intent) => (
              <div className="panel-soft rounded-[1.6rem] px-4 py-4" key={intent.id}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-slate-950">{intent.referenceCode}</div>
                      <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-600">{intent.provider}</span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                          intent.status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : intent.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {intent.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-700">
                      {intent.userDisplayName} ({intent.userEmail}) · {intent.targetType} · {formatMoney(intent.uniqueAmountCents)}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      สร้างเมื่อ {formatDate(intent.createdAt)} · หมดอายุ {formatDate(intent.expiresAt)}
                    </div>
                    {intent.promptpay ? (
                      <div className="mt-3 rounded-[1.25rem] border border-[var(--line)] bg-white/88 px-4 py-3 text-sm text-slate-700">
                        <div>บัญชีรับเงิน: {intent.promptpay.accountLabel}</div>
                        <div>ปลายทาง: {intent.promptpay.receiverHint}</div>
                        <div>merchant: {intent.promptpay.merchantName}</div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="secondary-button rounded-full px-4 py-2 text-xs"
                      onClick={() => {
                        const command =
                          intent.provider === "truemoney_gift"
                            ? `curl -X POST http://127.0.0.1:3001/api/webhooks/truemoney -H "Content-Type: application/json" -d "{\\"referenceCode\\":\\"${intent.referenceCode}\\",\\"status\\":\\"success\\"}"`
                            : `pnpm --filter @cip/api webhook:promptpay --payment-intent-id ${intent.id}`;
                        void navigator.clipboard.writeText(command);
                        setPaymentError(null);
                        setPaymentMessage(
                          intent.provider === "truemoney_gift"
                            ? `คัดลอกคำสั่ง webhook สำหรับ ${intent.referenceCode} แล้ว`
                            : `คัดลอกคำสั่งยิง signed webhook สำหรับ ${intent.referenceCode} แล้ว`
                        );
                      }}
                      type="button"
                    >
                      คัดลอกคำสั่ง webhook
                    </button>
                    <button
                      className="secondary-button rounded-full px-4 py-2 text-xs"
                      disabled={intent.status === "paid" || paymentStatusMutation.isPending}
                      onClick={() => void paymentStatusMutation.mutate({ paymentIntentId: intent.id, status: "paid", note: "ยืนยันชำระจากหลังบ้าน" })}
                      type="button"
                    >
                      ยืนยันชำระ
                    </button>
                    <button
                      className="rounded-full border border-amber-200 px-4 py-2 text-xs text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={intent.status !== "pending" || paymentStatusMutation.isPending}
                      onClick={() => void paymentStatusMutation.mutate({ paymentIntentId: intent.id, status: "expired", note: "ทำเครื่องหมายหมดอายุจากหลังบ้าน" })}
                      type="button"
                    >
                      mark expired
                    </button>
                    <button
                      className="rounded-full border border-rose-200 px-4 py-2 text-xs text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={intent.status === "paid" || paymentStatusMutation.isPending}
                      onClick={() => void paymentStatusMutation.mutate({ paymentIntentId: intent.id, status: "failed", note: "ทำเครื่องหมาย failed จากหลังบ้าน" })}
                      type="button"
                    >
                      mark failed
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pagedPaymentIntents.total === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-[var(--line)] px-4 py-5 text-sm muted-text">ยังไม่มี payment intent ให้จัดการ</div>
            ) : null}
          </div>
          <PaginationControls onPageChange={setPaymentPage} page={pagedPaymentIntents.page} totalPages={pagedPaymentIntents.totalPages} />

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[1.85rem] border border-[var(--line)] bg-white/92 px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                    <ScanSearch size={16} className="text-[var(--brand)]" />
                    ตัวจับคู่ธุรกรรม PromptPay
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    วางรายการ statement หรือธุรกรรมในรูปแบบ JSON array เพื่อจับคู่กับ payment intent ที่ยังรอชำระจากหลังบ้านได้ทันที
                  </p>
                </div>
                <button
                  className="secondary-button rounded-full px-4 py-2 text-xs"
                  onClick={() => {
                      const command = "pnpm --filter @cip/api match:promptpay --file .\\\\transactions.json";
                    void navigator.clipboard.writeText(command);
                    setPaymentError(null);
                    setPaymentMessage("คัดลอกคำสั่ง matcher สำหรับเครื่องช่วยหรือ cron แล้ว");
                  }}
                  type="button"
                >
                  คัดลอกคำสั่ง matcher
                </button>
              </div>

              <div className="mt-4 rounded-[1.35rem] bg-[var(--surface-2)] px-4 py-4 text-xs leading-7 text-slate-600">
                <div>`transactionId` คือเลขอ้างอิงจาก statement หรือระบบ bridge</div>
                <div>`amountCents` ต้องเป็นยอดเงินจริงรวม unique amount เช่น 10019</div>
                <div>`occurredAt` ใช้เวลาแบบ ISO เพื่อช่วยแยกหลายรายการที่ยอดใกล้กัน</div>
                <div>`referenceCode` ใส่ได้ถ้าระบบต้นทางรู้เลขอ้างอิงของร้าน</div>
              </div>

              <textarea
                className="mt-4 min-h-[280px] w-full rounded-[1.5rem] border border-[var(--line)] bg-white px-4 py-4 font-mono text-xs text-slate-800 outline-none transition focus:border-[var(--brand)]"
                onChange={(event) => setPaymentMatcherPayload(event.target.value)}
                value={paymentMatcherPayload}
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="primary-button rounded-full px-5 py-3 text-sm"
                  disabled={paymentMatcherMutation.isPending}
                  onClick={() => void paymentMatcherMutation.mutate()}
                  type="button"
                >
                  {paymentMatcherMutation.isPending ? "กำลังจับคู่ธุรกรรม..." : "จับคู่ธุรกรรมตอนนี้"}
                </button>
                <button
                  className="secondary-button rounded-full px-5 py-3 text-sm"
                  onClick={() =>
                    setPaymentMatcherPayload(
                      JSON.stringify(
                        [
                          {
                            transactionId: "txn-demo-001",
                            amountCents: 10019,
                            occurredAt: new Date().toISOString(),
                            note: "รายการตัวอย่างจาก statement"
                          }
                        ],
                        null,
                        2
                      )
                    )
                  }
                  type="button"
                >
                  โหลดตัวอย่างใหม่
                </button>
              </div>
            </div>

            <div className="rounded-[1.85rem] border border-[var(--line)] bg-[var(--text)] px-5 py-5 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-white">
                <BadgeDollarSign size={16} />
                สรุปผล matcher ล่าสุด
              </div>
              {paymentMatcherResult ? (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-300">ทั้งหมด</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{paymentMatcherResult.total}</div>
                    </div>
                    <div className="rounded-[1.35rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-emerald-200">จับคู่สำเร็จ</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{paymentMatcherResult.matched}</div>
                    </div>
                    <div className="rounded-[1.35rem] border border-amber-300/20 bg-amber-300/10 px-4 py-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-amber-100">ต้องตรวจต่อ</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{paymentMatcherResult.unmatched}</div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {paymentMatcherResult.results.map((item) => (
                      <div
                        className={`rounded-[1.35rem] border px-4 py-4 ${
                          item.matched ? "border-emerald-300/20 bg-emerald-400/10" : "border-white/10 bg-white/5"
                        }`}
                        key={item.transactionId}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-medium text-white">{item.transactionId}</div>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] ${
                              item.matched ? "bg-emerald-200 text-emerald-900" : "bg-white/10 text-slate-200"
                            }`}
                          >
                            {item.matched ? "matched" : "pending review"}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-slate-200">{formatMoney(item.amountCents)}</div>
                        <div className="mt-2 text-xs leading-6 text-slate-300">
                          reason: {item.reason}
                          {item.referenceCode ? ` | ref: ${item.referenceCode}` : ""}
                          {item.paymentIntentId ? ` | payment intent: ${item.paymentIntentId}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-[1.35rem] border border-dashed border-white/15 px-4 py-5 text-sm text-slate-300">
                  ยังไม่มีผลลัพธ์รอบล่าสุด ลองวาง statement JSON แล้วกดจับคู่ธุรกรรมเพื่อดูรายการที่จับคู่ได้และรายการที่ยังต้องตรวจด้วยมือ
                </div>
              )}
            </div>
          </div>

          {paymentMessage ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{paymentMessage}</div> : null}
          {paymentError ? <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{paymentError}</div> : null}
        </section>

        <section className="panel rounded-[2.5rem] p-6" id="admin-orders">
          <div className="section-head">
            <div className="section-head__icon">
              <ReceiptText size={18} />
            </div>
            <p className="section-label">Recent Orders</p>
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">ออเดอร์ล่าสุด</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            <input className="input-field" onChange={(event) => setOrderSearch(event.target.value)} placeholder="ค้นหา order / email / note / provider ref" value={orderSearch} />
            <select className="input-field" onChange={(event) => setOrderStatusFilter(event.target.value)} value={orderStatusFilter}>
              <option value="all">ทุกสถานะ</option>
              <option value="pending_payment">pending_payment</option>
              <option value="paid">paid</option>
              <option value="processing">processing</option>
              <option value="fulfilled">fulfilled</option>
              <option value="failed">failed</option>
              <option value="manual_review">manual_review</option>
              <option value="refunded">refunded</option>
            </select>
            <select className="input-field" onChange={(event) => setOrderPaymentMethodFilter(event.target.value)} value={orderPaymentMethodFilter}>
              <option value="all">ทุกช่องทางจ่าย</option>
              <option value="wallet">wallet</option>
              <option value="promptpay_qr">promptpay_qr</option>
            </select>
            <select className="input-field" onChange={(event) => setOrderProviderFilter(event.target.value)} value={orderProviderFilter}>
              <option value="all">ทุก provider</option>
              <option value="wepay">wepay</option>
              <option value="24payseller">24payseller</option>
              <option value="peamsub24hr">peamsub24hr</option>
              <option value="kbiz">kbiz</option>
            </select>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">ระบบจะจำ filter ล่าสุดของแอดมินไว้บนเครื่องนี้ให้อัตโนมัติ</div>
            <button className="secondary-button rounded-full px-4 py-2 text-xs" onClick={resetOrderFilters} type="button">
              รีเซ็ต filter
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {pagedOrders.items.map((order) => (
              <div className="panel-soft rounded-[1.5rem] px-4 py-4" key={order.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                      <ReceiptText size={15} className="text-[var(--brand)]" />
                      {order.id}
                    </div>
                    <div className="mt-1 text-sm muted-text">{formatDate(order.createdAt)}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      {(order.userDisplayName || "-")} • {(order.userEmail || "-")}
                    </div>
                    {order.providerKey ? (
                      <div className="mt-2 text-xs text-slate-500">{order.providerKey} • {order.providerOrderId || "-"} • {order.providerStatus || "-"}</div>
                    ) : null}
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
          <PaginationControls onPageChange={setOrdersPage} page={pagedOrders.page} totalPages={pagedOrders.totalPages} />
        </section>
      </div>

      <section className="panel rounded-[2.5rem] p-6">
        <div className="section-head">
          <div className="section-head__icon">
            <ShieldCheck size={18} />
          </div>
          <p className="section-label">Admin Operations</p>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">order detail, refund และ audit log</h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-3">
            {operationsOrders.items.map((order) => {
              const isSelected = order.id === selectedOrderId;
              return (
                <button
                  className={`panel-soft w-full rounded-[1.5rem] px-4 py-4 text-left transition ${
                    isSelected ? "border border-[var(--brand)] bg-white" : ""
                  }`}
                  key={`ops-${order.id}`}
                  onClick={() => setSelectedOrderId(order.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                        <ReceiptText size={15} className="text-[var(--brand)]" />
                        {order.id}
                      </div>
                      <div className="mt-1 text-sm muted-text">{formatDate(order.createdAt)}</div>
                      <div className="mt-2 text-xs text-slate-500">
                        {(order.userDisplayName || "-")} • {(order.userEmail || "-")}
                      </div>
                      {order.providerKey ? (
                        <div className="mt-2 text-xs text-slate-500">{order.providerKey} • {order.providerOrderId || "-"} • {order.providerStatus || "-"}</div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-900">{formatMoney(order.totalCents)}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--brand)]">{order.status}</div>
                    </div>
                  </div>
                </button>
              );
            })}
            <PaginationControls onPageChange={setOrdersPage} page={operationsOrders.page} totalPages={operationsOrders.totalPages} />
          </div>
          <div className="panel-soft rounded-[1.75rem] p-5">
            {selectedOrderDetailQuery.data ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">Selected Order</div>
                    <div className="mt-2 text-xl font-semibold text-slate-950">{selectedOrderDetailQuery.data.id}</div>
                    <div className="mt-2 text-sm text-slate-600">
                      {formatMoney(selectedOrderDetailQuery.data.totalCents)} • {selectedOrderDetailQuery.data.paymentMethod}
                    </div>
                  </div>
                  <div className="rounded-full bg-[var(--surface-2)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-700">
                    {selectedOrderDetailQuery.data.status}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <button className="secondary-button rounded-full px-4 py-2 text-xs" disabled={orderActionMutation.isPending} onClick={() => void orderActionMutation.mutate({ orderId: selectedOrderDetailQuery.data!.id, action: "manual-review" })} type="button">
                    ส่งเข้า manual review
                  </button>
                  <button className="secondary-button rounded-full px-4 py-2 text-xs" disabled={orderActionMutation.isPending} onClick={() => void orderActionMutation.mutate({ orderId: selectedOrderDetailQuery.data!.id, action: "retry" })} type="button">
                    retry order
                  </button>
                  <button className="secondary-button rounded-full px-4 py-2 text-xs" disabled={orderActionMutation.isPending} onClick={() => void orderActionMutation.mutate({ orderId: selectedOrderDetailQuery.data!.id, action: "manual-fulfill" })} type="button">
                    ปิดงานด้วยมือ
                  </button>
                  <button className="secondary-button rounded-full px-4 py-2 text-xs" disabled={orderActionMutation.isPending} onClick={() => void orderActionMutation.mutate({ orderId: selectedOrderDetailQuery.data!.id, action: "refund" })} type="button">
                    refund
                  </button>
                </div>
                {orderMessage ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{orderMessage}</div> : null}
                {orderError ? <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{orderError}</div> : null}
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[1.25rem] bg-white/80 px-4 py-3">
                    <div className="font-medium text-slate-950">Provider Link</div>
                    <div className="mt-2 text-xs text-slate-600">
                      {selectedOrderDetailQuery.data.providerLink
                        ? `${selectedOrderDetailQuery.data.providerLink.providerKey} • ${selectedOrderDetailQuery.data.providerLink.providerOrderId || "-"} • ${selectedOrderDetailQuery.data.providerLink.latestStatus}`
                        : "ยังไม่มี provider link"}
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] bg-white/80 px-4 py-3">
                    <div className="font-medium text-slate-950">ฟอร์มที่ลูกค้ากรอก</div>
                    <pre className="mt-2 overflow-auto rounded-xl bg-slate-950 px-3 py-3 text-xs text-slate-100">{JSON.stringify(selectedOrderDetailQuery.data.formInput, null, 2)}</pre>
                  </div>
                  <div className="rounded-[1.25rem] bg-white/80 px-4 py-3">
                    <div className="font-medium text-slate-950">รายการสินค้าและ delivery payload</div>
                    <pre className="mt-2 overflow-auto rounded-xl bg-slate-950 px-3 py-3 text-xs text-slate-100">{JSON.stringify(selectedOrderDetailQuery.data.items, null, 2)}</pre>
                  </div>
                  <div className="rounded-[1.25rem] bg-white/80 px-4 py-3">
                    <div className="font-medium text-slate-950">Audit ล่าสุดของออเดอร์นี้</div>
                    <div className="mt-3 space-y-2">
                      {selectedOrderDetailQuery.data.audits.slice(0, 6).map((log) => (
                        <div className="rounded-xl bg-[var(--surface-2)] px-3 py-3 text-xs text-slate-700" key={log.id}>
                          <div className="font-medium text-slate-900">{log.action}</div>
                          <div className="mt-1">{log.detail}</div>
                          <div className="mt-1 text-slate-500">{formatDate(log.createdAt)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500">เลือกออเดอร์เพื่อเปิดศูนย์จัดการหลังบ้าน</div>
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <input className="input-field" onChange={(event) => setAuditSearch(event.target.value)} placeholder="ค้นหา action / detail / entity / actor" value={auditSearch} />
          <select className="input-field" onChange={(event) => setAuditEntityTypeFilter(event.target.value)} value={auditEntityTypeFilter}>
            <option value="all">ทุก entity type</option>
            <option value="order">order</option>
            <option value="provider_config">provider_config</option>
            <option value="payment_intent">payment_intent</option>
            <option value="inventory_item">inventory_item</option>
            <option value="category">category</option>
            <option value="site_content">site_content</option>
          </select>
          <select className="input-field" onChange={(event) => setAuditActionFilter(event.target.value)} value={auditActionFilter}>
            <option value="all">ทุก action</option>
            <option value="upsert">upsert</option>
            <option value="refund">refund</option>
            <option value="bulk_import">bulk_import</option>
            <option value="admin_status_processing">admin_status_processing</option>
            <option value="admin_status_manual_review">admin_status_manual_review</option>
            <option value="admin_status_fulfilled">admin_status_fulfilled</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">ถ้าเลือกออเดอร์อยู่ ระบบจะล็อก audit ให้ดูเฉพาะ order นั้นก่อน</div>
          <div className="flex flex-wrap gap-2">
            <button className="secondary-button rounded-full px-4 py-2 text-xs" onClick={resetAuditFilters} type="button">
              รีเซ็ต filter
            </button>
            <button className="secondary-button rounded-full px-4 py-2 text-xs" onClick={clearSavedAdminFilters} type="button">
              ล้าง filter ที่จำไว้
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {pagedAuditLogs.items.map((log) => (
            <div className="panel-soft rounded-[1.5rem] px-4 py-4" key={`audit-${log.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">{log.entityType} • {log.action}</div>
                  <div className="mt-2 text-sm muted-text">{log.detail}</div>
                  <div className="mt-2 text-xs text-slate-500">entity={log.entityId} • actor={log.actorUserId || "system"}</div>
                </div>
                <div className="text-xs text-slate-500">{formatDate(log.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
        <PaginationControls onPageChange={setAuditPage} page={pagedAuditLogs.page} totalPages={pagedAuditLogs.totalPages} />
      </section>

      <section className="panel rounded-[2.5rem] p-6">
        <div className="section-head">
          <div className="section-head__icon">
            <ScanSearch size={18} />
          </div>
          <p className="section-label">Webhook Viewer</p>
        </div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">ดู webhook และ payload ล่าสุดจากหลังบ้าน</h2>
            <p className="mt-2 text-sm muted-text">ใช้ไล่ callback จาก provider, payment matcher และ event ภายในได้จากหน้าจอเดียว</p>
          </div>
          <div className="rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-slate-600">
            ทั้งหมด {pagedWebhooks.total} รายการ
          </div>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.9fr_0.8fr_0.8fr_auto]">
          <input className="input-field" onChange={(event) => setWebhookSearch(event.target.value)} placeholder="ค้นหา provider / event / payload / id" value={webhookSearch} />
          <select className="input-field" onChange={(event) => setWebhookProviderFilter(event.target.value)} value={webhookProviderFilter}>
            <option value="all">ทุก provider</option>
            <option value="promptpay">promptpay</option>
            <option value="promptpay_matcher">promptpay_matcher</option>
            <option value="truemoney">truemoney</option>
            <option value="wepay">wepay</option>
            <option value="24payseller">24payseller</option>
            <option value="peamsub24hr">peamsub24hr</option>
            <option value="kbiz">kbiz</option>
            <option value="kbiz_import">kbiz_import</option>
            <option value="rdcw">rdcw</option>
          </select>
          <select className="input-field" onChange={(event) => setWebhookEventTypeFilter(event.target.value)} value={webhookEventTypeFilter}>
            <option value="all">ทุก event type</option>
            {webhookEventTypes.map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventType}
              </option>
            ))}
          </select>
          <select className="input-field" onChange={(event) => setWebhookProcessedFilter(event.target.value)} value={webhookProcessedFilter}>
            <option value="all">processed + pending</option>
            <option value="processed">processed only</option>
            <option value="pending">pending only</option>
          </select>
          <select className="input-field" onChange={(event) => setWebhookReplayStatusFilter(event.target.value)} value={webhookReplayStatusFilter}>
            <option value="all">all replay states</option>
            <option value="failed">failed replay only</option>
            <option value="ok">successful replay only</option>
            <option value="never">never replayed</option>
          </select>
          <button className="secondary-button rounded-full px-4 py-2 text-xs" onClick={resetWebhookFilters} type="button">
            รีเซ็ต filter
          </button>
        </div>
        {webhookMessage ? <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{webhookMessage}</div> : null}
        {webhookError ? <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{webhookError}</div> : null}
        <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            {pagedWebhooks.items.map((event) => {
              const isSelected = selectedWebhook?.id === event.id;
              return (
                <button
                  className={`panel-soft w-full rounded-[1.5rem] px-4 py-4 text-left transition ${isSelected ? "border border-[var(--brand)] bg-white" : ""}`}
                  key={event.id}
                  onClick={() => setSelectedWebhookId(event.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{event.providerKey}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--brand)]">{event.eventType}</div>
                      <div className="mt-2 text-xs text-slate-500">{formatDate(event.createdAt)}</div>
                      <div className="mt-2 text-xs text-slate-500">
                        replay {event.replayCount}x
                        {event.lastReplayAt ? ` • ${event.lastReplayOk ? "ok" : "failed"} • ${formatDate(event.lastReplayAt)}` : ""}
                      </div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-[11px] font-medium ${event.processed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {event.processed ? "processed" : "pending"}
                    </div>
                  </div>
                </button>
              );
            })}
            {pagedWebhooks.total === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-[var(--line)] px-4 py-5 text-sm muted-text">ยังไม่มี webhook event ให้ตรวจสอบ</div>
            ) : null}
            <PaginationControls onPageChange={setWebhookPage} page={pagedWebhooks.page} totalPages={pagedWebhooks.totalPages} />
          </div>
          <div className="panel-soft rounded-[1.75rem] p-5">
            {selectedWebhook ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">Selected Event</div>
                    <div className="mt-2 text-xl font-semibold text-slate-950">{selectedWebhook.eventType}</div>
                    <div className="mt-2 text-sm text-slate-600">
                      {selectedWebhook.providerKey} • {formatDate(selectedWebhook.createdAt)}
                    </div>
                  </div>
                  <div className="rounded-full bg-[var(--surface-2)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-700">
                    {selectedWebhook.processed ? "processed" : "pending"}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className="primary-button rounded-full px-4 py-2 text-xs"
                    disabled={webhookReplayMutation.isPending}
                    onClick={() => void webhookReplayMutation.mutate(selectedWebhook.id)}
                    type="button"
                  >
                    {webhookReplayMutation.isPending ? "กำลัง replay..." : "replay webhook"}
                  </button>
                </div>
                <div className="mt-4 rounded-[1.25rem] bg-white/80 px-4 py-3">
                  <div className="font-medium text-slate-950">Webhook Payload</div>
                  <pre className="mt-2 overflow-auto rounded-xl bg-slate-950 px-3 py-3 text-xs text-slate-100">{selectedWebhook.payloadJson}</pre>
                </div>
                <div className="mt-4 rounded-[1.25rem] bg-white/80 px-4 py-3">
                  <div className="font-medium text-slate-950">Replay History</div>
                  <div className="mt-3 space-y-2">
                    {(webhookReplayHistoryQuery.data ?? []).map((attempt) => (
                      <div className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs text-slate-600" key={attempt.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={attempt.ok ? "text-emerald-700" : "text-rose-700"}>{attempt.ok ? "ok" : "failed"}</span>
                          <span>{formatDate(attempt.createdAt)}</span>
                        </div>
                        <div className="mt-1 break-words">{attempt.message}</div>
                      </div>
                    ))}
                    {webhookReplayHistoryQuery.data?.length === 0 ? (
                      <div className="text-xs text-slate-500">ยังไม่มี replay attempt สำหรับ event นี้</div>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500">เลือก webhook event เพื่อดู payload แบบเต็ม</div>
            )}
          </div>
        </div>
      </section>

      <section className="panel rounded-[2.5rem] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="section-head">
              <div className="section-head__icon">
                <FolderCog size={18} />
              </div>
              <p className="section-label">K-Biz Monitoring</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">ติดตามงาน ingest และ statement sync</h2>
            <p className="mt-2 text-sm muted-text">ดูไฟล์ล่าสุดที่ระบบนำเข้า, event ที่ถูกประมวลผล, และใช้หน้า webhook viewer replay งานซ้ำได้ทันทีเมื่อจำเป็น</p>
          </div>
          <div className="rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-slate-600">
            ล่าสุด {kbizMonitoringQuery.data?.latestImportAt ? formatDate(kbizMonitoringQuery.data.latestImportAt) : "ยังไม่มี import"}
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <div className="panel-soft rounded-[1.5rem] px-4 py-4">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">Processed Files</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{kbizMonitoringQuery.data?.processedFiles ?? 0}</div>
              <div className="mt-2 text-sm text-slate-500">ไฟล์ statement ที่ระบบ ingest และบันทึก signature ไว้แล้ว</div>
            </div>
            {(kbizMonitoringQuery.data?.recentProcessedFiles ?? []).map((file) => (
              <div className="panel-soft rounded-[1.5rem] px-4 py-4" key={file.id}>
                <div className="text-sm font-medium text-slate-900">{file.filePath}</div>
                <div className="mt-1 text-xs text-slate-500">{file.fileSignature}</div>
                <div className="mt-2 text-xs text-slate-500">imported {formatDate(file.importedAt)}</div>
              </div>
            ))}
            {(kbizMonitoringQuery.data?.recentProcessedFiles?.length ?? 0) === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-[var(--line)] px-4 py-5 text-sm muted-text">ยังไม่มีประวัติ import K-Biz ในระบบ</div>
            ) : null}
          </div>
          <div className="panel-soft rounded-[1.75rem] p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand)]">Recent Import Events</div>
            <div className="mt-4 space-y-3">
              {(kbizMonitoringQuery.data?.recentEvents ?? []).map((event) => (
                <div className="rounded-[1.4rem] bg-white/80 px-4 py-4" key={event.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-900">{formatDate(event.createdAt)}</div>
                    <div className={`rounded-full px-3 py-1 text-[11px] font-medium ${event.processed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {event.processed ? "processed" : "pending"}
                    </div>
                  </div>
                  <pre className="mt-3 overflow-auto rounded-xl bg-slate-950 px-3 py-3 text-xs text-slate-100">{event.payloadJson}</pre>
                </div>
              ))}
              {(kbizMonitoringQuery.data?.recentEvents?.length ?? 0) === 0 ? (
                <div className="rounded-[1.6rem] border border-dashed border-[var(--line)] px-4 py-5 text-sm muted-text">ยังไม่มี event import ให้ตรวจสอบ</div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

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
          <div className="rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-slate-600">ทั้งหมด {pagedJobs.total} งาน</div>
        </div>
        <div className="mt-4 space-y-3">
          {pagedJobs.items.map((job) => (
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
          {pagedJobs.total === 0 ? (
            <div className="rounded-[1.6rem] border border-dashed border-[var(--line)] px-4 py-5 text-sm muted-text">ยังไม่มีงานในคิวตอนนี้</div>
          ) : null}
        </div>
        <PaginationControls onPageChange={setJobsPage} page={pagedJobs.page} totalPages={pagedJobs.totalPages} />
      </section>
    </div>
  );
}
