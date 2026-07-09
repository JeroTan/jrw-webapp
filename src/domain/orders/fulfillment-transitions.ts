export const fulfillmentStatuses = [
  "ORDER_PLACED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type FulfillmentStatus = (typeof fulfillmentStatuses)[number];

export type FulfillmentTransitionConflictReason =
  | "INVALID_TRANSITION"
  | "PAYMENT_NOT_PAID"
  | "SAME_FULFILLMENT_STATUS"
  | "STALE_FULFILLMENT_STATUS"
  | "TERMINAL_FULFILLMENT_STATUS"
  | "UNKNOWN_FULFILLMENT_STATUS"
  | "UNKNOWN_TARGET_STATUS";

export type FulfillmentTransitionResult =
  | {
      allowed: true;
      allowedNextStatuses: FulfillmentStatus[];
      newStatus: FulfillmentStatus;
      oldStatus: FulfillmentStatus;
      paymentStatus: string;
    }
  | {
      allowed: false;
      allowedNextStatuses: FulfillmentStatus[];
      currentStatus?: string;
      paymentStatus?: string;
      reason: FulfillmentTransitionConflictReason;
      targetStatus?: string;
    };

const fulfillmentStatusSet = new Set<string>(fulfillmentStatuses);

const transitionMatrix: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  CANCELLED: [],
  DELIVERED: [],
  ORDER_PLACED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
};

const labels: Record<FulfillmentStatus, string> = {
  CANCELLED: "Cancelled",
  DELIVERED: "Delivered",
  ORDER_PLACED: "Order placed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
};

function cleanStatus(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toUpperCase();

  return trimmed.length > 0 ? trimmed : null;
}

export function isFulfillmentStatus(
  value: string | null | undefined
): value is FulfillmentStatus {
  const status = cleanStatus(value);

  return Boolean(status && fulfillmentStatusSet.has(status));
}

export function normalizeFulfillmentStatus(
  value: string | null | undefined
): FulfillmentStatus | null {
  const status = cleanStatus(value);

  return status && fulfillmentStatusSet.has(status)
    ? (status as FulfillmentStatus)
    : null;
}

export function allowedNextFulfillmentStatuses(
  status: string | null | undefined
): FulfillmentStatus[] {
  const normalized = normalizeFulfillmentStatus(status);

  return normalized ? [...transitionMatrix[normalized]] : [];
}

export function fulfillmentStatusLabel(
  status: string | null | undefined
): string {
  const normalized = normalizeFulfillmentStatus(status);

  return normalized ? labels[normalized] : "Fulfillment status unavailable";
}

export function evaluateFulfillmentTransition(input: {
  currentStatus: string | null | undefined;
  paymentStatus: string | null | undefined;
  targetStatus: string | null | undefined;
}): FulfillmentTransitionResult {
  const currentStatusText = cleanStatus(input.currentStatus) ?? undefined;
  const targetStatusText = cleanStatus(input.targetStatus) ?? undefined;
  const paymentStatus = cleanStatus(input.paymentStatus) ?? undefined;
  const currentStatus = normalizeFulfillmentStatus(currentStatusText);
  const targetStatus = normalizeFulfillmentStatus(targetStatusText);
  const allowedNextStatuses = allowedNextFulfillmentStatuses(currentStatusText);

  if (!currentStatus) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus: currentStatusText,
      paymentStatus,
      reason: "UNKNOWN_FULFILLMENT_STATUS",
      targetStatus: targetStatusText,
    };
  }

  if (!targetStatus) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus,
      paymentStatus,
      reason: "UNKNOWN_TARGET_STATUS",
      targetStatus: targetStatusText,
    };
  }

  if (paymentStatus !== "PAYMENT_PAID") {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus,
      paymentStatus,
      reason: "PAYMENT_NOT_PAID",
      targetStatus,
    };
  }

  if (currentStatus === targetStatus) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus,
      paymentStatus,
      reason: "SAME_FULFILLMENT_STATUS",
      targetStatus,
    };
  }

  if (allowedNextStatuses.length === 0) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus,
      paymentStatus,
      reason: "TERMINAL_FULFILLMENT_STATUS",
      targetStatus,
    };
  }

  if (!allowedNextStatuses.includes(targetStatus)) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus,
      paymentStatus,
      reason: "INVALID_TRANSITION",
      targetStatus,
    };
  }

  return {
    allowed: true,
    allowedNextStatuses,
    newStatus: targetStatus,
    oldStatus: currentStatus,
    paymentStatus,
  };
}
