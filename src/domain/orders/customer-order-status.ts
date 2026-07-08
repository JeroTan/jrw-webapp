export type CustomerOrderStatusLaneKind =
  | "payment"
  | "fulfillment"
  | "return"
  | "refund";

export type CustomerOrderStatusLane = {
  kind: CustomerOrderStatusLaneKind;
  label: string;
  updatedAt: string | null;
  value: string;
};

export type CustomerOrderStatusLanes = {
  fulfillment: CustomerOrderStatusLane;
  payment: CustomerOrderStatusLane;
  refund: CustomerOrderStatusLane;
  return: CustomerOrderStatusLane;
};

const paymentLabels: Record<string, string> = {
  PAYMENT_PENDING: "Payment pending",
  PAYMENT_PAID: "Payment paid",
  PAYMENT_FAILED: "Payment failed",
  PAYMENT_EXPIRED: "Payment expired",
  PAYMENT_CANCELLED: "Payment cancelled",
  PAYMENT_REFUNDED: "Payment refunded",
};

const fulfillmentLabels: Record<string, string> = {
  ORDER_PLACED: "Order placed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const returnLabels: Record<string, string> = {
  RETURN_NOT_REQUESTED: "No return requested",
  RETURN_REQUESTED: "Return requested",
  RETURN_APPROVED: "Return approved",
  RETURN_REJECTED: "Return unavailable",
  RETURN_RECEIVED: "Return received",
  RETURN_COMPLETED: "Return completed",
  RETURN_CANCELLED: "Return cancelled",
};

const refundLabels: Record<string, string> = {
  REFUND_NOT_REQUESTED: "No refund requested",
  REFUND_PENDING: "Refund pending",
  REFUND_APPROVED: "Refund approved",
  REFUND_DECLINED: "Refund unavailable",
  REFUND_SENT: "Refund sent",
  REFUND_FAILED: "Refund failed",
};

function cleanStatus(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toUpperCase();

  return trimmed.length > 0 ? trimmed : null;
}

export function customerOrderStatusLaneLabel(
  kind: CustomerOrderStatusLaneKind,
  value: string | null | undefined
): string {
  const status = cleanStatus(value);

  switch (kind) {
    case "payment":
      return (status && paymentLabels[status]) ?? "Payment status unavailable";
    case "fulfillment":
      return (
        (status && fulfillmentLabels[status]) ??
        "Fulfillment status unavailable"
      );
    case "return":
      return (status && returnLabels[status]) ?? "Return status unavailable";
    case "refund":
      return (status && refundLabels[status]) ?? "Refund status unavailable";
  }
}

function lane(input: {
  kind: CustomerOrderStatusLaneKind;
  updatedAt?: string | null;
  value: string;
}): CustomerOrderStatusLane {
  return {
    kind: input.kind,
    label: customerOrderStatusLaneLabel(input.kind, input.value),
    updatedAt: input.updatedAt ?? null,
    value: input.value,
  };
}

export function buildCustomerOrderStatusLanes(input: {
  fulfillmentStatus?: string | null;
  paymentStatus?: string | null;
  refundStatus?: string | null;
  returnStatus?: string | null;
  updatedAt?: string | null;
}): CustomerOrderStatusLanes {
  const fulfillmentStatus =
    cleanStatus(input.fulfillmentStatus) ?? "FULFILLMENT_STATUS_UNAVAILABLE";
  const paymentStatus =
    cleanStatus(input.paymentStatus) ?? "PAYMENT_STATUS_UNAVAILABLE";

  return {
    fulfillment: lane({
      kind: "fulfillment",
      updatedAt: input.updatedAt,
      value: fulfillmentStatus,
    }),
    payment: lane({
      kind: "payment",
      updatedAt: input.updatedAt,
      value: paymentStatus,
    }),
    refund: lane({
      kind: "refund",
      value: cleanStatus(input.refundStatus) ?? "REFUND_NOT_REQUESTED",
    }),
    return: lane({
      kind: "return",
      value: cleanStatus(input.returnStatus) ?? "RETURN_NOT_REQUESTED",
    }),
  };
}
