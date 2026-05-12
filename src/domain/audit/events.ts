import { createId } from "@paralleldrive/cuid2";

export const auditEntityTypes = [
  "account",
  "brand",
  "catalog",
  "inventory",
  "payment",
  "refund-return",
  "order",
] as const;

export type AuditEntityType = (typeof auditEntityTypes)[number];

export const auditActionTypes = [
  "account.registered",
  "account.updated",
  "account.email_verified",
  "account.password_reset_requested",
  "account.password_changed",
  "account.admin_approved",
  "account.suspended",
  "account.ownership_transferred",
  "brand.created",
  "brand.updated",
  "brand.archived",
  "brand.member_invited",
  "brand.member_joined",
  "brand.member_removed",
  "catalog.category_created",
  "catalog.category_updated",
  "catalog.product_created",
  "catalog.product_updated",
  "catalog.product_published",
  "catalog.product_archived",
  "catalog.image_uploaded",
  "inventory.stock_adjusted",
  "inventory.reserved",
  "inventory.released",
  "inventory.unavailable",
  "payment.checkout_created",
  "payment.webhook_processed",
  "payment.webhook_rejected",
  "payment.failed",
  "payment.reconciled",
  "refund-return.return_recorded",
  "refund-return.refund_recorded",
  "refund-return.status_changed",
  "order.created",
  "order.status_changed",
  "order.fulfilled",
  "order.cancelled",
] as const;

export type AuditActionType = (typeof auditActionTypes)[number];

export type AuditActorRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CUSTOMER"
  | "PROSPECT"
  | "SYSTEM"
  | "UNKNOWN";

export type AuditActor = {
  type: "user" | "system" | "provider";
  id?: string;
  role?: AuditActorRole;
  safeIdentifier?: string;
};

export type AuditTarget = {
  entity: AuditEntityType;
  entityId: string;
};

export type AuditSafeDetails = Record<string, unknown>;

export type AuditEvent = {
  eventId: string;
  requestId: string;
  action: AuditActionType;
  actor: AuditActor;
  target: AuditTarget;
  entity: AuditEntityType;
  entityId: string;
  safeDetails?: AuditSafeDetails;
  occurredAt: string;
  timestamp: string;
  version: 1;
};

export type CreateAuditEventInput = {
  requestId: string;
  action: AuditActionType;
  actor: AuditActor;
  target: AuditTarget;
  eventId?: string;
  safeDetails?: AuditSafeDetails;
  occurredAt?: string;
  version?: 1;
};

export type AuditEventPublisher = {
  publish(event: AuditEvent): Promise<void>;
};

export const AUDIT_REDACTED_VALUE = "[REDACTED]";

const auditSensitiveKeyPatterns = [
  /password/i,
  /passphrase/i,
  /hash/i,
  /jwt/i,
  /token/i,
  /secret/i,
  /cookie/i,
  /authorization/i,
  /signature/i,
  /session/i,
  /email/i,
  /paymongo/i,
  /provider.*payload/i,
  /raw.*provider/i,
  /provider.*response/i,
  /payment.*payload/i,
  /payment.*response/i,
  /raw.*payment/i,
  /raw.*payload/i,
  /card/i,
  /pepper/i,
  /stack/i,
  /phone/i,
  /address/i,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shouldRedactAuditKey(key: string): boolean {
  return auditSensitiveKeyPatterns.some((pattern) => pattern.test(key));
}

function shouldRedactAuditString(value: string): boolean {
  return (
    /^Bearer\s+/i.test(value) ||
    /^(sk|pk)_(test|live)_/i.test(value) ||
    /^ya29\./i.test(value) ||
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value) ||
    /\b(password|secret|token|jwt|cookie|paymongo|raw payment|provider payload|stack)\b/i.test(
      value,
    )
  );
}

function scrubAuditValue(value: unknown, key = "", seen = new WeakSet<object>()): unknown {
  if (key && shouldRedactAuditKey(key)) {
    return AUDIT_REDACTED_VALUE;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: AUDIT_REDACTED_VALUE,
      stack: AUDIT_REDACTED_VALUE,
    };
  }

  if (typeof value === "string") {
    return shouldRedactAuditString(value) ? AUDIT_REDACTED_VALUE : value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return AUDIT_REDACTED_VALUE;
    }

    seen.add(value);
    return value.map((item) => scrubAuditValue(item, "", seen));
  }

  if (isRecord(value)) {
    if (seen.has(value)) {
      return AUDIT_REDACTED_VALUE;
    }

    seen.add(value);
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        scrubAuditValue(entryValue, entryKey, seen),
      ]),
    );
  }

  return value;
}

export function scrubAuditDetails(details?: AuditSafeDetails): AuditSafeDetails | undefined {
  if (!details) return undefined;

  return scrubAuditValue(details) as AuditSafeDetails;
}

export function createAuditEvent(input: CreateAuditEventInput): AuditEvent {
  const occurredAt = input.occurredAt ?? new Date().toISOString();

  return {
    eventId: input.eventId ?? `evt_${createId()}`,
    requestId: input.requestId,
    action: input.action,
    actor: input.actor,
    target: input.target,
    entity: input.target.entity,
    entityId: input.target.entityId,
    safeDetails: scrubAuditDetails(input.safeDetails),
    occurredAt,
    timestamp: occurredAt,
    version: input.version ?? 1,
  };
}

export class NoopAuditEventPublisher implements AuditEventPublisher {
  async publish(_event: AuditEvent): Promise<void> {
    return undefined;
  }
}
