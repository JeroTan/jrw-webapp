import { describe, expect, it } from "vitest";
import { Result } from "@/utils/general/result";
import { GeneralError } from "@/utils/general/error";
import type {
  InventoryReleaseRepositoryLike,
  InventoryReleaseResult,
} from "@/server/repositories/InventoryReleaseRepository";
import type { OrderConfirmationRepositoryLike } from "@/server/repositories/OrderConfirmationRepository";
import { PaymentReconciliationService } from "./PaymentReconciliationService";

const now = "2026-06-26T05:30:00.000Z";

function repositoryStub(
  overrides: Partial<OrderConfirmationRepositoryLike> = {}
): OrderConfirmationRepositoryLike & { calls: string[] } {
  const calls: string[] = [];

  return {
    calls,
    claimOrderConfirmationEmail: async () => {
      calls.push("claimOrderConfirmationEmail");
      return true;
    },
    createOrderConfirmationForPaidPayment: async () => {
      calls.push("createOrderConfirmationForPaidPayment");
      return {
        created: true,
        decision: "confirmed" as const,
        order: {
          checkoutAttemptId: "attempt_1",
          createdAt: now,
          currency: "PHP" as const,
          customerId: null,
          emailStatus: "PENDING" as const,
          fulfillmentStatus: "ORDER_PLACED" as const,
          orderId: "order_1",
          orderNumber: "JRW-2026-ORDER1",
          paymentId: "payment_1",
          paymentStatus: "PAYMENT_PAID" as const,
          reservationId: "reservation_1",
          totalCentavos: 3998,
          updatedAt: now,
        },
      };
    },
    findPaymentReturnRecord: async () => ({
      canRetry: false,
      checkoutAttemptId: "attempt_1",
      orderId: null,
      orderNumber: null,
      paymentId: "payment_1",
      paymentStatus: "PAYMENT_PAID",
      providerCheckoutSessionId: "cs_1",
      status: "pending" as const,
      totalCentavos: null,
    }),
    getOrderConfirmationEmail: async () => {
      calls.push("getOrderConfirmationEmail");
      return {
        currency: "PHP" as const,
        fulfillmentStatusLabel: "Order placed",
        items: [{ amountCentavos: 1999, name: "Linen Shirt", quantity: 2 }],
        orderNumber: "JRW-2026-ORDER1",
        paymentStatusLabel: "Payment paid",
        statusUrl: "/checkout/payment-return?paymentId=payment_1",
        toEmail: "nina@example.com",
        totalCentavos: 3998,
      };
    },
    markOrderConfirmationEmailFailed: async () => {
      calls.push("markOrderConfirmationEmailFailed");
    },
    markOrderConfirmationEmailSent: async () => {
      calls.push("markOrderConfirmationEmailSent");
    },
    markProviderCheckoutSessionPaid: async () => {
      calls.push("markProviderCheckoutSessionPaid");
      return {
        decision: "paid" as const,
        paymentId: "payment_1",
        paymentStatus: "PAYMENT_PAID" as const,
      };
    },
    markProviderCheckoutSessionTerminal: async (input) => {
      calls.push("markProviderCheckoutSessionTerminal");
      return {
        decision: "terminal" as const,
        paymentId: "payment_1",
        paymentStatus: input.targetStatus,
      };
    },
    ...overrides,
  };
}

function pendingPaymentRecord() {
  return {
    canRetry: false,
    checkoutAttemptId: "attempt_1",
    orderId: null,
    orderNumber: null,
    paymentId: "payment_1",
    paymentStatus: "PAYMENT_PENDING",
    providerCheckoutSessionId: "cs_1",
    status: "pending" as const,
    totalCentavos: null,
  };
}

function releasedInventoryResult(
  overrides: Partial<InventoryReleaseResult> = {}
): InventoryReleaseResult {
  return {
    attemptId: "attempt_1",
    decision: "released",
    itemCount: 1,
    paymentId: "payment_1",
    paymentStatus: "PAYMENT_EXPIRED",
    releaseReason: "PAYMENT_EXPIRED",
    reservationId: "reservation_1",
    restoredQuantity: 2,
    ...overrides,
  } as InventoryReleaseResult;
}

function inventoryReleaseRepositoryStub(
  result: InventoryReleaseResult
): InventoryReleaseRepositoryLike & { calls: unknown[] } {
  const calls: unknown[] = [];

  return {
    calls,
    releaseInventoryForPayment: async (input) => {
      calls.push(input);
      return result;
    },
  };
}

describe("PaymentReconciliationService", () => {
  it("confirms paid payment, sends confirmation email, and returns safe summary", async () => {
    const repository = repositoryStub();
    const emailPayloads: unknown[] = [];
    const service = new PaymentReconciliationService({
      emailNotifier: {
        sendOrderConfirmationEmail: async (input) => {
          emailPayloads.push(input);
          return { ok: true, messageId: "email_1" };
        },
      },
      repository,
    });

    const result = await service.confirmPaidPayment({
      now,
      paymentId: "payment_1",
      requestId: "req_reconcile",
    });

    expect(result).toEqual(
      Result.okay({
        email: { status: "SENT" },
        order: {
          fulfillmentStatus: "ORDER_PLACED",
          orderId: "order_1",
          orderNumber: "JRW-2026-ORDER1",
          totalCentavos: 3998,
        },
        payment: { paymentId: "payment_1", status: "PAYMENT_PAID" },
      })
    );
    expect(repository.calls).toEqual([
      "createOrderConfirmationForPaidPayment",
      "claimOrderConfirmationEmail",
      "getOrderConfirmationEmail",
      "markOrderConfirmationEmailSent",
    ]);
    expect(JSON.stringify(emailPayloads)).not.toMatch(
      /checkout\.paymongo|attemptToken|card|secret|Sampaguita|0917/i
    );
  });

  it("creates missing order confirmation from paid server state on return status", async () => {
    const repository = repositoryStub();
    const service = new PaymentReconciliationService({
      emailNotifier: {
        sendOrderConfirmationEmail: async () => ({ ok: true }),
      },
      repository,
    });

    const result = await service.getPaymentReturnStatus({
      attemptId: "attempt_1",
      now,
      requestId: "req_return",
    });

    expect(result.content).toMatchObject({
      status: "confirmed",
      order: {
        orderId: "order_1",
        orderNumber: "JRW-2026-ORDER1",
      },
      payment: {
        paymentId: "payment_1",
        status: "PAYMENT_PAID",
      },
    });
  });

  it("does not create orders for pending return state", async () => {
    const repository = repositoryStub({
      findPaymentReturnRecord: async () => pendingPaymentRecord(),
    });
    const service = new PaymentReconciliationService({ repository });

    const result = await service.getPaymentReturnStatus({
      attemptId: "attempt_1",
      requestId: "req_pending",
    });

    expect(result.content).toMatchObject({
      status: "pending",
      next: { refreshAllowed: true, retryCheckoutAllowed: false },
    });
    expect(repository.calls).toEqual([]);
  });

  it("confirms pending return when PayMongo fallback reports paid", async () => {
    const repository = repositoryStub({
      findPaymentReturnRecord: async () => pendingPaymentRecord(),
    });
    const providerLookups: string[] = [];
    const service = new PaymentReconciliationService({
      emailNotifier: {
        sendOrderConfirmationEmail: async () => ({ ok: true }),
      },
      paymentStatusProvider: {
        getCheckoutSessionPaymentStatus: async (providerCheckoutSessionId) => {
          providerLookups.push(providerCheckoutSessionId);

          return Result.okay({
            paid: true,
            providerCheckoutSessionId,
            providerPaymentId: "pay_1",
            status: "active",
          });
        },
      },
      repository,
    });

    const result = await service.getPaymentReturnStatus({
      attemptId: "attempt_1",
      now,
      requestId: "req_fallback_paid",
    });

    expect(providerLookups).toEqual(["cs_1"]);
    expect(repository.calls).toEqual([
      "markProviderCheckoutSessionPaid",
      "createOrderConfirmationForPaidPayment",
      "claimOrderConfirmationEmail",
      "getOrderConfirmationEmail",
      "markOrderConfirmationEmailSent",
    ]);
    expect(result.content).toMatchObject({
      status: "confirmed",
      next: { refreshAllowed: false, retryCheckoutAllowed: false },
      order: {
        orderId: "order_1",
        orderNumber: "JRW-2026-ORDER1",
      },
      payment: { paymentId: "payment_1", status: "PAYMENT_PAID" },
    });
  });

  it("keeps pending return when PayMongo fallback is not paid", async () => {
    const repository = repositoryStub({
      findPaymentReturnRecord: async () => pendingPaymentRecord(),
    });
    const service = new PaymentReconciliationService({
      paymentStatusProvider: {
        getCheckoutSessionPaymentStatus: async (providerCheckoutSessionId) =>
          Result.okay({
            paid: false,
            providerCheckoutSessionId,
            status: "active",
          }),
      },
      repository,
    });

    const result = await service.getPaymentReturnStatus({
      attemptId: "attempt_1",
      requestId: "req_fallback_unpaid",
    });

    expect(result.content).toMatchObject({
      status: "pending",
      next: { refreshAllowed: true, retryCheckoutAllowed: false },
    });
    expect(repository.calls).toEqual([]);
  });

  it("normalizes expired PayMongo fallback into retryable terminal payment state", async () => {
    const repository = repositoryStub({
      findPaymentReturnRecord: async () => pendingPaymentRecord(),
    });
    const service = new PaymentReconciliationService({
      paymentStatusProvider: {
        getCheckoutSessionPaymentStatus: async (providerCheckoutSessionId) =>
          Result.okay({
            paid: false,
            providerCheckoutSessionId,
            status: "expired",
          }),
      },
      repository,
    });

    const result = await service.getPaymentReturnStatus({
      attemptId: "attempt_1",
      requestId: "req_fallback_expired",
    });

    expect(repository.calls).toEqual(["markProviderCheckoutSessionTerminal"]);
    expect(result.content).toMatchObject({
      status: "expired",
      next: { refreshAllowed: false, retryCheckoutAllowed: true },
      payment: { paymentId: "payment_1", status: "PAYMENT_EXPIRED" },
    });
  });

  it("releases inventory after terminal PayMongo fallback state", async () => {
    const repository = repositoryStub({
      findPaymentReturnRecord: async () => pendingPaymentRecord(),
    });
    const inventoryReleaseRepository = inventoryReleaseRepositoryStub(
      releasedInventoryResult()
    );
    const auditEvents: unknown[] = [];
    const service = new PaymentReconciliationService({
      auditPublisher: {
        publish: async (event) => {
          auditEvents.push(event);
        },
      },
      inventoryReleaseRepository,
      paymentStatusProvider: {
        getCheckoutSessionPaymentStatus: async (providerCheckoutSessionId) =>
          Result.okay({
            paid: false,
            providerCheckoutSessionId,
            status: "expired",
          }),
      },
      repository,
    });

    const result = await service.getPaymentReturnStatus({
      attemptId: "attempt_1",
      now,
      requestId: "req_terminal_release",
    });

    expect(inventoryReleaseRepository.calls).toEqual([
      {
        now,
        paymentId: "payment_1",
        requestId: "req_terminal_release",
      },
    ]);
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "inventory.released",
        entity: "inventory",
        entityId: "reservation_1",
      }),
    ]);
    expect(result.content).toMatchObject({
      status: "expired",
      payment: { paymentId: "payment_1", status: "PAYMENT_EXPIRED" },
    });
  });

  it("expires and releases stale pending payment return inventory", async () => {
    const repository = repositoryStub({
      findPaymentReturnRecord: async () => pendingPaymentRecord(),
    });
    const inventoryReleaseRepository = inventoryReleaseRepositoryStub(
      releasedInventoryResult({
        paymentStatus: "PAYMENT_EXPIRED",
        releaseReason: "PENDING_TIMEOUT",
      })
    );
    const service = new PaymentReconciliationService({
      inventoryReleaseRepository,
      repository,
    });

    const result = await service.getPaymentReturnStatus({
      attemptId: "attempt_1",
      now,
      requestId: "req_stale_release",
    });

    expect(inventoryReleaseRepository.calls).toEqual([
      {
        allowPendingTimeout: true,
        now,
        paymentId: "payment_1",
        releaseReason: "PENDING_TIMEOUT",
        requestId: "req_stale_release",
      },
    ]);
    expect(result.content).toMatchObject({
      status: "expired",
      next: { refreshAllowed: false, retryCheckoutAllowed: true },
      payment: { paymentId: "payment_1", status: "PAYMENT_EXPIRED" },
    });
  });

  it("publishes audit and logs failures for batch stale pending release", async () => {
    const auditEvents: unknown[] = [];
    const logs: unknown[] = [];
    const batchResults: InventoryReleaseResult[] = [
      releasedInventoryResult({
        paymentStatus: "PAYMENT_EXPIRED",
        releaseReason: "PENDING_TIMEOUT",
      }),
      releasedInventoryResult({
        decision: "failed",
        errorCode: "INVENTORY_RELEASE_FAILED",
        paymentId: "payment_2",
        releaseReason: "PENDING_TIMEOUT",
        reservationId: "reservation_2",
        restoredQuantity: 0,
      } as Partial<InventoryReleaseResult>),
    ];
    const service = new PaymentReconciliationService({
      auditPublisher: {
        publish: async (event) => {
          auditEvents.push(event);
        },
      },
      inventoryReleaseRepository: {
        releaseInventoryForPayment: async () => batchResults[0],
        releaseStalePendingPayments: async () => ({
          failedCount: 1,
          processedCount: 2,
          releasedCount: 1,
          results: batchResults,
          skippedCount: 0,
        }),
      },
      operationalLogger: {
        record: (event) => {
          logs.push(event);
        },
      },
      repository: repositoryStub(),
    });

    const result = await service.releaseStalePendingPayments({
      limit: 10,
      now,
      requestId: "req_stale_batch",
    });

    expect(result.content).toMatchObject({
      failedCount: 1,
      processedCount: 2,
      releasedCount: 1,
      skippedCount: 0,
    });
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "inventory.released",
        entityId: "reservation_1",
      }),
    ]);
    expect(logs).toEqual([
      expect.objectContaining({
        details: expect.objectContaining({
          action: "inventory.release_failed",
          errorCode: "INVENTORY_RELEASE_FAILED",
          paymentId: "payment_2",
          releaseReason: "PENDING_TIMEOUT",
          reservationId: "reservation_2",
        }),
        requestId: "req_stale_batch",
      }),
    ]);
    expect(JSON.stringify({ auditEvents, logs })).not.toMatch(
      /nina@example|0917|Sampaguita|checkout\.paymongo|secret|card/i
    );
  });

  it("keeps terminal response and logs safely when inventory release fails", async () => {
    const repository = repositoryStub({
      findPaymentReturnRecord: async () => pendingPaymentRecord(),
    });
    const inventoryReleaseRepository = inventoryReleaseRepositoryStub(
      releasedInventoryResult({
        decision: "failed",
        errorCode: "INVENTORY_RELEASE_FAILED",
        restoredQuantity: 0,
      } as Partial<InventoryReleaseResult>)
    );
    const logs: unknown[] = [];
    const service = new PaymentReconciliationService({
      inventoryReleaseRepository,
      operationalLogger: {
        record: (event) => {
          logs.push(event);
        },
      },
      paymentStatusProvider: {
        getCheckoutSessionPaymentStatus: async (providerCheckoutSessionId) =>
          Result.okay({
            paid: false,
            providerCheckoutSessionId,
            status: "expired",
          }),
      },
      repository,
    });

    const result = await service.getPaymentReturnStatus({
      attemptId: "attempt_1",
      requestId: "req_release_failed",
    });

    expect(result.content).toMatchObject({
      status: "expired",
      payment: { paymentId: "payment_1", status: "PAYMENT_EXPIRED" },
    });
    expect(JSON.stringify(logs)).toContain("inventory.release_failed");
    expect(logs).toEqual([
      expect.objectContaining({
        details: expect.objectContaining({
          action: "inventory.release_failed",
          errorCode: "INVENTORY_RELEASE_FAILED",
          paymentId: "payment_1",
          releaseReason: "PAYMENT_EXPIRED",
          reservationId: "reservation_1",
        }),
        errorCode: "INTERNAL_ERROR",
        requestId: "req_release_failed",
        targetResourceId: "payment_1",
      }),
    ]);
    expect(JSON.stringify(logs)).not.toMatch(
      /nina@example|0917|Sampaguita|checkout\.paymongo|secret|card/i
    );
  });

  it("keeps pending return when PayMongo fallback returns a different session id", async () => {
    const repository = repositoryStub({
      findPaymentReturnRecord: async () => pendingPaymentRecord(),
    });
    const service = new PaymentReconciliationService({
      paymentStatusProvider: {
        getCheckoutSessionPaymentStatus: async () =>
          Result.okay({
            paid: true,
            providerCheckoutSessionId: "cs_other",
            providerPaymentId: "pay_other",
            status: "active",
          }),
      },
      repository,
    });

    const result = await service.getPaymentReturnStatus({
      attemptId: "attempt_1",
      requestId: "req_fallback_mismatch",
    });

    expect(result.content).toMatchObject({
      status: "pending",
      next: { refreshAllowed: true, retryCheckoutAllowed: false },
    });
    expect(repository.calls).toEqual([]);
  });

  it("does not override terminal payment state during fallback", async () => {
    const repository = repositoryStub({
      findPaymentReturnRecord: async () => ({
        ...pendingPaymentRecord(),
        canRetry: true,
        paymentStatus: "PAYMENT_FAILED",
        status: "failed" as const,
      }),
    });
    const providerLookups: string[] = [];
    const service = new PaymentReconciliationService({
      paymentStatusProvider: {
        getCheckoutSessionPaymentStatus: async (providerCheckoutSessionId) => {
          providerLookups.push(providerCheckoutSessionId);

          return Result.okay({
            paid: true,
            providerCheckoutSessionId,
            status: "active",
          });
        },
      },
      repository,
    });

    const result = await service.getPaymentReturnStatus({
      attemptId: "attempt_1",
      requestId: "req_terminal",
    });

    expect(providerLookups).toEqual([]);
    expect(repository.calls).toEqual([]);
    expect(result.content).toMatchObject({
      status: "failed",
      next: { refreshAllowed: false, retryCheckoutAllowed: true },
    });
  });

  it("retries idempotent inventory release for already terminal return state", async () => {
    const repository = repositoryStub({
      findPaymentReturnRecord: async () => ({
        ...pendingPaymentRecord(),
        canRetry: true,
        paymentStatus: "PAYMENT_EXPIRED",
        status: "expired" as const,
      }),
    });
    const inventoryReleaseRepository = inventoryReleaseRepositoryStub(
      releasedInventoryResult()
    );
    const providerLookups: string[] = [];
    const service = new PaymentReconciliationService({
      inventoryReleaseRepository,
      paymentStatusProvider: {
        getCheckoutSessionPaymentStatus: async (providerCheckoutSessionId) => {
          providerLookups.push(providerCheckoutSessionId);

          return Result.okay({
            paid: true,
            providerCheckoutSessionId,
            status: "active",
          });
        },
      },
      repository,
    });

    const result = await service.getPaymentReturnStatus({
      attemptId: "attempt_1",
      now,
      requestId: "req_terminal_retry",
    });

    expect(providerLookups).toEqual([]);
    expect(inventoryReleaseRepository.calls).toEqual([
      {
        now,
        paymentId: "payment_1",
        requestId: "req_terminal_retry",
      },
    ]);
    expect(result.content).toMatchObject({
      status: "expired",
      next: { refreshAllowed: false, retryCheckoutAllowed: true },
    });
  });

  it("keeps pending return safe when PayMongo fallback is unavailable", async () => {
    const repository = repositoryStub({
      findPaymentReturnRecord: async () => pendingPaymentRecord(),
    });
    const service = new PaymentReconciliationService({
      paymentStatusProvider: {
        getCheckoutSessionPaymentStatus: async () =>
          Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE")),
      },
      repository,
    });

    const result = await service.getPaymentReturnStatus({
      attemptId: "attempt_1",
      requestId: "req_fallback_provider_down",
    });

    expect(result.content).toMatchObject({
      status: "pending",
      next: { refreshAllowed: true, retryCheckoutAllowed: false },
    });
    expect(repository.calls).toEqual([]);
  });
});
