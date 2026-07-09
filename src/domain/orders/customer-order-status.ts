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

export type CustomerOrderTimelineEvent = {
  description: string;
  id: string;
  label: string;
  lane: CustomerOrderStatusLaneKind;
  title: string;
  tone: "info" | "success" | "warning";
  updatedAt: string | null;
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
  RETURN_REJECTED: "Return declined",
  RETURN_RECEIVED: "Return received",
  RETURN_COMPLETED: "Return completed",
  RETURN_CANCELLED: "Return cancelled",
};

const refundLabels: Record<string, string> = {
  REFUND_NOT_REQUESTED: "No refund requested",
  REFUND_PENDING: "Refund pending",
  REFUND_APPROVED: "Refund approved",
  REFUND_DECLINED: "Refund declined",
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
  refundUpdatedAt?: string | null;
  returnStatus?: string | null;
  returnUpdatedAt?: string | null;
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
      updatedAt: input.refundUpdatedAt,
      value: cleanStatus(input.refundStatus) ?? "REFUND_NOT_REQUESTED",
    }),
    return: lane({
      kind: "return",
      updatedAt: input.returnUpdatedAt,
      value: cleanStatus(input.returnStatus) ?? "RETURN_NOT_REQUESTED",
    }),
  };
}

function paymentTimelineEvent(
  lane: CustomerOrderStatusLane,
  createdAt?: string | null
): CustomerOrderTimelineEvent {
  switch (cleanStatus(lane.value)) {
    case "PAYMENT_PAID":
      return {
        description: "Your payment was received by JRW.",
        id: "payment-paid",
        label: "Paid",
        lane: "payment",
        title: "Payment confirmed",
        tone: "success",
        updatedAt: createdAt ?? lane.updatedAt,
      };
    case "PAYMENT_FAILED":
      return {
        description: "Payment did not complete. No order will be prepared.",
        id: "payment-failed",
        label: "Payment failed",
        lane: "payment",
        title: "Payment failed",
        tone: "warning",
        updatedAt: lane.updatedAt ?? createdAt ?? null,
      };
    case "PAYMENT_EXPIRED":
      return {
        description: "The payment session expired before confirmation.",
        id: "payment-expired",
        label: "Expired",
        lane: "payment",
        title: "Payment expired",
        tone: "warning",
        updatedAt: lane.updatedAt ?? createdAt ?? null,
      };
    case "PAYMENT_CANCELLED":
      return {
        description: "Payment was cancelled before JRW confirmed the order.",
        id: "payment-cancelled",
        label: "Cancelled",
        lane: "payment",
        title: "Payment cancelled",
        tone: "warning",
        updatedAt: lane.updatedAt ?? createdAt ?? null,
      };
    case "PAYMENT_REFUNDED":
      return {
        description: "Payment was marked as refunded.",
        id: "payment-refunded",
        label: "Refunded",
        lane: "payment",
        title: "Payment refunded",
        tone: "success",
        updatedAt: lane.updatedAt ?? createdAt ?? null,
      };
    case "PAYMENT_PENDING":
    default:
      return {
        description: "JRW is waiting for payment confirmation.",
        id: "payment-pending",
        label: "Payment pending",
        lane: "payment",
        title: "Payment pending",
        tone: "info",
        updatedAt: lane.updatedAt ?? createdAt ?? null,
      };
  }
}

function fulfillmentTimelineEvents(input: {
  createdAt?: string | null;
  lane: CustomerOrderStatusLane;
  updatedAt?: string | null;
}): CustomerOrderTimelineEvent[] {
  const createdAt = input.createdAt ?? input.lane.updatedAt;
  const updatedAt = input.updatedAt ?? input.lane.updatedAt;

  switch (cleanStatus(input.lane.value)) {
    case "DELIVERED":
      return [
        {
          description: "Your parcel was delivered.",
          id: "fulfillment-delivered",
          label: "Delivered",
          lane: "fulfillment",
          title: "Delivered",
          tone: "success",
          updatedAt,
        },
        {
          description: "Your parcel was handed to logistics.",
          id: "fulfillment-shipped",
          label: "In transit",
          lane: "fulfillment",
          title: "Parcel picked up",
          tone: "info",
          updatedAt: createdAt,
        },
        {
          description: "JRW packed and checked your item.",
          id: "fulfillment-processing",
          label: "Packed",
          lane: "fulfillment",
          title: "Packed by JRW",
          tone: "info",
          updatedAt: createdAt,
        },
        {
          description: "JRW received your order.",
          id: "fulfillment-placed",
          label: "Placed",
          lane: "fulfillment",
          title: "Order placed",
          tone: "info",
          updatedAt: createdAt,
        },
      ];
    case "SHIPPED":
      return [
        {
          description: "Your parcel was handed to logistics.",
          id: "fulfillment-shipped",
          label: "In transit",
          lane: "fulfillment",
          title: "Parcel picked up",
          tone: "info",
          updatedAt,
        },
        {
          description: "JRW packed and checked your item.",
          id: "fulfillment-processing",
          label: "Packed",
          lane: "fulfillment",
          title: "Packed by JRW",
          tone: "info",
          updatedAt: createdAt,
        },
        {
          description: "JRW received your order.",
          id: "fulfillment-placed",
          label: "Placed",
          lane: "fulfillment",
          title: "Order placed",
          tone: "info",
          updatedAt: createdAt,
        },
      ];
    case "PROCESSING":
      return [
        {
          description: "JRW is packing and checking your item.",
          id: "fulfillment-processing",
          label: "Preparing",
          lane: "fulfillment",
          title: "Packed by JRW",
          tone: "info",
          updatedAt,
        },
        {
          description: "JRW received your order.",
          id: "fulfillment-placed",
          label: "Placed",
          lane: "fulfillment",
          title: "Order placed",
          tone: "info",
          updatedAt: createdAt,
        },
      ];
    case "CANCELLED":
      return [
        {
          description: "This order was cancelled before delivery.",
          id: "fulfillment-cancelled",
          label: "Cancelled",
          lane: "fulfillment",
          title: "Order cancelled",
          tone: "warning",
          updatedAt,
        },
      ];
    case "ORDER_PLACED":
    default:
      return [
        {
          description: "JRW received your order and will prepare it next.",
          id: "fulfillment-placed",
          label: "Placed",
          lane: "fulfillment",
          title: "Order placed",
          tone: "info",
          updatedAt: createdAt,
        },
      ];
  }
}

function activeSupportTimelineEvents(input: {
  lane: CustomerOrderStatusLane;
  updatedAt?: string | null;
}): CustomerOrderTimelineEvent[] {
  const status = cleanStatus(input.lane.value);

  if (
    !status ||
    status === "RETURN_NOT_REQUESTED" ||
    status === "REFUND_NOT_REQUESTED"
  ) {
    return [];
  }

  return [
    {
      description:
        input.lane.kind === "return"
          ? "JRW is tracking this return request."
          : "JRW is tracking this refund request.",
      id: `${input.lane.kind}-${status.toLowerCase().replaceAll("_", "-")}`,
      label: input.lane.label,
      lane: input.lane.kind,
      title: input.lane.label,
      tone: /REJECTED|DECLINED|FAILED|CANCELLED/.test(status)
        ? "warning"
        : "info",
      updatedAt: input.updatedAt ?? input.lane.updatedAt,
    },
  ];
}

export function buildCustomerOrderTimeline(input: {
  createdAt?: string | null;
  lanes: CustomerOrderStatusLanes;
  updatedAt?: string | null;
}): CustomerOrderTimelineEvent[] {
  return [
    ...activeSupportTimelineEvents({
      lane: input.lanes.refund,
      updatedAt: input.updatedAt,
    }),
    ...activeSupportTimelineEvents({
      lane: input.lanes.return,
      updatedAt: input.updatedAt,
    }),
    ...fulfillmentTimelineEvents({
      createdAt: input.createdAt,
      lane: input.lanes.fulfillment,
      updatedAt: input.updatedAt,
    }),
    paymentTimelineEvent(input.lanes.payment, input.createdAt),
  ];
}
