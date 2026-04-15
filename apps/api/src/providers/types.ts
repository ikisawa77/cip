import type { OrderStatus } from "@cip/shared";

export type ProviderPurchaseContext = {
  orderId: string;
  payload: Record<string, unknown>;
};

export type ProviderPurchaseResult = {
  status: OrderStatus;
  note: string;
};

export interface ProviderAdapter {
  key: string;
  purchase(context: ProviderPurchaseContext): Promise<ProviderPurchaseResult>;
  sync?(): Promise<{ ok: boolean; note: string }>;
}
