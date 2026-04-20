import type { ProviderPurchaseContext, ProviderPurchaseResult, ProviderSyncContext } from "./types";

type Pays24SellerMode = "webhook" | "instant_success" | "instant_processing" | "manual_review";

type Pays24SellerConfig = {
  endpoint?: string;
  method?: "POST" | "PUT";
  apiKey?: string;
  authHeaderName?: string;
  authScheme?: "Bearer" | "Token" | "Raw";
  callbackSecret?: string;
  callbackUrl?: string;
  timeoutMs?: number;
  mode?: Pays24SellerMode;
  staticPayload?: Record<string, unknown>;
};

type Pays24SellerApiResponse = {
  ok?: boolean;
  status?: string;
  note?: string;
  providerOrderId?: string;
  orderId?: string;
  refId?: string;
  deliveryPayload?: string;
  account?: unknown;
  credential?: unknown;
  credentials?: unknown;
  [key: string]: unknown;
};

const defaultTimeoutMs = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePays24SellerConfig(config: Record<string, unknown>): Pays24SellerConfig {
  const mode = typeof config.mode === "string" ? config.mode : "manual_review";
  const method = typeof config.method === "string" && config.method.toUpperCase() === "PUT" ? "PUT" : "POST";

  return {
    endpoint: typeof config.endpoint === "string" ? config.endpoint.trim() : undefined,
    method,
    apiKey: typeof config.apiKey === "string" ? config.apiKey.trim() : undefined,
    authHeaderName: typeof config.authHeaderName === "string" ? config.authHeaderName.trim() : "Authorization",
    authScheme:
      config.authScheme === "Token" || config.authScheme === "Raw"
        ? config.authScheme
        : config.authScheme === "Bearer"
          ? "Bearer"
          : "Bearer",
    callbackSecret: typeof config.callbackSecret === "string" ? config.callbackSecret.trim() : undefined,
    callbackUrl: typeof config.callbackUrl === "string" ? config.callbackUrl.trim() : undefined,
    timeoutMs:
      typeof config.timeoutMs === "number" && Number.isFinite(config.timeoutMs) && config.timeoutMs > 0
        ? Math.round(config.timeoutMs)
        : defaultTimeoutMs,
    mode:
      mode === "webhook" || mode === "instant_success" || mode === "instant_processing" || mode === "manual_review"
        ? mode
        : "manual_review",
    staticPayload: isRecord(config.staticPayload) ? config.staticPayload : undefined
  };
}

function buildProviderOrderId(orderId: string) {
  return `24PAY-${orderId.slice(0, 8).toUpperCase()}`;
}

export function map24PaysellerStatus(input: unknown): "processing" | "fulfilled" | "failed" | "manual_review" {
  const normalized = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (!normalized) {
    return "processing";
  }

  if (["fulfilled", "completed", "success", "succeeded", "done", "delivered", "sent", "active"].includes(normalized)) {
    return "fulfilled";
  }

  if (["failed", "error", "cancelled", "canceled", "rejected", "out_of_stock", "denied"].includes(normalized)) {
    return "failed";
  }

  if (["manual_review", "review", "pending_review", "verify", "need_review"].includes(normalized)) {
    return "manual_review";
  }

  return "processing";
}

function buildRequestPayload(context: ProviderPurchaseContext, config: Pays24SellerConfig) {
  return {
    orderId: context.orderId,
    productType: context.product.type,
    productName: context.product.name,
    productSlug: context.product.slug,
    quantity: context.item.quantity,
    amountCents: context.order.totalCents,
    amountBaht: Number((context.order.totalCents / 100).toFixed(2)),
    paymentMethod: context.order.paymentMethod,
    customerInput: context.formInput,
    callbackUrl: config.callbackUrl || context.callbackUrl,
    callbackSecret: config.callbackSecret ?? null,
    ...config.staticPayload
  } satisfies Record<string, unknown>;
}

function buildAuthHeader(config: Pays24SellerConfig) {
  if (!config.apiKey) {
    return null;
  }

  if (config.authScheme === "Raw") {
    return config.apiKey;
  }

  return `${config.authScheme ?? "Bearer"} ${config.apiKey}`;
}

async function sendPurchaseRequest(config: Pays24SellerConfig, payload: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? defaultTimeoutMs);

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json"
    };

    const authValue = buildAuthHeader(config);
    if (authValue) {
      headers[config.authHeaderName ?? "Authorization"] = authValue;
    }

    const response = await fetch(config.endpoint!, {
      method: config.method ?? "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const rawText = await response.text();
    let parsed: Pays24SellerApiResponse = {};

    if (rawText.trim()) {
      try {
        parsed = JSON.parse(rawText) as Pays24SellerApiResponse;
      } catch {
        parsed = { note: rawText };
      }
    }

    return {
      ok: response.ok,
      statusCode: response.status,
      body: parsed
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeDeliveryPayload(response: Pays24SellerApiResponse) {
  if (typeof response.deliveryPayload === "string" && response.deliveryPayload.trim()) {
    return response.deliveryPayload.trim();
  }

  const candidate = response.credentials ?? response.credential ?? response.account ?? null;
  if (!candidate) {
    return null;
  }

  if (typeof candidate === "string") {
    return candidate.trim() || null;
  }

  if (isRecord(candidate)) {
    return JSON.stringify(candidate, null, 2);
  }

  return null;
}

function getResponseProviderOrderId(response: Pays24SellerApiResponse, fallback: string) {
  const values = [response.providerOrderId, response.orderId, response.refId];
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

export const pays24SellerAdapter = {
  key: "24payseller",
  async purchase(context: ProviderPurchaseContext): Promise<ProviderPurchaseResult> {
    const config = parsePays24SellerConfig(context.config);
    const providerOrderId = buildProviderOrderId(context.orderId);
    const requestPayload = buildRequestPayload(context, config);

    if (config.mode === "instant_success") {
      return {
        status: "fulfilled",
        note: `24Payseller instant success | ref=${providerOrderId}`,
        providerOrderId,
        externalStatus: "instant_success",
        requestPayload,
        responsePayload: { status: "fulfilled", providerOrderId }
      };
    }

    if (config.mode === "instant_processing") {
      return {
        status: "processing",
        note: `24Payseller queued | ref=${providerOrderId}`,
        providerOrderId,
        externalStatus: "queued",
        requestPayload,
        responsePayload: { status: "processing", providerOrderId }
      };
    }

    if (config.mode === "manual_review" || !config.endpoint) {
      return {
        status: "manual_review",
        note: `24Payseller รอ config endpoint | order=${context.orderId}`,
        providerOrderId,
        externalStatus: "manual_review",
        requestPayload
      };
    }

    const response = await sendPurchaseRequest(config, requestPayload);
    const responsePayload = isRecord(response.body)
      ? { ...response.body, statusCode: response.statusCode }
      : { statusCode: response.statusCode };
    const responseOrderId = getResponseProviderOrderId(response.body, providerOrderId);
    const responseStatus = map24PaysellerStatus(response.body.status);
    const note =
      typeof response.body.note === "string" && response.body.note.trim()
        ? response.body.note.trim()
        : `24Payseller ${responseStatus} | ref=${responseOrderId}`;

    if (!response.ok && responseStatus === "processing") {
      return {
        status: "manual_review",
        note: `24Payseller request failed (${response.statusCode}) | ${note}`,
        providerOrderId: responseOrderId,
        externalStatus: typeof response.body.status === "string" ? response.body.status : "http_error",
        requestPayload,
        responsePayload
      };
    }

    return {
      status: responseStatus,
      note,
      providerOrderId: responseOrderId,
      externalStatus: typeof response.body.status === "string" ? response.body.status : responseStatus,
      requestPayload,
      responsePayload,
      deliveryPayload: normalizeDeliveryPayload(response.body)
    };
  },
  async sync(context: ProviderSyncContext) {
    const config = parsePays24SellerConfig(context.config);
    if (config.mode === "manual_review" && !config.endpoint) {
      return {
        ok: true,
        note: "24Payseller ใช้โหมด manual_review และยังไม่ได้ตั้ง endpoint"
      };
    }

    return {
      ok: Boolean(config.endpoint || config.mode === "instant_processing" || config.mode === "instant_success"),
      note: config.endpoint
        ? `24Payseller พร้อมยิงคำสั่งไปที่ ${config.endpoint}`
        : `24Payseller mode=${config.mode ?? "manual_review"}`
    };
  }
};
