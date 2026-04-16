import type { ProviderPurchaseContext, ProviderPurchaseResult, ProviderSyncContext } from "./types";

type WepayMode = "webhook" | "instant_success" | "instant_processing" | "manual_review";

type WepayConfig = {
  endpoint?: string;
  method?: "POST" | "PUT";
  apiKey?: string;
  authHeaderName?: string;
  authScheme?: "Bearer" | "Token" | "Raw";
  callbackSecret?: string;
  callbackUrl?: string;
  timeoutMs?: number;
  mode?: WepayMode;
  staticPayload?: Record<string, unknown>;
};

type WepayApiResponse = {
  ok?: boolean;
  status?: string;
  note?: string;
  providerOrderId?: string;
  deliveryPayload?: string;
  [key: string]: unknown;
};

const defaultTimeoutMs = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseWepayConfig(config: Record<string, unknown>): WepayConfig {
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
  return `WEPAY-${orderId.slice(0, 8).toUpperCase()}`;
}

export function mapWepayStatus(input: unknown): "processing" | "fulfilled" | "failed" | "manual_review" {
  const normalized = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (!normalized) {
    return "processing";
  }

  if (["fulfilled", "completed", "success", "succeeded", "done"].includes(normalized)) {
    return "fulfilled";
  }

  if (["failed", "error", "cancelled", "canceled", "rejected"].includes(normalized)) {
    return "failed";
  }

  if (["manual_review", "review", "pending_review", "verify"].includes(normalized)) {
    return "manual_review";
  }

  return "processing";
}

function buildRequestPayload(context: ProviderPurchaseContext, config: WepayConfig) {
  return {
    orderId: context.orderId,
    productType: context.product.type,
    productName: context.product.name,
    productSlug: context.product.slug,
    quantity: context.item.quantity,
    amountCents: context.order.totalCents,
    amountBaht: Number((context.order.totalCents / 100).toFixed(2)),
    paymentMethod: context.order.paymentMethod,
    formInput: context.formInput,
    callbackUrl: config.callbackUrl || context.callbackUrl,
    callbackSecret: config.callbackSecret ?? null,
    ...config.staticPayload
  } satisfies Record<string, unknown>;
}

function buildAuthHeader(config: WepayConfig) {
  if (!config.apiKey) {
    return null;
  }

  if (config.authScheme === "Raw") {
    return config.apiKey;
  }

  return `${config.authScheme ?? "Bearer"} ${config.apiKey}`;
}

async function sendPurchaseRequest(config: WepayConfig, payload: Record<string, unknown>) {
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
    let parsed: WepayApiResponse = {};

    if (rawText.trim()) {
      try {
        parsed = JSON.parse(rawText) as WepayApiResponse;
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

export const wepayAdapter = {
  key: "wepay",
  async purchase(context: ProviderPurchaseContext): Promise<ProviderPurchaseResult> {
    const config = parseWepayConfig(context.config);
    const providerOrderId = buildProviderOrderId(context.orderId);
    const requestPayload = buildRequestPayload(context, config);

    if (config.mode === "instant_success") {
      return {
        status: "fulfilled",
        note: `Wepay instant success | ref=${providerOrderId}`,
        providerOrderId,
        externalStatus: "instant_success",
        requestPayload,
        responsePayload: { status: "fulfilled", providerOrderId }
      };
    }

    if (config.mode === "instant_processing") {
      return {
        status: "processing",
        note: `Wepay queued | ref=${providerOrderId}`,
        providerOrderId,
        externalStatus: "queued",
        requestPayload,
        responsePayload: { status: "processing", providerOrderId }
      };
    }

    if (config.mode === "manual_review" || !config.endpoint) {
      return {
        status: "manual_review",
        note: `Wepay รอ config endpoint | order=${context.orderId}`,
        providerOrderId,
        externalStatus: "manual_review",
        requestPayload
      };
    }

    const response = await sendPurchaseRequest(config, requestPayload);
    const responsePayload = isRecord(response.body)
      ? { ...response.body, statusCode: response.statusCode }
      : { statusCode: response.statusCode };
    const responseOrderId =
      typeof response.body.providerOrderId === "string" && response.body.providerOrderId.trim()
        ? response.body.providerOrderId.trim()
        : providerOrderId;
    const responseStatus = mapWepayStatus(response.body.status);
    const note =
      typeof response.body.note === "string" && response.body.note.trim()
        ? response.body.note.trim()
        : `Wepay ${responseStatus} | ref=${responseOrderId}`;

    if (!response.ok && responseStatus === "processing") {
      return {
        status: "manual_review",
        note: `Wepay request failed (${response.statusCode}) | ${note}`,
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
      deliveryPayload: typeof response.body.deliveryPayload === "string" ? response.body.deliveryPayload : null
    };
  },
  async sync(context: ProviderSyncContext) {
    const config = parseWepayConfig(context.config);
    if (config.mode === "manual_review" && !config.endpoint) {
      return {
        ok: true,
        note: "Wepay ใช้โหมด manual_review และยังไม่ตั้ง endpoint"
      };
    }

    return {
      ok: Boolean(config.endpoint || config.mode === "instant_processing" || config.mode === "instant_success"),
      note: config.endpoint
        ? `Wepay พร้อมยิงคำสั่งไปที่ ${config.endpoint}`
        : `Wepay mode=${config.mode ?? "manual_review"}`
    };
  }
};
