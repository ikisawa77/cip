import type { ProviderAdapter, ProviderPurchaseContext } from "./types";

function buildScaffoldResult(label: string, context: ProviderPurchaseContext) {
  return {
    status: "manual_review" as const,
    note: `${label} ยังเป็น scaffold | order=${context.orderId}`
  };
}

export function createScaffoldAdapter(key: string, label: string): ProviderAdapter {
  return {
    key,
    async purchase(context) {
      return buildScaffoldResult(label, context);
    },
    async sync() {
      return {
        ok: true,
        note: `${label} sync scaffold`
      };
    }
  };
}
