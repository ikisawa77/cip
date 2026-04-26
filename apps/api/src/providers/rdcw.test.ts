import assert from "node:assert/strict";
import test from "node:test";

import { mapRdcwStatus } from "./rdcw.ts";

test("mapRdcwStatus maps success-like statuses to fulfilled", () => {
  assert.equal(mapRdcwStatus("success"), "fulfilled");
  assert.equal(mapRdcwStatus("delivered"), "fulfilled");
});

test("mapRdcwStatus maps review-like statuses to manual_review", () => {
  assert.equal(mapRdcwStatus("review"), "manual_review");
  assert.equal(mapRdcwStatus("need_review"), "manual_review");
});

test("mapRdcwStatus maps failed-like statuses to failed", () => {
  assert.equal(mapRdcwStatus("failed"), "failed");
  assert.equal(mapRdcwStatus("out_of_stock"), "failed");
});

test("mapRdcwStatus falls back to processing", () => {
  assert.equal(mapRdcwStatus("queued"), "processing");
  assert.equal(mapRdcwStatus(undefined), "processing");
});
