import { describe, expect, it } from "vitest";
import { Result } from "@/utils/general/result";
import { CheckoutPaymentAttemptCoordinator } from "./CheckoutPaymentAttemptCoordinator";

const paymentResult = {
  attempt: { attemptId: "attempt_concurrent", status: "PAYMENT_CREATED" as const },
  handoff: {
    checkoutUrl: "https://checkout.paymongo.com/cs_concurrent",
    redirectMethod: "browser" as const,
  },
  next: {
    orderCreated: false as const,
    receiptAvailable: false as const,
    webhookRequired: true as const,
  },
  payment: {
    amountCentavos: 3998,
    currency: "PHP",
    paymentId: "payment_concurrent",
    provider: "PAYMONGO" as const,
    providerCheckoutSessionId: "cs_concurrent",
    status: "PAYMENT_PENDING" as const,
  },
  reservation: {
    expiresAt: "2026-06-20T10:15:00.000Z",
    reservationId: "reservation_concurrent",
    status: "ACTIVE" as const,
  },
};

describe("CheckoutPaymentAttemptCoordinator", () => {
  it("serializes concurrent payment creation for one attempt", async () => {
    const coordinator = new CheckoutPaymentAttemptCoordinator();
    let providerCalls = 0;
    let activeCalls = 0;
    let maxActiveCalls = 0;
    let releaseProvider!: () => void;
    const providerGate = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });
    const create = async () => {
      providerCalls += 1;
      activeCalls += 1;
      maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
      await providerGate;
      activeCalls -= 1;
      return Result.okay(paymentResult);
    };

    const first = coordinator.run("attempt_concurrent", create);
    const second = coordinator.run("attempt_concurrent", create);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(providerCalls).toBe(1);
    releaseProvider();
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(providerCalls).toBe(2);
    expect(maxActiveCalls).toBe(1);
    expect(firstResult.content).toEqual(paymentResult);
    expect(secondResult.content).toEqual(paymentResult);
  });
});
