import assert from "node:assert/strict";
import test from "node:test";

import { mapTruemoneyPaymentStatus } from "./truemoney.ts";

test("mapTruemoneyPaymentStatus maps success-like statuses to paid", () => {
  assert.equal(mapTruemoneyPaymentStatus("success"), "paid");
  assert.equal(mapTruemoneyPaymentStatus("redeemed"), "paid");
});

test("mapTruemoneyPaymentStatus maps failure-like statuses", () => {
  assert.equal(mapTruemoneyPaymentStatus("failed"), "failed");
  assert.equal(mapTruemoneyPaymentStatus("expired"), "expired");
});

test("mapTruemoneyPaymentStatus falls back to pending", () => {
  assert.equal(mapTruemoneyPaymentStatus("queued"), "pending");
  assert.equal(mapTruemoneyPaymentStatus(undefined), "pending");
});
