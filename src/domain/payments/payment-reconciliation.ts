export const ORDER_FULFILLMENT_STATUS = [
  "ORDER_PLACED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export const ORDER_CONFIRMATION_EMAIL_STATUS = [
  "PENDING",
  "SENDING",
  "SENT",
  "FAILED",
] as const;

export const PAYMENT_RETURN_STATUS = [
  "pending",
  "confirmed",
  "failed",
  "expired",
  "cancelled",
  "refunded",
  "unknown",
] as const;

export type OrderFulfillmentStatus = (typeof ORDER_FULFILLMENT_STATUS)[number];
export type OrderConfirmationEmailStatus =
  (typeof ORDER_CONFIRMATION_EMAIL_STATUS)[number];
export type PaymentReturnStatus = (typeof PAYMENT_RETURN_STATUS)[number];

export function initialOrderFulfillmentStatus(): OrderFulfillmentStatus {
  return "ORDER_PLACED";
}

export function isPaidPaymentStatus(
  status: string | null | undefined
): boolean {
  return status === "PAYMENT_PAID";
}

export function paymentReturnStatusFromPayment(input: {
  orderId?: string | null;
  paymentStatus?: string | null;
}): PaymentReturnStatus {
  switch (input.paymentStatus) {
    case "PAYMENT_PAID":
      return input.orderId ? "confirmed" : "pending";
    case "PAYMENT_PENDING":
      return "pending";
    case "PAYMENT_FAILED":
      return "failed";
    case "PAYMENT_EXPIRED":
      return "expired";
    case "PAYMENT_CANCELLED":
      return "cancelled";
    case "PAYMENT_REFUNDED":
      return "refunded";
    default:
      return "unknown";
  }
}

export function canRetryPaymentReturnStatus(
  status: PaymentReturnStatus
): boolean {
  return (
    status === "failed" ||
    status === "expired" ||
    status === "cancelled" ||
    status === "unknown"
  );
}
