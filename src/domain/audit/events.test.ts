import { describe, expect, it } from "vitest";
import {
  NoopAuditEventPublisher,
  auditEntityTypes,
  createAuditEvent,
} from "./events";

describe("audit event foundation", () => {
  it("creates typed audit events for sensitive domain actions", async () => {
    const event = createAuditEvent({
      eventId: "evt_1",
      requestId: "req_audit",
      action: "payment.webhook_processed",
      actor: {
        type: "system",
        role: "SYSTEM",
        safeIdentifier: "paymongo-webhook",
      },
      target: {
        entity: "payment",
        entityId: "payment_1",
      },
      safeDetails: {
        providerEventId: "evt_paymongo_1",
      },
      occurredAt: "2026-05-12T03:00:00.000Z",
    });

    expect(auditEntityTypes).toEqual([
      "account",
      "brand",
      "catalog",
      "inventory",
      "payment",
      "refund-return",
      "order",
    ]);
    expect(event).toMatchObject({
      eventId: "evt_1",
      requestId: "req_audit",
      action: "payment.webhook_processed",
      entity: "payment",
      entityId: "payment_1",
      occurredAt: "2026-05-12T03:00:00.000Z",
      version: 1,
    });

    await expect(new NoopAuditEventPublisher().publish(event)).resolves.toBeUndefined();
  });
});
