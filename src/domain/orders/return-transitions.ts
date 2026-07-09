export const returnStatuses = [
  "RETURN_REQUESTED",
  "RETURN_APPROVED",
  "RETURN_REJECTED",
  "RETURN_RECEIVED",
  "RETURN_COMPLETED",
  "RETURN_CANCELLED",
] as const;

export const returnDisplayStatuses = [
  "RETURN_NOT_REQUESTED",
  ...returnStatuses,
] as const;

export type ReturnStatus = (typeof returnStatuses)[number];
export type ReturnDisplayStatus = (typeof returnDisplayStatuses)[number];

export type ReturnTransitionConflictReason =
  | "FULFILLMENT_NOT_DELIVERED"
  | "INVALID_TRANSITION"
  | "PAYMENT_NOT_PAID"
  | "SAME_RETURN_STATUS"
  | "STALE_RETURN_STATUS"
  | "TERMINAL_RETURN_STATUS"
  | "UNKNOWN_RETURN_STATUS"
  | "UNKNOWN_TARGET_STATUS";

export type ReturnTransitionResult =
  | {
      allowed: true;
      allowedNextStatuses: ReturnStatus[];
      fulfillmentStatus: string;
      newStatus: ReturnStatus;
      oldStatus: ReturnStatus | null;
      paymentStatus: string;
    }
  | {
      allowed: false;
      allowedNextStatuses: ReturnStatus[];
      currentStatus?: string | null;
      fulfillmentStatus?: string;
      paymentStatus?: string;
      reason: ReturnTransitionConflictReason;
      targetStatus?: string;
    };

const returnStatusSet = new Set<string>(returnStatuses);
const returnDisplayStatusSet = new Set<string>(returnDisplayStatuses);

const transitionMatrix: Record<ReturnStatus, ReturnStatus[]> = {
  RETURN_APPROVED: ["RETURN_RECEIVED"],
  RETURN_CANCELLED: [],
  RETURN_COMPLETED: [],
  RETURN_RECEIVED: ["RETURN_COMPLETED"],
  RETURN_REJECTED: [],
  RETURN_REQUESTED: [
    "RETURN_APPROVED",
    "RETURN_REJECTED",
    "RETURN_CANCELLED",
  ],
};

const labels: Record<ReturnDisplayStatus, string> = {
  RETURN_APPROVED: "Return approved",
  RETURN_CANCELLED: "Return cancelled",
  RETURN_COMPLETED: "Return completed",
  RETURN_NOT_REQUESTED: "No return requested",
  RETURN_RECEIVED: "Return received",
  RETURN_REJECTED: "Return declined",
  RETURN_REQUESTED: "Return requested",
};

function cleanStatus(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toUpperCase();

  return trimmed.length > 0 ? trimmed : null;
}

export function isReturnStatus(
  value: string | null | undefined
): value is ReturnStatus {
  const status = cleanStatus(value);

  return Boolean(status && returnStatusSet.has(status));
}

export function isReturnDisplayStatus(
  value: string | null | undefined
): value is ReturnDisplayStatus {
  const status = cleanStatus(value);

  return Boolean(status && returnDisplayStatusSet.has(status));
}

export function normalizeReturnStatus(
  value: string | null | undefined
): ReturnStatus | null {
  const status = cleanStatus(value);

  return status && returnStatusSet.has(status) ? (status as ReturnStatus) : null;
}

export function normalizeReturnDisplayStatus(
  value: string | null | undefined
): ReturnDisplayStatus {
  const status = cleanStatus(value);

  return status && returnDisplayStatusSet.has(status)
    ? (status as ReturnDisplayStatus)
    : "RETURN_NOT_REQUESTED";
}

export function allowedNextReturnStatuses(
  status: string | null | undefined
): ReturnStatus[] {
  const normalized = normalizeReturnStatus(status);

  return normalized ? [...transitionMatrix[normalized]] : ["RETURN_REQUESTED"];
}

export function returnStatusLabel(
  status: string | null | undefined
): string {
  const normalized = normalizeReturnStatus(status);

  return normalized ? labels[normalized] : "Return status unavailable";
}

export function returnDisplayStatusLabel(
  status: string | null | undefined
): string {
  const normalized = normalizeReturnDisplayStatus(status);

  return labels[normalized];
}

export function evaluateReturnTransition(input: {
  currentStatus: string | null | undefined;
  fulfillmentStatus: string | null | undefined;
  paymentStatus: string | null | undefined;
  targetStatus: string | null | undefined;
}): ReturnTransitionResult {
  const currentStatusText = cleanStatus(input.currentStatus);
  const targetStatusText = cleanStatus(input.targetStatus) ?? undefined;
  const paymentStatus = cleanStatus(input.paymentStatus) ?? undefined;
  const fulfillmentStatus = cleanStatus(input.fulfillmentStatus) ?? undefined;
  const currentStatus = normalizeReturnStatus(currentStatusText);
  const targetStatus = normalizeReturnStatus(targetStatusText);
  const allowedNextStatuses = allowedNextReturnStatuses(currentStatusText);

  if (currentStatusText && !currentStatus) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus: currentStatusText,
      fulfillmentStatus,
      paymentStatus,
      reason: "UNKNOWN_RETURN_STATUS",
      targetStatus: targetStatusText,
    };
  }

  if (!targetStatus) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus: currentStatusText,
      fulfillmentStatus,
      paymentStatus,
      reason: "UNKNOWN_TARGET_STATUS",
      targetStatus: targetStatusText,
    };
  }

  if (paymentStatus !== "PAYMENT_PAID") {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus: currentStatusText,
      fulfillmentStatus,
      paymentStatus,
      reason: "PAYMENT_NOT_PAID",
      targetStatus,
    };
  }

  if (fulfillmentStatus !== "DELIVERED") {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus: currentStatusText,
      fulfillmentStatus,
      paymentStatus,
      reason: "FULFILLMENT_NOT_DELIVERED",
      targetStatus,
    };
  }

  if (currentStatus === targetStatus) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus,
      fulfillmentStatus,
      paymentStatus,
      reason: "SAME_RETURN_STATUS",
      targetStatus,
    };
  }

  if (currentStatus && allowedNextStatuses.length === 0) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus,
      fulfillmentStatus,
      paymentStatus,
      reason: "TERMINAL_RETURN_STATUS",
      targetStatus,
    };
  }

  if (!allowedNextStatuses.includes(targetStatus)) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus,
      fulfillmentStatus,
      paymentStatus,
      reason: "INVALID_TRANSITION",
      targetStatus,
    };
  }

  return {
    allowed: true,
    allowedNextStatuses,
    fulfillmentStatus,
    newStatus: targetStatus,
    oldStatus: currentStatus,
    paymentStatus,
  };
}
