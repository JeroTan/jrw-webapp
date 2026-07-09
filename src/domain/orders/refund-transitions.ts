export const refundStatuses = [
  "REFUND_PENDING",
  "REFUND_APPROVED",
  "REFUND_DECLINED",
  "REFUND_SENT",
  "REFUND_FAILED",
] as const;

export const refundDisplayStatuses = [
  "REFUND_NOT_REQUESTED",
  ...refundStatuses,
] as const;

export type RefundStatus = (typeof refundStatuses)[number];
export type RefundDisplayStatus = (typeof refundDisplayStatuses)[number];

export type RefundTransitionConflictReason =
  | "INVALID_TRANSITION"
  | "LEGACY_REFUND_STATUS_ALIAS"
  | "MISSING_REFUND_REFERENCE"
  | "PAYMENT_NOT_PAID"
  | "SAME_REFUND_STATUS"
  | "TERMINAL_REFUND_STATUS"
  | "UNKNOWN_REFUND_STATUS"
  | "UNKNOWN_TARGET_STATUS";

export type RefundTransitionResult =
  | {
      allowed: true;
      allowedNextStatuses: RefundStatus[];
      newStatus: RefundStatus;
      oldStatus: RefundStatus | null;
      paymentStatus: string;
    }
  | {
      allowed: false;
      allowedNextStatuses: RefundStatus[];
      currentStatus?: string | null;
      paymentStatus?: string;
      reason: RefundTransitionConflictReason;
      targetStatus?: string;
    };

const refundStatusSet = new Set<string>(refundStatuses);
const refundDisplayStatusSet = new Set<string>(refundDisplayStatuses);
const legacyAliasSet = new Set<string>([
  "REFUND_REQUESTED",
  "REFUND_REJECTED",
  "REFUND_COMPLETED",
]);

const transitionMatrix: Record<RefundStatus, RefundStatus[]> = {
  REFUND_APPROVED: ["REFUND_SENT"],
  REFUND_DECLINED: [],
  REFUND_FAILED: [],
  REFUND_PENDING: ["REFUND_APPROVED", "REFUND_DECLINED", "REFUND_FAILED"],
  REFUND_SENT: [],
};

const labels: Record<RefundDisplayStatus, string> = {
  REFUND_APPROVED: "Refund approved",
  REFUND_DECLINED: "Refund declined",
  REFUND_FAILED: "Refund failed",
  REFUND_NOT_REQUESTED: "No refund requested",
  REFUND_PENDING: "Refund pending",
  REFUND_SENT: "Refund sent",
};

function cleanStatus(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toUpperCase();

  return trimmed.length > 0 ? trimmed : null;
}

export function isRefundStatus(
  value: string | null | undefined
): value is RefundStatus {
  const status = cleanStatus(value);

  return Boolean(status && refundStatusSet.has(status));
}

export function isRefundDisplayStatus(
  value: string | null | undefined
): value is RefundDisplayStatus {
  const status = cleanStatus(value);

  return Boolean(status && refundDisplayStatusSet.has(status));
}

export function isLegacyRefundStatusAlias(
  value: string | null | undefined
): boolean {
  const status = cleanStatus(value);

  return Boolean(status && legacyAliasSet.has(status));
}

export function normalizeRefundStatus(
  value: string | null | undefined
): RefundStatus | null {
  const status = cleanStatus(value);

  return status && refundStatusSet.has(status) ? (status as RefundStatus) : null;
}

export function normalizeRefundDisplayStatus(
  value: string | null | undefined
): RefundDisplayStatus {
  const status = cleanStatus(value);

  return status && refundDisplayStatusSet.has(status)
    ? (status as RefundDisplayStatus)
    : "REFUND_NOT_REQUESTED";
}

export function allowedNextRefundStatuses(
  status: string | null | undefined
): RefundStatus[] {
  const normalized = normalizeRefundStatus(status);

  return normalized ? [...transitionMatrix[normalized]] : ["REFUND_PENDING"];
}

export function refundStatusLabel(
  status: string | null | undefined
): string {
  const normalized = normalizeRefundStatus(status);

  return normalized ? labels[normalized] : "Refund status unavailable";
}

export function refundDisplayStatusLabel(
  status: string | null | undefined
): string {
  const normalized = normalizeRefundDisplayStatus(status);

  return labels[normalized];
}

export function evaluateRefundTransition(input: {
  currentStatus: string | null | undefined;
  paymentStatus: string | null | undefined;
  referenceId?: string | null;
  targetStatus: string | null | undefined;
}): RefundTransitionResult {
  const currentStatusText = cleanStatus(input.currentStatus);
  const targetStatusText = cleanStatus(input.targetStatus) ?? undefined;
  const paymentStatus = cleanStatus(input.paymentStatus) ?? undefined;
  const currentStatus = normalizeRefundStatus(currentStatusText);
  const targetStatus = normalizeRefundStatus(targetStatusText);
  const allowedNextStatuses = allowedNextRefundStatuses(currentStatusText);

  if (currentStatusText && !currentStatus) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus: currentStatusText,
      paymentStatus,
      reason: isLegacyRefundStatusAlias(currentStatusText)
        ? "LEGACY_REFUND_STATUS_ALIAS"
        : "UNKNOWN_REFUND_STATUS",
      targetStatus: targetStatusText,
    };
  }

  if (isLegacyRefundStatusAlias(targetStatusText)) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus: currentStatusText,
      paymentStatus,
      reason: "LEGACY_REFUND_STATUS_ALIAS",
      targetStatus: targetStatusText,
    };
  }

  if (!targetStatus) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus: currentStatusText,
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
      reason: "SAME_REFUND_STATUS",
      targetStatus,
    };
  }

  if (currentStatus && allowedNextStatuses.length === 0) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus,
      paymentStatus,
      reason: "TERMINAL_REFUND_STATUS",
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

  if (targetStatus === "REFUND_SENT" && !input.referenceId?.trim()) {
    return {
      allowed: false,
      allowedNextStatuses,
      currentStatus: currentStatusText,
      paymentStatus,
      reason: "MISSING_REFUND_REFERENCE",
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
