import assert from "node:assert/strict";
import test from "node:test";

import { createId } from "./lib/ids.ts";

test("creates uuid ids", () => {
  assert.equal(createId().length, 36);
});
