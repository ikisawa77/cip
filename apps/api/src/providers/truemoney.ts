export function mapTruemoneyPaymentStatus(input: unknown): "paid" | "pending" | "failed" | "expired" {
  const normalized = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (!normalized) {
    return "pending";
  }

  if (["paid", "success", "succeeded", "completed", "redeemed"].includes(normalized)) {
    return "paid";
  }

  if (["expired", "timeout"].includes(normalized)) {
    return "expired";
  }

  if (["failed", "error", "cancelled", "canceled", "rejected"].includes(normalized)) {
    return "failed";
  }

  return "pending";
}
