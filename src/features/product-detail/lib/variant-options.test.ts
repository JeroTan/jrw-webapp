import { describe, expect, it } from "vitest";
import type { PublicCatalogDetailVariant } from "@/domain/products/public-types";
import {
  findVariantForSelection,
  optionGroupsFromVariants,
  selectionFromVariant,
} from "./variant-options";

const variants: PublicCatalogDetailVariant[] = [
  {
    availability: { inStock: true, label: "Available", tone: "success" },
    disabled: false,
    id: "blue-small",
    label: "Color: Blue / Size: Small",
    maxQuantity: 12,
    optionValues: [
      { group: "Color", name: "Blue" },
      { group: "Size", name: "Small" },
    ],
    priceCentavos: 1999,
    priceLabel: "PHP 19.99",
    productId: "prod_1",
    selected: true,
  },
  {
    availability: { inStock: false, label: "Unavailable", tone: "error" },
    disabled: true,
    id: "blue-large",
    label: "Color: Blue / Size: Large",
    maxQuantity: 0,
    optionValues: [
      { group: "Color", name: "Blue" },
      { group: "Size", name: "Large" },
    ],
    priceCentavos: 1999,
    priceLabel: "PHP 19.99",
    productId: "prod_1",
    selected: false,
  },
];

describe("variant option helpers", () => {
  it("groups variant options in source order and marks color swatches", () => {
    const groups = optionGroupsFromVariants(variants);

    expect(groups.map((group) => group.name)).toEqual(["Color", "Size"]);
    expect(groups[0]?.options).toMatchObject([
      { name: "Blue", swatchColor: "blue" },
    ]);
    expect(groups[1]?.options).toMatchObject([
      { name: "Small" },
      { name: "Large" },
    ]);
  });

  it("resolves selected option maps back to the matching variant", () => {
    const selection = selectionFromVariant(variants[0]);

    expect(selection).toEqual({ Color: "Blue", Size: "Small" });
    expect(findVariantForSelection(variants, selection)?.id).toBe("blue-small");
    expect(
      findVariantForSelection(variants, { Color: "Blue", Size: "Large" })?.id
    ).toBe("blue-large");
    expect(
      findVariantForSelection(variants, { Color: "Black", Size: "Small" })
    ).toBeNull();
  });
});
