import type { ProviderPurchaseContext, ProviderPurchaseResult, ProviderSyncContext } from "./types";

type RdcwMode = "webhook" | "instant_success" | "instant_processing" | "manual_review";

type RdcwConfig = {
  endpoint?: string;
  method?: "POST" | "PUT";
  apiKey?: string;
  authHeaderName?: string;
  authScheme?: "Bearer" | "Token" | "Raw";
  callbackSecret?: string;
  callbackUrl?: string;
  timeoutMs?: number;
  mode?: RdcwMode;
  staticPayload?: Record<string, unknown>;
};

type RdcwApiResponse = {
  ok?: boolean;
  status?: string;
  note?: string;
  providerOrderId?: string;
  refId?: string;
  code?: string;
  pin?: string;
  serial?: string;
  downloadUrl?: string;
  deliveryPayload?: string;
  [key: string]: unknown;
};

const defaultTimeoutMs = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRdcwConfig(config: Record<string, unknown>): RdcwConfig {
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
  return `RDCW-${orderId.slice(0, 8).toUpperCase()}`;
}

export function mapRdcwStatus(input: unknown): "processing" | "fulfilled" | "failed" | "manual_review" {
  const normalized = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (!normalized) {
    return "processing";
  }

  if (["fulfilled", "completed", "success", "succeeded", "done", "delivered", "sent"].includes(normalized)) {
    return "fulfilled";
  }

  if (["failed", "error", "cancelled", "canceled", "rejected", "denied", "out_of_stock"].includes(normalized)) {
    return "failed";
  }

  if (["manual_review", "review", "pending_review", "verify", "need_review"].includes(normalized)) {
    return "manual_review";
  }

  return "processing";
}

function buildRequestPayload(context: ProviderPurchaseContext, config: RdcwConfig) {
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

function buildAuthHeader(config: RdcwConfig) {
  if (!config.apiKey) {
    return null;
  }

  if (config.authScheme === "Raw") {
    return config.apiKey;
  }

  return `${config.authScheme ?? "Bearer"} ${config.apiKey}`;
}

async function sendPurchaseRequest(config: RdcwConfig, payload: Record<string, unknown>) {
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
    let parsed: RdcwApiResponse = {};

    if (rawText.trim()) {
      try {
        parsed = JSON.parse(rawText) as RdcwApiResponse;
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

function normalizeDeliveryPayload(response: RdcwApiResponse) {
  if (typeof response.deliveryPayload === "string" && response.deliveryPayload.trim()) {
    return response.deliveryPayload.trim();
  }

  const deliveryCandidate = {
    code: typeof response.code === "string" ? response.code : null,
    pin: typeof response.pin === "string" ? response.pin : null,
    serial: typeof response.serial === "string" ? response.serial : null,
    downloadUrl: typeof response.downloadUrl === "string" ? response.downloadUrl : null
  };
  const hasValue = Object.values(deliveryCandidate).some((value) => Boolean(value?.trim()));
  return hasValue ? JSON.stringify(deliveryCandidate, null, 2) : null;
}

function getResponseProviderOrderId(response: RdcwApiResponse, fallback: string) {
  const values = [response.providerOrderId, response.refId];
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

export const rdcwAdapter = {
  key: "rdcw",
  async purchase(context: ProviderPurchaseContext): Promise<ProviderPurchaseResult> {
    const config = parseRdcwConfig(context.config);
    const providerOrderId = buildProviderOrderId(context.orderId);
    const requestPayload = buildRequestPayload(context, config);

    if (config.mode === "instant_success") {
      return {
        status: "fulfilled",
        note: `RDCW instant success | ref=${providerOrderId}`,
        providerOrderId,
        externalStatus: "instant_success",
        requestPayload,
        responsePayload: { status: "fulfilled", providerOrderId }
      };
    }

    if (config.mode === "instant_processing") {
      return {
        status: "processing",
        note: `RDCW queued | ref=${providerOrderId}`,
        providerOrderId,
        externalStatus: "queued",
        requestPayload,
        responsePayload: { status: "processing", providerOrderId }
      };
    }

    if (config.mode === "manual_review" || !config.endpoint) {
      return {
        status: "manual_review",
        note: `RDCW รอ config endpoint | order=${context.orderId}`,
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
    const responseStatus = mapRdcwStatus(response.body.status);
    const note =
      typeof response.body.note === "string" && response.body.note.trim()
        ? response.body.note.trim()
        : `RDCW ${responseStatus} | ref=${responseOrderId}`;

    if (!response.ok && responseStatus === "processing") {
      return {
        status: "manual_review",
        note: `RDCW request failed (${response.statusCode}) | ${note}`,
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
    const config = parseRdcwConfig(context.config);
    if (config.mode === "manual_review" && !config.endpoint) {
      return {
        ok: true,
        note: "RDCW ใช้โหมด manual_review และยังไม่ได้ตั้ง endpoint"
      };
    }

    return {
      ok: true,
      note: `RDCW sync ready | endpoint=${config.endpoint ?? "not-configured"}`
    };
  }
};
