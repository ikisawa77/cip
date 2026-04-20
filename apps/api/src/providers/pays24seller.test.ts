import assert from "node:assert/strict";
import test from "node:test";

import { map24PaysellerStatus } from "./pays24seller.ts";

test("map24PaysellerStatus maps success-like statuses to fulfilled", () => {
  assert.equal(map24PaysellerStatus("success"), "fulfilled");
  assert.equal(map24PaysellerStatus("delivered"), "fulfilled");
  assert.equal(map24PaysellerStatus("active"), "fulfilled");
});

test("map24PaysellerStatus maps review-like statuses to manual_review", () => {
  assert.equal(map24PaysellerStatus("review"), "manual_review");
  assert.equal(map24PaysellerStatus("need_review"), "manual_review");
});

test("map24PaysellerStatus maps failed-like statuses to failed", () => {
  assert.equal(map24PaysellerStatus("failed"), "failed");
  assert.equal(map24PaysellerStatus("out_of_stock"), "failed");
});

test("map24PaysellerStatus falls back to processing", () => {
  assert.equal(map24PaysellerStatus("queued"), "processing");
  assert.equal(map24PaysellerStatus(undefined), "processing");
});
