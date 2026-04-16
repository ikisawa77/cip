import test from "node:test";
import assert from "node:assert/strict";

import { mapWepayStatus } from "./wepay.ts";

test("mapWepayStatus maps success-like statuses to fulfilled", () => {
  assert.equal(mapWepayStatus("success"), "fulfilled");
  assert.equal(mapWepayStatus("completed"), "fulfilled");
});

test("mapWepayStatus maps review-like statuses to manual_review", () => {
  assert.equal(mapWepayStatus("review"), "manual_review");
  assert.equal(mapWepayStatus("pending_review"), "manual_review");
});

test("mapWepayStatus maps failed-like statuses to failed", () => {
  assert.equal(mapWepayStatus("failed"), "failed");
  assert.equal(mapWepayStatus("error"), "failed");
});

test("mapWepayStatus falls back to processing", () => {
  assert.equal(mapWepayStatus("queued"), "processing");
  assert.equal(mapWepayStatus(undefined), "processing");
});
