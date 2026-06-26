import { describe, expect, it } from "vitest";
import type { CheckoutCartServerLine } from "@/domain/checkout/cart-validation";
import type { CheckoutReservationPlanLine } from "@/domain/checkout/inventory-reservation";
import type { AuditEvent } from "@/domain/audit/events";
import type { OperationalLogEvent } from "@/adapter/infrastructure/logging/operational-log";
import type {
  CheckoutAttemptRecord,
  CheckoutPaymentRecord,
  CheckoutReservationRecord,
  CreateCheckoutPaymentInput,
  CreateCheckoutReservationInput,
  CreateCheckoutAttemptInput,
  ReleaseCheckoutReservationForPaymentFailureInput,
} from "@/server/repositories/CheckoutRepository";
import { SNAPSHOT_VARIANT_OPTION_MAX_ITEMS } from "@/domain/snapshots/schemas";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";
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
  createPaymentCalls: CreateCheckoutPaymentInput[] = [];
  createReservationCalls: CreateCheckoutReservationInput[] = [];
  lines: CheckoutCartServerLine[] = [serverLine];
  payments = new Map<string, CheckoutPaymentRecord>();
  paymentFailureReleases: ReleaseCheckoutReservationForPaymentFailureInput[] =
    [];
  expiredReservationReleases: string[] = [];
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
      inventoryState:
        this.stockQuantity > 0 ? line.inventoryState : "OUT_OF_STOCK",
      stockQuantity: Math.min(line.stockQuantity, this.stockQuantity),
    }));
  }

  async findCheckoutAttempt(attemptId: string) {
    return this.attemptRecords.get(attemptId) ?? null;
  }

  async findActiveReservationForAttempt(attemptId: string) {
    return this.activeReservations.get(attemptId) ?? null;
  }

  async findPendingCheckoutPaymentForAttempt(attemptId: string) {
    return this.payments.get(attemptId) ?? null;
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
      items: input.lines.map((line) => ({
        name: "Linen Shirt - Size: Small",
        priceCentavos: line.priceCentavos,
        productId: line.productId,
        quantity: line.quantity,
        reservationMode: line.mode,
        variantId: line.variantId,
      })),
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

  async createCheckoutPayment(input: CreateCheckoutPaymentInput) {
    this.createPaymentCalls.push(input);
    const payment = {
      amountCentavos: input.amountCentavos,
      checkoutAttemptId: input.attemptId,
      checkoutUrl: input.checkoutUrl,
      createdAt: input.now ?? "2026-06-12T00:00:00.000Z",
      currency: input.currency,
      livemode: input.livemode,
      paymentId: `payment_${this.createPaymentCalls.length}`,
      provider: "PAYMONGO",
      providerCheckoutSessionId: input.providerCheckoutSessionId,
      providerReferenceNumber: input.providerReferenceNumber,
      reservationId: input.reservationId,
      status: "PAYMENT_PENDING",
      updatedAt: input.now ?? "2026-06-12T00:00:00.000Z",
    } satisfies CheckoutPaymentRecord;
    const attempt = this.attemptRecords.get(input.attemptId);

    if (attempt) {
      this.attemptRecords.set(input.attemptId, {
        ...attempt,
        status: "PAYMENT_CREATED",
      });
    }

    this.payments.set(input.attemptId, payment);
    return payment;
  }

  async releaseCheckoutReservationForPaymentFailure(
    input: ReleaseCheckoutReservationForPaymentFailureInput
  ) {
    this.paymentFailureReleases.push(input);
    const reservation = this.activeReservations.get(input.attemptId);

    if (reservation?.items) {
      for (const item of reservation.items) {
        if (
          item.reservationMode === "STOCK" &&
          item.productId &&
          item.variantId
        ) {
          await this.releaseStockLine({
            mode: "STOCK",
            priceCentavos: item.priceCentavos ?? 0,
            productId: item.productId,
            quantity: item.quantity,
            variantId: item.variantId,
          });
        }
      }
    }

    this.activeReservations.delete(input.attemptId);
    const attempt = this.attemptRecords.get(input.attemptId);

    if (attempt) {
      this.attemptRecords.set(input.attemptId, {
        ...attempt,
        reservationExpiresAt: null,
        reservationId: null,
        status: "PAYMENT_CREATION_FAILED",
      });
    }
  }

  async releaseExpiredCheckoutReservations(input: {
    limit?: number;
    now?: string;
    requestId: string;
  }) {
    const nowTime = Date.parse(input.now ?? new Date().toISOString());
    const limit = input.limit ?? 50;
    let released = 0;

    for (const [attemptId, reservation] of this.activeReservations) {
      if (released >= limit) {
        break;
      }

      if (reservation.status !== "ACTIVE") {
        continue;
      }

      const expiresAt = Date.parse(reservation.expiresAt);

      if (
        !Number.isFinite(nowTime) ||
        !Number.isFinite(expiresAt) ||
        expiresAt > nowTime
      ) {
        continue;
      }

      const attempt = this.attemptRecords.get(attemptId);

      if (
        attempt?.reservationId !== reservation.id ||
        ![
          "DETAILS_CAPTURED",
          "INVENTORY_RESERVED",
          "RESERVATION_FAILED",
        ].includes(attempt.status)
      ) {
        continue;
      }

      for (const item of reservation.items ?? []) {
        if (
          item.reservationMode === "STOCK" &&
          item.productId &&
          item.variantId
        ) {
          await this.releaseStockLine({
            mode: "STOCK",
            priceCentavos: item.priceCentavos ?? 0,
            productId: item.productId,
            quantity: item.quantity,
            variantId: item.variantId,
          });
        }
      }

      this.activeReservations.delete(attemptId);
      this.expiredReservationReleases.push(reservation.id);
      this.attemptRecords.set(attemptId, {
        ...attempt,
        reservationExpiresAt: null,
        reservationId: null,
        status: "RESERVATION_FAILED",
      });
      released += 1;
    }

    return released;
  }

  async reserveStockAndCreateCheckoutReservation(
    input: CreateCheckoutReservationInput
  ) {
    const reservedLines: CheckoutReservationPlanLine[] = [];

    for (const line of input.lines) {
      const reserved = await this.reserveStockLine(line);

      if (!reserved) {
        for (const reservedLine of reservedLines.reverse()) {
          await this.releaseStockLine(reservedLine);
        }

        return null;
      }

      reservedLines.push(line);
    }

    try {
      return await this.createCheckoutReservation(input);
    } catch (error) {
      for (const reservedLine of reservedLines.reverse()) {
        await this.releaseStockLine(reservedLine);
      }

      throw error;
    }
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
  it("delegates payment creation to configured executor", async () => {
    const repository = new CheckoutRepositoryStub();
    let executorCalls = 0;
    const service = new CheckoutService({
      paymentExecutor: async (input) => {
        executorCalls += 1;
        return Result.okay({
          attempt: { attemptId: input.attemptId, status: "PAYMENT_CREATED" },
          handoff: {
            checkoutUrl: "https://checkout.paymongo.com/cs_executor",
            redirectMethod: "browser",
          },
          next: {
            orderCreated: false,
            receiptAvailable: false,
            webhookRequired: true,
          },
          payment: {
            amountCentavos: 3998,
            currency: "PHP",
            paymentId: "payment_executor",
            provider: "PAYMONGO",
            providerCheckoutSessionId: "cs_executor",
            status: "PAYMENT_PENDING",
          },
          reservation: {
            expiresAt: "2026-06-20T10:15:00.000Z",
            reservationId: "reservation_executor",
            status: "ACTIVE",
          },
        });
      },
      repository,
    });

    const result = await service.createPayment({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: "attempt_executor",
      body: { attemptToken: "attempt_token_executor" },
      requestId: "req_executor",
    });

    expect(executorCalls).toBe(1);
    expect(result.content?.payment.paymentId).toBe("payment_executor");
    expect(repository.calls).toBe(0);
  });

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
    expect(JSON.stringify(result.content)).not.toMatch(
      /token|hash|stock_version/i
    );
  });

  it("falls back to repository reservation when the durable object provider is unavailable", async () => {
    const repository = new CheckoutRepositoryStub();
    const service = new CheckoutService({
      repository,
      reservationExecutor: async () =>
        Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE")),
    });
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
      requestId: "req_checkout_reserve_executor_fallback",
    });

    expect(result.error).toBeNull();
    expect(repository.stockQuantity).toBe(6);
    expect(repository.createReservationCalls).toHaveLength(1);
    expect(result.content).toMatchObject({
      attempt: {
        status: "INVENTORY_RESERVED",
      },
      next: {
        paymentAllowed: true,
      },
      reservation: {
        status: "ACTIVE",
      },
    });
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
    repository.stockQuantity = 2;
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
    expect(repository.stockQuantity).toBe(0);
  });

  it("releases expired active reservation before reserving fresh stock", async () => {
    const repository = new CheckoutRepositoryStub();
    repository.stockQuantity = 0;
    const service = new CheckoutService({ repository });
    const details = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: checkoutDetailsBody,
      requestId: "req_checkout_details_guest",
    });
    const attemptId = details.content!.attempt.attemptId;
    repository.activeReservations.set(attemptId, {
      cartFingerprint:
        '[{"lineSubtotalCentavos":3998,"priceCentavos":1999,"productId":"prod_linen","quantity":2,"variantId":"variant_linen_small"}]',
      checkoutAttemptId: attemptId,
      expiresAt: "2026-06-12T08:14:59.000Z",
      id: "reservation_expired",
      items: [
        {
          productId: "prod_linen",
          quantity: 2,
          reservationMode: "STOCK",
          variantId: "variant_linen_small",
        },
      ],
      status: "ACTIVE",
      subtotalCentavos: 3998,
    });
    repository.attemptRecords.set(attemptId, {
      ...repository.attemptRecords.get(attemptId)!,
      cartFingerprint:
        '[{"lineSubtotalCentavos":3998,"priceCentavos":1999,"productId":"prod_linen","quantity":2,"variantId":"variant_linen_small"}]',
      reservationExpiresAt: "2026-06-12T08:14:59.000Z",
      reservationId: "reservation_expired",
      status: "INVENTORY_RESERVED",
    });

    const result = await service.reserveInventory({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId,
      body: {
        attemptToken: details.content!.attempt.attemptToken,
        ...requestBody,
      },
      now: "2026-06-12T08:15:00.000Z",
      requestId: "req_checkout_reserve_expired",
    });

    expect(result.error).toBeNull();
    expect(repository.expiredReservationReleases).toEqual([
      "reservation_expired",
    ]);
    expect(repository.releasedLines).toMatchObject([
      {
        productId: "prod_linen",
        quantity: 2,
        variantId: "variant_linen_small",
      },
    ]);
    expect(result.content?.reservation).toMatchObject({
      reservationId: "reservation_1",
      status: "ACTIVE",
    });
    expect(repository.stockQuantity).toBe(0);
  });

  it("rejects unknown attempt status before cart lookup or stock mutation", async () => {
    const repository = new CheckoutRepositoryStub();
    const service = new CheckoutService({ repository });
    const details = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: checkoutDetailsBody,
      requestId: "req_checkout_details_guest",
    });
    const attemptId = details.content!.attempt.attemptId;
    const attempt = repository.attemptRecords.get(attemptId)!;
    repository.attemptRecords.set(attemptId, {
      ...attempt,
      status: "UNKNOWN",
    });

    const result = await service.reserveInventory({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId,
      body: {
        attemptToken: details.content!.attempt.attemptToken,
        ...requestBody,
      },
      requestId: "req_checkout_unknown_status",
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(repository.calls).toBe(0);
    expect(repository.reservedLines).toHaveLength(0);
  });

  it("creates PayMongo checkout handoff from the active reservation only", async () => {
    const repository = new CheckoutRepositoryStub();
    const auditEvents: AuditEvent[] = [];
    const operationalEvents: OperationalLogEvent[] = [];
    const payMongoCalls: unknown[] = [];
    const service = new CheckoutService({
      repository,
      auditPublisher: {
        publish: async (event) => {
          auditEvents.push(event);
        },
      },
      operationalLogger: {
        record: (event) => {
          operationalEvents.push(event);
        },
      },
      payMongoClient: {
        createCheckoutSession: async (payload) => {
          payMongoCalls.push(payload);
          return Result.okay({
            checkoutUrl: "https://checkout.paymongo.com/cs_test_123",
            livemode: false,
            providerCheckoutSessionId: "cs_test_123",
            status: "active",
          });
        },
      },
      paymentConfig: {
        appBaseUrl: "https://jrw.test",
        paymentMethods: ["card", "gcash"],
        sendEmailReceipt: false,
      },
    });
    const details = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: checkoutDetailsBody,
      requestId: "req_checkout_details_guest",
    });
    await service.reserveInventory({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: {
        attemptToken: details.content!.attempt.attemptToken,
        ...requestBody,
      },
      now: "2026-06-12T08:00:00.000Z",
      requestId: "req_checkout_reserve_guest",
    });

    const result = await service.createPayment({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: { attemptToken: details.content!.attempt.attemptToken },
      now: "2026-06-12T08:01:00.000Z",
      requestId: "req_checkout_payment_guest",
    });

    expect(result.error).toBeNull();
    expect(payMongoCalls).toMatchObject([
      {
        data: {
          attributes: {
            cancel_url: "https://jrw.test/checkout",
            line_items: [
              {
                amount: 1999,
                currency: "PHP",
                name: "Linen Shirt - Size: Small",
                quantity: 2,
              },
            ],
            payment_method_types: ["card", "gcash"],
            send_email_receipt: false,
            success_url:
              "https://jrw.test/checkout/payment-return?attemptId=attempt_1",
          },
        },
      },
    ]);
    expect(repository.createPaymentCalls[0]).toMatchObject({
      amountCentavos: 3998,
      checkoutUrl: "https://checkout.paymongo.com/cs_test_123",
      currency: "PHP",
      providerCheckoutSessionId: "cs_test_123",
    });
    expect(result.content).toMatchObject({
      attempt: {
        attemptId: "attempt_1",
        status: "PAYMENT_CREATED",
      },
      handoff: {
        checkoutUrl: "https://checkout.paymongo.com/cs_test_123",
        redirectMethod: "browser",
      },
      payment: {
        amountCentavos: 3998,
        currency: "PHP",
        paymentId: "payment_1",
        provider: "PAYMONGO",
        status: "PAYMENT_PENDING",
      },
    });
    expect(JSON.stringify(result.content)).not.toMatch(
      /attemptToken|tokenHash|streetAddress|cardNumber|cvv|providerPayload/i
    );
    expect(operationalEvents).toMatchObject([
      {
        requestId: "req_checkout_payment_guest",
        targetResourceId: "payment_1",
        details: {
          action: "payment.checkout_created",
          amountCentavos: 3998,
          attemptId: "attempt_1",
          currency: "PHP",
          paymentId: "payment_1",
          providerCheckoutSessionId: "cs_test_123",
          reservationId: "reservation_1",
          status: "PAYMENT_PENDING",
        },
      },
    ]);
    expect(auditEvents).toMatchObject([
      {
        requestId: "req_checkout_payment_guest",
        action: "payment.checkout_created",
        entity: "payment",
        entityId: "payment_1",
        safeDetails: {
          amountCentavos: 3998,
          attemptId: "attempt_1",
          currency: "PHP",
          paymentId: "payment_1",
          providerCheckoutSessionId: "cs_test_123",
          reservationId: "reservation_1",
          status: "PAYMENT_PENDING",
        },
      },
    ]);
    expect(JSON.stringify({ auditEvents, operationalEvents })).not.toMatch(
      /checkout\.paymongo|attempt_token|nina@example|Sampaguita|cardNumber|providerPayload/i
    );
  });

  it("reuses existing pending payment without creating a second PayMongo session", async () => {
    const repository = new CheckoutRepositoryStub();
    let payMongoCallCount = 0;
    const service = new CheckoutService({
      repository,
      payMongoClient: {
        createCheckoutSession: async () => {
          payMongoCallCount += 1;
          return Result.okay({
            checkoutUrl: "https://checkout.paymongo.com/cs_test_reuse",
            livemode: false,
            providerCheckoutSessionId: "cs_test_reuse",
            status: "active",
          });
        },
      },
      paymentConfig: { appBaseUrl: "https://jrw.test" },
    });
    const details = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: checkoutDetailsBody,
      requestId: "req_checkout_details_guest",
    });
    await service.reserveInventory({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: {
        attemptToken: details.content!.attempt.attemptToken,
        ...requestBody,
      },
      now: "2026-06-12T08:00:00.000Z",
      requestId: "req_checkout_reserve_guest",
    });
    const input = {
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: { attemptToken: details.content!.attempt.attemptToken },
      now: "2026-06-12T08:01:00.000Z",
      requestId: "req_checkout_payment_guest",
    } as const;

    const first = await service.createPayment(input);
    const second = await service.createPayment(input);

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(payMongoCallCount).toBe(1);
    expect(repository.createPaymentCalls).toHaveLength(1);
    expect(second.content?.payment.paymentId).toBe("payment_1");
  });

  it("releases reservation when PayMongo checkout creation fails", async () => {
    const repository = new CheckoutRepositoryStub();
    const service = new CheckoutService({
      repository,
      payMongoClient: {
        createCheckoutSession: async () =>
          Result.error(new GeneralError({}, "PAYMENT_FAILED")),
      },
      paymentConfig: { appBaseUrl: "https://jrw.test" },
    });
    const details = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: checkoutDetailsBody,
      requestId: "req_checkout_details_guest",
    });
    await service.reserveInventory({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: {
        attemptToken: details.content!.attempt.attemptToken,
        ...requestBody,
      },
      now: "2026-06-12T08:00:00.000Z",
      requestId: "req_checkout_reserve_guest",
    });

    const result = await service.createPayment({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: { attemptToken: details.content!.attempt.attemptToken },
      now: "2026-06-12T08:01:00.000Z",
      requestId: "req_checkout_payment_failed",
    });

    expect(result.error?.code).toBe("PAYMENT_FAILED");
    expect(repository.paymentFailureReleases).toMatchObject([
      {
        attemptId: "attempt_1",
        reservationId: "reservation_1",
        requestId: "req_checkout_payment_failed",
      },
    ]);
    expect(repository.stockQuantity).toBe(8);
    expect(repository.attemptRecords.get("attempt_1")).toMatchObject({
      reservationId: null,
      status: "PAYMENT_CREATION_FAILED",
    });
  });

  it("rejects PayMongo handoff below provider minimum without calling provider", async () => {
    const repository = new CheckoutRepositoryStub();
    let providerCalled = false;
    repository.lines = [{ ...serverLine, priceCentavos: 22 }];
    const service = new CheckoutService({
      repository,
      payMongoClient: {
        createCheckoutSession: async () => {
          providerCalled = true;
          return Result.okay({
            checkoutUrl: "https://checkout.paymongo.com/cs_low_amount",
            livemode: false,
            providerCheckoutSessionId: "cs_low_amount",
            status: "active",
          });
        },
      },
      paymentConfig: { appBaseUrl: "https://jrw.test" },
    });
    const lowAmountBody = {
      ...requestBody,
      items: [{ ...requestBody.items[0], priceCentavos: 22, quantity: 1 }],
    };
    const details = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: checkoutDetailsBody,
      requestId: "req_checkout_details_guest",
    });
    await service.reserveInventory({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: {
        attemptToken: details.content!.attempt.attemptToken,
        ...lowAmountBody,
      },
      now: "2026-06-12T08:00:00.000Z",
      requestId: "req_checkout_reserve_low_amount",
    });

    const result = await service.createPayment({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: { attemptToken: details.content!.attempt.attemptToken },
      now: "2026-06-12T08:01:00.000Z",
      requestId: "req_checkout_payment_low_amount",
    });

    expect(providerCalled).toBe(false);
    expect(result.error).toMatchObject({
      code: "PAYMENT_FAILED",
      data: {
        minimumAmountCentavos: 100,
        subtotalCentavos: 22,
      },
    });
    expect(repository.paymentFailureReleases).toMatchObject([
      {
        attemptId: "attempt_1",
        reservationId: "reservation_1",
        requestId: "req_checkout_payment_low_amount",
      },
    ]);
    expect(repository.stockQuantity).toBe(8);
  });

  it("rejects browser-supplied payment material before provider handoff", async () => {
    const repository = new CheckoutRepositoryStub();
    let providerCalled = false;
    const service = new CheckoutService({
      repository,
      payMongoClient: {
        createCheckoutSession: async () => {
          providerCalled = true;
          return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
        },
      },
      paymentConfig: { appBaseUrl: "https://jrw.test" },
    });
    const details = await service.saveDetails({
      actor: { authenticated: false, role: "PROSPECT" },
      body: checkoutDetailsBody,
      requestId: "req_checkout_details_guest",
    });
    await service.reserveInventory({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: {
        attemptToken: details.content!.attempt.attemptToken,
        ...requestBody,
      },
      now: "2026-06-12T08:00:00.000Z",
      requestId: "req_checkout_reserve_guest",
    });

    const result = await service.createPayment({
      actor: { authenticated: false, role: "PROSPECT" },
      attemptId: details.content!.attempt.attemptId,
      body: {
        amountCentavos: 1,
        attemptToken: details.content!.attempt.attemptToken,
        cardNumber: "4242424242424242",
      },
      now: "2026-06-12T08:01:00.000Z",
      requestId: "req_checkout_payment_rejected",
    });

    expect(result.error).toMatchObject({
      code: "VALIDATION_FAILED",
      data: {
        reasons: expect.arrayContaining([
          "amountCentavos:unknown",
          "cardNumber:unknown",
        ]),
      },
    });
    expect(providerCalled).toBe(false);
    expect(repository.createPaymentCalls).toHaveLength(0);
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
    expect(
      repository.reservedLines.reduce((sum, line) => sum + line.quantity, 0)
    ).toBe(5);
  });
});
