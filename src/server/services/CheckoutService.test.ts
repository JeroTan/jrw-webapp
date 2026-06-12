import { describe, expect, it } from "vitest";
import type { CheckoutCartServerLine } from "@/domain/checkout/cart-validation";
import type { CheckoutReservationPlanLine } from "@/domain/checkout/inventory-reservation";
import type {
  CheckoutAttemptRecord,
  CheckoutReservationRecord,
  CreateCheckoutReservationInput,
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

const checkoutDetailsBody = {
  email: "nina@example.com",
  fullName: "Nina Reyes",
  phone: "+63 917 555 1212",
  streetAddress: "12 Sampaguita Street",
  barangay: "Barangay 456",
  cityProvince: "Quezon City",
  postalCode: "1100",
  privacyAcknowledged: true,
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
  activeReservations = new Map<string, CheckoutReservationRecord>();
  attempts: CreateCheckoutAttemptInput[] = [];
  attemptRecords = new Map<string, CheckoutAttemptRecord>();
  calls = 0;
  createReservationCalls: CreateCheckoutReservationInput[] = [];
  lines: CheckoutCartServerLine[] = [serverLine];
  releasedLines: CheckoutReservationPlanLine[] = [];
  reservedLines: CheckoutReservationPlanLine[] = [];
  stockQuantity = 8;
  stockReserveFailures = new Set<string>();
  throwProviderFailure = false;
  throwReservationFailure = false;
  throwSaveFailure = false;

  async createCheckoutAttempt(input: CreateCheckoutAttemptInput) {
    if (this.throwSaveFailure) {
      throw new Error("D1_ERROR: insert failed");
    }

    this.attempts.push(input);
    const id = `attempt_${this.attempts.length}`;
    const attempt = {
      attemptTokenHash: input.attemptTokenHash,
      cartFingerprint: null,
      id,
      customerId: input.customerId,
      checkoutEmail: input.details.email,
      createdAt: "2026-06-12T00:00:00.000Z",
      fullName: input.details.fullName,
      reservationExpiresAt: null,
      reservationId: null,
      status: "DETAILS_CAPTURED",
      updatedAt: "2026-06-12T00:00:00.000Z",
    } satisfies CheckoutAttemptRecord;

    this.attemptRecords.set(id, attempt);
    return attempt;
  }

  async findCartLines() {
    this.calls += 1;

    if (this.throwProviderFailure) {
      throw new Error("D1_ERROR: query failed");
    }

    return this.lines.map((line) => ({
      ...line,
      inventoryState: this.stockQuantity > 0 ? line.inventoryState : "OUT_OF_STOCK",
      stockQuantity: Math.min(line.stockQuantity, this.stockQuantity),
    }));
  }

  async findCheckoutAttempt(attemptId: string) {
    return this.attemptRecords.get(attemptId) ?? null;
  }

  async findActiveReservationForAttempt(attemptId: string) {
    return this.activeReservations.get(attemptId) ?? null;
  }

  async reserveStockLine(line: CheckoutReservationPlanLine) {
    await Promise.resolve();

    if (line.mode === "PREORDER") {
      this.reservedLines.push(line);
      return true;
    }

    if (this.stockReserveFailures.has(line.variantId)) {
      return false;
    }

    if (this.stockQuantity < line.quantity) {
      return false;
    }

    this.stockQuantity -= line.quantity;
    this.reservedLines.push(line);
    return true;
  }

  async releaseStockLine(line: CheckoutReservationPlanLine) {
    if (line.mode === "STOCK") {
      this.stockQuantity += line.quantity;
    }

    this.releasedLines.push(line);
  }

  async createCheckoutReservation(input: CreateCheckoutReservationInput) {
    if (this.throwReservationFailure) {
      throw new Error("D1_ERROR: reservation insert failed");
    }

    this.createReservationCalls.push(input);
    const id = `reservation_${this.createReservationCalls.length}`;
    const reservation = {
      cartFingerprint: input.cartFingerprint,
      checkoutAttemptId: input.attemptId,
      expiresAt: input.expiresAt,
      id,
      status: "ACTIVE",
      subtotalCentavos: input.subtotalCentavos,
    } satisfies CheckoutReservationRecord;
    const attempt = this.attemptRecords.get(input.attemptId);

    if (attempt) {
      this.attemptRecords.set(input.attemptId, {
        ...attempt,
        cartFingerprint: input.cartFingerprint,
        reservationExpiresAt: input.expiresAt,
        reservationId: id,
        status: "INVENTORY_RESERVED",
      });
    }

    this.activeReservations.set(input.attemptId, reservation);
    return reservation;
  }

  async failReservationAndAttempt(input: { attemptId: string }) {
    const attempt = this.attemptRecords.get(input.attemptId);

    if (attempt) {
      this.attemptRecords.set(input.attemptId, {
        ...attempt,
        status: "RESERVATION_FAILED",
      });
    }
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
      attemptTokenHash: expect.any(String),
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
        attemptToken: expect.any(String),
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
    expect(repository.attempts[0]?.attemptTokenHash).not.toBe(
      result.content?.attempt.attemptToken
    );
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

  it("reserves guest checkout inventory after token gate and accepted cart", async () => {
    const repository = new CheckoutRepositoryStub();
    const service = new CheckoutService({ repository });
    const details = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: checkoutDetailsBody,
      requestId: "req_checkout_details_guest",
    });

    const result = await service.reserveInventory({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: {
        attemptToken: details.content!.attempt.attemptToken,
        ...requestBody,
      },
      now: "2026-06-12T08:00:00.000Z",
      requestId: "req_checkout_reserve_guest",
    });

    expect(result.error).toBeNull();
    expect(repository.stockQuantity).toBe(6);
    expect(repository.createReservationCalls).toHaveLength(1);
    expect(result.content).toMatchObject({
      attempt: {
        attemptId: "attempt_1",
        status: "INVENTORY_RESERVED",
      },
      next: {
        payMongoCreationRequired: true,
        paymentAllowed: true,
      },
      reservation: {
        expiresAt: "2026-06-12T08:15:00.000Z",
        reservationId: "reservation_1",
        status: "ACTIVE",
      },
    });
    expect(JSON.stringify(result.content)).not.toMatch(/token|hash|stock_version/i);
  });

  it("denies guest reservation with invalid token before cart lookup or stock mutation", async () => {
    const repository = new CheckoutRepositoryStub();
    const service = new CheckoutService({ repository });
    const details = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: checkoutDetailsBody,
      requestId: "req_checkout_details_guest",
    });

    const result = await service.reserveInventory({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: {
        attemptToken: "wrong-token",
        ...requestBody,
      },
      requestId: "req_checkout_reserve_denied",
    });

    expect(result.error?.code).toBe("AUTH_FORBIDDEN");
    expect(repository.calls).toBe(0);
    expect(repository.reservedLines).toHaveLength(0);
    expect(repository.stockQuantity).toBe(8);
  });

  it("returns stale cart conflict without reservation or stock mutation", async () => {
    const repository = new CheckoutRepositoryStub();
    repository.lines = [{ ...serverLine, priceCentavos: 2099 }];
    const service = new CheckoutService({ repository });
    const details = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: checkoutDetailsBody,
      requestId: "req_checkout_details_guest",
    });

    const result = await service.reserveInventory({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: {
        attemptToken: details.content!.attempt.attemptToken,
        ...requestBody,
      },
      requestId: "req_checkout_reserve_stale",
    });

    expect(result.error).toMatchObject({
      code: "CONFLICT_STATE",
      data: {
        status: "CHANGED",
      },
    });
    expect(repository.reservedLines).toHaveLength(0);
    expect(repository.stockQuantity).toBe(8);
  });

  it("returns existing active reservation for same attempt and same accepted cart", async () => {
    const repository = new CheckoutRepositoryStub();
    const service = new CheckoutService({ repository });
    const details = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: checkoutDetailsBody,
      requestId: "req_checkout_details_guest",
    });
    const reserveInput = {
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: {
        attemptToken: details.content!.attempt.attemptToken,
        ...requestBody,
      },
      now: "2026-06-12T08:00:00.000Z",
      requestId: "req_checkout_reserve_idempotent",
    } as const;

    const first = await service.reserveInventory(reserveInput);
    const second = await service.reserveInventory(reserveInput);

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(second.content?.reservation.reservationId).toBe("reservation_1");
    expect(repository.createReservationCalls).toHaveLength(1);
    expect(repository.stockQuantity).toBe(6);
  });

  it("releases previously reserved lines when a later reservation line fails", async () => {
    const repository = new CheckoutRepositoryStub();
    const secondServerLine = {
      ...serverLine,
      productId: "prod_cotton",
      productSlug: "cotton-shirt",
      variantId: "variant_cotton_small",
      variantProductId: "prod_cotton",
    };
    repository.lines = [serverLine, secondServerLine];
    repository.stockReserveFailures.add("variant_cotton_small");
    const service = new CheckoutService({ repository });
    const details = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: checkoutDetailsBody,
      requestId: "req_checkout_details_guest",
    });

    const result = await service.reserveInventory({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: {
        attemptToken: details.content!.attempt.attemptToken,
        cartUpdatedAt: requestBody.cartUpdatedAt,
        items: [
          requestBody.items[0],
          {
            ...requestBody.items[0],
            productId: "prod_cotton",
            productSlug: "cotton-shirt",
            variantId: "variant_cotton_small",
          },
        ],
      },
      requestId: "req_checkout_reserve_partial_failure",
    });

    expect(result.error?.code).toBe("INVENTORY_UNAVAILABLE");
    expect(repository.createReservationCalls).toHaveLength(0);
    expect(repository.releasedLines).toMatchObject([
      {
        productId: "prod_linen",
        variantId: "variant_linen_small",
      },
    ]);
    expect(repository.stockQuantity).toBe(8);
  });

  it("prevents oversell across 100 simultaneous reservation attempts", async () => {
    const repository = new CheckoutRepositoryStub();
    repository.stockQuantity = 5;
    const service = new CheckoutService({ repository });
    const savedAttempts = await Promise.all(
      Array.from({ length: 100 }, (_, index) =>
        service.saveDetails({
          actor: { authenticated: false, role: "PROSPECT" },
          body: checkoutDetailsBody,
          requestId: `req_checkout_details_${index}`,
        })
      )
    );

    const reservations = await Promise.all(
      savedAttempts.map((details, index) =>
        service.reserveInventory({
          actor: { authenticated: false, role: "PROSPECT" },
          attemptId: details.content!.attempt.attemptId,
          body: {
            attemptToken: details.content!.attempt.attemptToken,
            cartUpdatedAt: requestBody.cartUpdatedAt,
            items: [{ ...requestBody.items[0], quantity: 1 }],
          },
          requestId: `req_checkout_reserve_${index}`,
        })
      )
    );
    const successes = reservations.filter((result) => result.error === null);
    const failures = reservations.filter((result) => result.error !== null);

    expect(successes).toHaveLength(5);
    expect(failures.map((result) => result.error?.code)).toEqual(
      Array.from({ length: 95 }, () => "INVENTORY_UNAVAILABLE")
    );
    expect(repository.stockQuantity).toBe(0);
    expect(repository.reservedLines.reduce((sum, line) => sum + line.quantity, 0)).toBe(
      5
    );
  });
});
