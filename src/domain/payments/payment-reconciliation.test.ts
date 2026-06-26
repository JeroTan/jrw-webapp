import { describe, expect, it } from "vitest";
import {
  canRetryPaymentReturnStatus,
  initialOrderFulfillmentStatus,
  isPaidPaymentStatus,
  paymentReturnStatusFromPayment,
} from "./payment-reconciliation";

describe("payment reconciliation domain", () => {
  it("separates paid payment truth from order confirmation state", () => {
    expect(isPaidPaymentStatus("PAYMENT_PAID")).toBe(true);
    expect(isPaidPaymentStatus("PAYMENT_PENDING")).toBe(false);
    expect(initialOrderFulfillmentStatus()).toBe("ORDER_PLACED");
    expect(
      paymentReturnStatusFromPayment({
        paymentStatus: "PAYMENT_PAID",
        orderId: null,
      })
    ).toBe("pending");
    expect(
      paymentReturnStatusFromPayment({
        paymentStatus: "PAYMENT_PAID",
        orderId: "order_1",
      })
    ).toBe("confirmed");
  });

  it("maps terminal provider/server statuses to safe return labels", () => {
    expect(
      paymentReturnStatusFromPayment({ paymentStatus: "PAYMENT_FAILED" })
    ).toBe("failed");
    expect(
      paymentReturnStatusFromPayment({ paymentStatus: "PAYMENT_EXPIRED" })
    ).toBe("expired");
    expect(
      paymentReturnStatusFromPayment({ paymentStatus: "PAYMENT_CANCELLED" })
    ).toBe("cancelled");
    expect(canRetryPaymentReturnStatus("cancelled")).toBe(true);
    expect(canRetryPaymentReturnStatus("pending")).toBe(false);
  });
});
