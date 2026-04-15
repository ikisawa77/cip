import { describe, expect, it } from "vitest";

import { createId } from "./lib/ids";

describe("api smoke", () => {
  it("creates uuid ids", () => {
    expect(createId()).toHaveLength(36);
  });
});
