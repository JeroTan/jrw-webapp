import { describe, expect, it } from "vitest";
import {
  AUDIT_REDACTED_VALUE,
  NoopAuditEventPublisher,
  auditActionTypes,
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
        providerPayload: {
          secret: "sk_test_raw",
        },
        customerEmail: "customer@example.test",
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
    expect(auditActionTypes).toContain("payment.webhook_processed");
    expect(event).toMatchObject({
      eventId: "evt_1",
      requestId: "req_audit",
      action: "payment.webhook_processed",
      entity: "payment",
      entityId: "payment_1",
      occurredAt: "2026-05-12T03:00:00.000Z",
      version: 1,
    });
    expect(event.safeDetails).toMatchObject({
      providerEventId: "evt_paymongo_1",
      providerPayload: AUDIT_REDACTED_VALUE,
      customerEmail: AUDIT_REDACTED_VALUE,
    });
    expect(JSON.stringify(event)).not.toContain("sk_test_raw");
    expect(JSON.stringify(event)).not.toContain("customer@example.test");

    await expect(new NoopAuditEventPublisher().publish(event)).resolves.toBeUndefined();
  });
});
