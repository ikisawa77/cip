import assert from "node:assert/strict";
import test from "node:test";

import { createOrderSchema, productTypeSchema } from "./index.ts";

test("accepts known product type", () => {
  assert.equal(productTypeSchema.parse("DIGITAL_CODE"), "DIGITAL_CODE");
});

test("fills default payment method for orders", () => {
  const parsed = createOrderSchema.parse({
    productId: "p1",
    quantity: 1,
    formInput: {}
  });

  assert.equal(parsed.paymentMethod, "wallet");
});
