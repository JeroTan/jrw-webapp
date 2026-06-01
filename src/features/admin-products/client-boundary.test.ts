import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const componentFiles = [
  "src/features/admin-products/components/ProductEditor.tsx",
  "src/features/admin-products/components/VariantEditor.tsx",
];

describe("admin products client boundary", () => {
  it("keeps product editor components off server-only product modules", () => {
    for (const file of componentFiles) {
      const source = readFileSync(resolve(file), "utf8");

      expect(source).not.toContain("@/domain/products/schemas");
      expect(source).not.toContain("@/domain/products/product");
    }
  });
});
