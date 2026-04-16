import type { OrderStatus } from "@cip/shared";

export type ProviderSyncContext = {
  providerKey: string;
  config: Record<string, unknown>;
};

export type ProviderPurchaseContext = {
  orderId: string;
  payload: Record<string, unknown>;
  config: Record<string, unknown>;
  order: {
    totalCents: number;
    paymentMethod: "wallet" | "promptpay_qr";
  };
  item: {
    productId: string;
    quantity: number;
    unitPriceCents: number;
  };
  product: {
    name: string;
    slug: string;
    type: string;
  };
  formInput: Record<string, string>;
  callbackUrl: string;
};

export type ProviderPurchaseResult = {
  status: OrderStatus;
  note: string;
  providerOrderId?: string | null;
  externalStatus?: string | null;
  requestPayload?: Record<string, unknown> | null;
  responsePayload?: Record<string, unknown> | null;
  deliveryPayload?: string | null;
};

export interface ProviderAdapter {
  key: string;
  purchase(context: ProviderPurchaseContext): Promise<ProviderPurchaseResult>;
  sync?(context: ProviderSyncContext): Promise<{ ok: boolean; note: string }>;
}
