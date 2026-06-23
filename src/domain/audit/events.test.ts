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

  it("scrubs payment checkout handoff audit details", () => {
    const event = createAuditEvent({
      eventId: "evt_payment_handoff",
      requestId: "req_payment_handoff",
      action: "payment.checkout_created",
      actor: {
        type: "user",
        role: "PROSPECT",
        safeIdentifier: "guest",
      },
      target: {
        entity: "payment",
        entityId: "payment_1",
      },
      safeDetails: {
        checkoutUrl: "https://checkout.paymongo.com/cs_test_123",
        providerCheckoutSessionId: "cs_test_123",
        providerResponse: { checkout_url: "https://checkout.paymongo.com/raw" },
        paymentPayload: { amount: 3998 },
        cardNumber: "4242424242424242",
        checkoutEmail: "nina@example.test",
        phone: "+63 917 555 1212",
        streetAddress: "12 Sampaguita Street",
        amountCentavos: 3998,
        currency: "PHP",
      },
      occurredAt: "2026-06-12T08:01:00.000Z",
    });

    expect(event.safeDetails).toMatchObject({
      checkoutUrl: AUDIT_REDACTED_VALUE,
      providerCheckoutSessionId: "cs_test_123",
      providerResponse: AUDIT_REDACTED_VALUE,
      paymentPayload: AUDIT_REDACTED_VALUE,
      cardNumber: AUDIT_REDACTED_VALUE,
      checkoutEmail: AUDIT_REDACTED_VALUE,
      phone: AUDIT_REDACTED_VALUE,
      streetAddress: AUDIT_REDACTED_VALUE,
      amountCentavos: 3998,
      currency: "PHP",
    });
    expect(JSON.stringify(event)).not.toMatch(
      /checkout\.paymongo|424242|nina@example|Sampaguita/i
    );
  });

  it("scrubs webhook secrets, signatures, raw payloads, and contact details", () => {
    const event = createAuditEvent({
      eventId: "evt_webhook_scrub",
      requestId: "req_webhook_scrub",
      action: "payment.webhook_rejected",
      actor: {
        type: "system",
        role: "SYSTEM",
        safeIdentifier: "paymongo-webhook",
      },
      target: {
        entity: "payment",
        entityId: "evt_safe",
      },
      safeDetails: {
        eventType: "checkout_session.payment.paid",
        providerCheckoutSessionId: "cs_test_safe",
        providerEventId: "evt_safe",
        webhookSecret: "whsec_raw",
        paymongoSignature: "t=1496734173,te=raw,li=",
        rawBody: "{\"billing\":{\"email\":\"buyer@example.test\"}}",
        rawPayload: { card: "4242424242424242" },
        providerPayload: { checkout_url: "https://checkout.paymongo.com/raw" },
        checkoutEmail: "buyer@example.test",
        phone: "+63 917 111 2222",
        streetAddress: "123 Sample St",
      },
      occurredAt: "2026-06-23T08:00:00.000Z",
    });

    expect(event.safeDetails).toMatchObject({
      eventType: "checkout_session.payment.paid",
      providerCheckoutSessionId: "cs_test_safe",
      providerEventId: "evt_safe",
      webhookSecret: AUDIT_REDACTED_VALUE,
      paymongoSignature: AUDIT_REDACTED_VALUE,
      rawBody: AUDIT_REDACTED_VALUE,
      rawPayload: AUDIT_REDACTED_VALUE,
      providerPayload: AUDIT_REDACTED_VALUE,
      checkoutEmail: AUDIT_REDACTED_VALUE,
      phone: AUDIT_REDACTED_VALUE,
      streetAddress: AUDIT_REDACTED_VALUE,
    });
    expect(JSON.stringify(event)).not.toMatch(
      /whsec_raw|raw-signature|buyer@example|424242|checkout\.paymongo|Sample St/i
    );
  });
});
