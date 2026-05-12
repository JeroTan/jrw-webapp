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
  entityId?: string;
};

export type AuditEvent = {
  eventId: string;
  requestId: string;
  action: string;
  actor: AuditActor;
  target: AuditTarget;
  entity: AuditEntityType;
  entityId?: string;
  safeDetails?: Record<string, unknown>;
  occurredAt: string;
  timestamp: string;
  version: 1;
};

export type CreateAuditEventInput = {
  requestId: string;
  action: string;
  actor: AuditActor;
  target: AuditTarget;
  eventId?: string;
  safeDetails?: Record<string, unknown>;
  occurredAt?: string;
  version?: 1;
};

export type AuditEventPublisher = {
  publish(event: AuditEvent): Promise<void>;
};

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
    safeDetails: input.safeDetails,
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
