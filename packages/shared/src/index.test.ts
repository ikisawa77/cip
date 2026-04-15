import { describe, expect, it } from "vitest";

import { createOrderSchema, productTypeSchema } from "./index";

describe("shared schemas", () => {
  it("accepts known product type", () => {
    expect(productTypeSchema.parse("DIGITAL_CODE")).toBe("DIGITAL_CODE");
  });

  it("fills default payment method for orders", () => {
    const parsed = createOrderSchema.parse({
      productId: "p1",
      quantity: 1,
      formInput: {},
    });

    expect(parsed.paymentMethod).toBe("wallet");
  });
});
