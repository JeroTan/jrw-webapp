import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminInventoryDashboard } from "./AdminInventoryDashboard";
import type { AdminInventoryRow } from "./admin-inventory-types";

const inventoryRow: AdminInventoryRow = {
  availabilityLabel: "Low Stock",
  brandLabel: "JRW Studio",
  id: "variant_1",
  inventoryState: "LOW_STOCK",
  inventoryStateLabel: "LOW STOCK",
  needsAction: true,
  productId: "prod_1",
  productName: "Desk Lamp",
  productSlug: "desk-lamp",
  productStatus: "PUBLISHED",
  sku: "LAMP-LOW",
  stockLabel: "4",
  variantId: "variant_1",
  variantName: "Matte Black",
};

describe("admin inventory dashboard", () => {
  it("renders inventory page content and variant table", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminInventoryDashboard, {
        autoLoad: false,
        initialLoadState: "ready",
        initialRows: [inventoryRow],
        initialTotalProducts: 1,
      })
    );

    expect(markup).toContain("Inventory");
    expect(markup).toContain("Review variant stock");
    expect(markup).toContain("Search inventory");
    expect(markup).toContain("Products scanned");
    expect(markup).toContain("Needs action");
    expect(markup).toContain("Desk Lamp");
    expect(markup).toContain("LAMP-LOW");
    expect(markup).toContain("LOW STOCK");
    expect(markup).toContain("Open product");
  });

  it("renders inventory loading state", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminInventoryDashboard, {
        autoLoad: false,
        initialLoadState: "loading",
      })
    );

    expect(markup).toContain("Loading inventory table");
  });
});
