import assert from "node:assert/strict";
import test from "node:test";

import { mapPeamsub24hrStatus } from "./peamsub24hr.ts";

test("mapPeamsub24hrStatus maps success-like statuses to fulfilled", () => {
  assert.equal(mapPeamsub24hrStatus("success"), "fulfilled");
  assert.equal(mapPeamsub24hrStatus("active"), "fulfilled");
});

test("mapPeamsub24hrStatus maps review-like statuses to manual_review", () => {
  assert.equal(mapPeamsub24hrStatus("review"), "manual_review");
  assert.equal(mapPeamsub24hrStatus("need_review"), "manual_review");
});

test("mapPeamsub24hrStatus maps failed-like statuses to failed", () => {
  assert.equal(mapPeamsub24hrStatus("failed"), "failed");
  assert.equal(mapPeamsub24hrStatus("expired"), "failed");
});

test("mapPeamsub24hrStatus falls back to processing", () => {
  assert.equal(mapPeamsub24hrStatus("queued"), "processing");
  assert.equal(mapPeamsub24hrStatus(undefined), "processing");
});
