import { describe, expect, it } from "vitest";
import { formatCatalogPrice } from "./price-format";

describe("catalog price formatting", () => {
  it("formats centavos with thousands separators", () => {
    expect(formatCatalogPrice(22)).toBe("PHP 0.22");
    expect(formatCatalogPrice(149900)).toBe("PHP 1,499.00");
    expect(formatCatalogPrice(299800)).toBe("PHP 2,998.00");
  });
});
