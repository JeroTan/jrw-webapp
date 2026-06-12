import { describe, expect, it } from "vitest";
import type { CheckoutCartServerLine } from "@/domain/checkout/cart-validation";
import type {
  CheckoutAttemptRecord,
  CreateCheckoutAttemptInput,
} from "@/server/repositories/CheckoutRepository";
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
  attempts: CreateCheckoutAttemptInput[] = [];
  calls = 0;
  lines: CheckoutCartServerLine[] = [serverLine];
  throwProviderFailure = false;
  throwSaveFailure = false;

  async createCheckoutAttempt(input: CreateCheckoutAttemptInput) {
    if (this.throwSaveFailure) {
      throw new Error("D1_ERROR: insert failed");
    }

    this.attempts.push(input);

    return {
      id: `attempt_${this.attempts.length}`,
      customerId: input.customerId,
      checkoutEmail: input.details.email,
      createdAt: "2026-06-12T00:00:00.000Z",
      fullName: input.details.fullName,
      status: "DETAILS_CAPTURED",
      updatedAt: "2026-06-12T00:00:00.000Z",
    } satisfies CheckoutAttemptRecord;
  }

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

  it("accepts guest checkout details with nullable customer reference", async () => {
    const repository = new CheckoutRepositoryStub();
    const service = new CheckoutService({ repository });

    const result = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: {
        email: "nina@example.com",
        fullName: "Nina Reyes",
        phone: "+63 917 555 1212",
        streetAddress: "12 Sampaguita Street",
        barangay: "Barangay 456",
        cityProvince: "Quezon City",
        postalCode: "1100",
        privacyAcknowledged: true,
      },
      requestId: "req_checkout_details_guest",
    });

    expect(result.error).toBeNull();
    expect(repository.attempts).toHaveLength(1);
    expect(repository.attempts[0]).toMatchObject({
      customerId: null,
      requestId: "req_checkout_details_guest",
      details: {
        email: "nina@example.com",
        fullName: "Nina Reyes",
      },
    });
    expect(result.content).toMatchObject({
      attempt: {
        attemptId: "attempt_1",
        status: "DETAILS_CAPTURED",
      },
      customer: {
        customerId: null,
        mode: "guest",
      },
      details: {
        email: "nina@example.com",
        fullName: "Nina Reyes",
      },
      next: {
        cartValidationRequired: true,
        paymentAllowed: false,
      },
    });
  });

  it("links signed-in customer details from server actor only", async () => {
    const repository = new CheckoutRepositoryStub();
    const service = new CheckoutService({ repository });

    const result = await service.saveDetails({
      actor: {
        authenticated: true,
        actorId: "customer_server",
        role: "CUSTOMER",
      },
      body: {
        email: "nina@example.com",
        fullName: "Nina Reyes",
        phone: "+63 917 555 1212",
        streetAddress: "12 Sampaguita Street",
        barangay: "Barangay 456",
        cityProvince: "Quezon City",
        postalCode: "1100",
        privacyAcknowledged: true,
      },
      requestId: "req_checkout_details_customer",
    });

    expect(result.error).toBeNull();
    expect(repository.attempts[0]).toMatchObject({
      customerId: "customer_server",
    });
    expect(result.content?.customer).toEqual({
      customerId: "customer_server",
      mode: "signed-in",
    });
  });

  it("rejects checkout details with unknown customer identity fields", async () => {
    const repository = new CheckoutRepositoryStub();
    const service = new CheckoutService({ repository });

    const result = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: {
        email: "nina@example.com",
        fullName: "Nina Reyes",
        phone: "+63 917 555 1212",
        streetAddress: "12 Sampaguita Street",
        barangay: "Barangay 456",
        cityProvince: "Quezon City",
        postalCode: "1100",
        privacyAcknowledged: true,
        customerId: "customer_browser",
      },
      requestId: "req_checkout_details_unknown",
    });

    expect(result.error).toMatchObject({
      code: "VALIDATION_FAILED",
      data: {
        reasons: ["customerId:unknown"],
      },
    });
  });

  it("maps checkout attempt persistence failures to provider unavailable", async () => {
    const repository = new CheckoutRepositoryStub();
    repository.throwSaveFailure = true;
    const service = new CheckoutService({ repository });

    const result = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: {
        email: "nina@example.com",
        fullName: "Nina Reyes",
        phone: "+63 917 555 1212",
        streetAddress: "12 Sampaguita Street",
        barangay: "Barangay 456",
        cityProvince: "Quezon City",
        postalCode: "1100",
        privacyAcknowledged: true,
      },
      requestId: "req_checkout_details_save_failure",
    });

    expect(result.error?.code).toBe("PROVIDER_UNAVAILABLE");
  });
});
