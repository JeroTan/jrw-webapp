import { describe, expect, it } from "vitest";
import type { CheckoutCartServerLine } from "@/domain/checkout/cart-validation";
import { SNAPSHOT_VARIANT_OPTION_MAX_ITEMS } from "@/domain/snapshots/schemas";
import { CheckoutService } from "./CheckoutService";

const requestBody = {
  cartUpdatedAt: "2026-06-05T08:00:00.000Z",
  items: [
    {
      priceCentavos: 1999,
      productId: "prod_linen",
      productName: "Linen Shirt",
      productSlug: "linen-shirt",
      quantity: 2,
      variantId: "variant_linen_small",
      variantLabel: "Size: Small",
    },
  ],
};

const serverLine: CheckoutCartServerLine = {
  availabilityLabel: "Available",
  inventoryState: "IN_STOCK",
  priceCentavos: 1999,
  productId: "prod_linen",
  productName: "Linen Shirt",
  productSlug: "linen-shirt",
  productStatus: "PUBLISHED",
  stockQuantity: 8,
  variantId: "variant_linen_small",
  variantLabel: "Size: Small",
  variantOptions: [{ group: "Size", name: "Small" }],
  variantProductId: "prod_linen",
  variantStatus: "ACTIVE",
};

class CheckoutRepositoryStub {
  calls = 0;
  lines: CheckoutCartServerLine[] = [serverLine];
  throwProviderFailure = false;

  async findCartLines() {
    this.calls += 1;

    if (this.throwProviderFailure) {
      throw new Error("D1_ERROR: query failed");
    }

    return this.lines;
  }
}

describe("CheckoutService", () => {
  it("returns a validated cart summary without payment or reservation collaborators", async () => {
    const repository = new CheckoutRepositoryStub();
    const service = new CheckoutService({ repository });

    const result = await service.validateCart({
      body: requestBody,
      requestId: "req_checkout_valid",
    });

    expect(result.error).toBeNull();
    expect(repository.calls).toBe(1);
    expect(result.content).toMatchObject({
      requiresCustomerAcceptance: false,
      status: "VALID",
      subtotalCentavos: 3998,
    });
  });

  it("returns conflict for changed price or quantity requiring customer retry", async () => {
    const repository = new CheckoutRepositoryStub();
    repository.lines = [
      {
        ...serverLine,
        priceCentavos: 2099,
        stockQuantity: 1,
      },
    ];
    const service = new CheckoutService({ repository });

    const result = await service.validateCart({
      body: {
        ...requestBody,
        items: [{ ...requestBody.items[0], priceCentavos: 1999, quantity: 3 }],
      },
      requestId: "req_checkout_changed",
    });

    expect(result.error).toMatchObject({
      code: "CONFLICT_STATE",
      data: {
        requiresCustomerAcceptance: true,
        status: "CHANGED",
      },
    });
  });

  it("returns inventory unavailable for unsellable cart lines", async () => {
    const repository = new CheckoutRepositoryStub();
    repository.lines = [
      {
        ...serverLine,
        inventoryState: "OUT_OF_STOCK",
        stockQuantity: 0,
      },
    ];
    const service = new CheckoutService({ repository });

    const result = await service.validateCart({
      body: requestBody,
      requestId: "req_checkout_blocked",
    });

    expect(result.error).toMatchObject({
      code: "INVENTORY_UNAVAILABLE",
      data: {
        status: "BLOCKED",
      },
    });
  });

  it("rejects malformed payloads before repository access", async () => {
    const repository = new CheckoutRepositoryStub();
    const service = new CheckoutService({ repository });

    const result = await service.validateCart({
      body: { items: [{ ...requestBody.items[0], quantity: 0 }] },
      requestId: "req_checkout_invalid",
    });

    expect(repository.calls).toBe(0);
    expect(result.error).toMatchObject({
      code: "VALIDATION_FAILED",
      data: {
        reasons: ["items[0].quantity:invalid_value"],
      },
    });
  });

  it("rejects oversized variant option payloads before repository access", async () => {
    const repository = new CheckoutRepositoryStub();
    const service = new CheckoutService({ repository });

    const result = await service.validateCart({
      body: {
        items: [
          {
            ...requestBody.items[0],
            variantOptions: Array.from(
              { length: SNAPSHOT_VARIANT_OPTION_MAX_ITEMS + 1 },
              (_, index) => ({
                group: `Group ${index}`,
                name: `Name ${index}`,
              })
            ),
          },
        ],
      },
      requestId: "req_checkout_invalid_options",
    });

    expect(repository.calls).toBe(0);
    expect(result.error).toMatchObject({
      code: "VALIDATION_FAILED",
      data: {
        reasons: ["items[0].variantOptions:too_many_items"],
      },
    });
  });

  it("maps repository failures to provider unavailable", async () => {
    const repository = new CheckoutRepositoryStub();
    repository.throwProviderFailure = true;
    const service = new CheckoutService({ repository });

    const result = await service.validateCart({
      body: requestBody,
      requestId: "req_checkout_provider_failure",
    });

    expect(result.error?.code).toBe("PROVIDER_UNAVAILABLE");
  });
});
