import { describe, expect, it } from "vitest";
import { Result } from "@/utils/general/result";
import { GeneralError } from "@/utils/general/error";
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
        items: [{ amountCentavos: 1999, name: "Linen Shirt", quantity: 2 }],
        orderNumber: "JRW-2026-ORDER1",
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
