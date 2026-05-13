import { describe, expect, it } from "vitest";
import { GeneralError } from "@/utils/general/error";
import {
  REDACTED_LOG_VALUE,
  createOperationalLogEvent,
  scrubLogDetails,
} from "./operational-log";

describe("operational logging foundation", () => {
  it("builds structured operational log events and scrubs sensitive details", () => {
    const event = createOperationalLogEvent({
      requestId: "req_log",
      actorRole: "ADMIN",
      safeActorId: "admin_1",
      targetResourceId: "payment_1",
      errorCode: "PROVIDER_UNAVAILABLE",
      timestamp: "2026-05-12T03:00:00.000Z",
      details: {
        password: "raw-password",
        rawToken: "raw-token",
        tokenHash: "hashed-token",
        authorization: "Bearer token",
        email: "customer@example.test",
        phone: "0917 123 4567",
        streetAddress: "123 Sample St",
        sessionCookie: "jrw_session=raw-session-token",
        safeStatus: "PAYMENT_PENDING",
        providerPayload: { unsafe: "raw-provider" },
        rawProviderPayload: { unsafe: "raw-provider" },
        providerResponse: { unsafe: "raw-provider" },
        webhookSignature: "sha256=raw-signature",
        nested: {
          paymongoSecret: "sk_test",
          rawPaymentPayload: { card: "raw-card-data" },
          neutralJwtValue: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
          stack: "Error stack",
        },
        list: [{ jwt: "jwt-value" }],
      },
    });

    expect(event).toMatchObject({
      requestId: "req_log",
      actorRole: "ADMIN",
      safeActorId: "admin_1",
      targetResourceId: "payment_1",
      errorCode: "PROVIDER_UNAVAILABLE",
      timestamp: "2026-05-12T03:00:00.000Z",
    });
    expect(event.details).toMatchObject({
      password: REDACTED_LOG_VALUE,
      rawToken: REDACTED_LOG_VALUE,
      tokenHash: REDACTED_LOG_VALUE,
      authorization: REDACTED_LOG_VALUE,
      email: REDACTED_LOG_VALUE,
      phone: REDACTED_LOG_VALUE,
      streetAddress: REDACTED_LOG_VALUE,
      sessionCookie: REDACTED_LOG_VALUE,
      safeStatus: "PAYMENT_PENDING",
      providerPayload: REDACTED_LOG_VALUE,
      rawProviderPayload: REDACTED_LOG_VALUE,
      providerResponse: REDACTED_LOG_VALUE,
      webhookSignature: REDACTED_LOG_VALUE,
      nested: {
        paymongoSecret: REDACTED_LOG_VALUE,
        rawPaymentPayload: REDACTED_LOG_VALUE,
        neutralJwtValue: REDACTED_LOG_VALUE,
        stack: REDACTED_LOG_VALUE,
      },
      list: [{ jwt: REDACTED_LOG_VALUE }],
    });
  });

  it("scrubs Error instances without leaking message or stack", () => {
    const details = scrubLogDetails({
      error: new Error("database password leaked in message"),
    });
    expect(details).toBeDefined();

    expect(JSON.stringify(details)).not.toContain("database password");
    expect(JSON.stringify(details)).not.toContain("at ");
    expect(details?.error).toMatchObject({
      name: "Error",
      message: REDACTED_LOG_VALUE,
      stack: REDACTED_LOG_VALUE,
    });
  });

  it("scrubs non-Error GeneralError instances and circular details", () => {
    const circular: Record<string, unknown> = { safe: "ok", count: 1n };
    circular.self = circular;

    const details = scrubLogDetails({
      error: new GeneralError(
        { password: "raw-password" },
        "PROVIDER_UNAVAILABLE"
      ),
      circular,
    });

    expect(details?.error).toMatchObject({
      name: "GeneralError",
      code: "PROVIDER_UNAVAILABLE",
      message: REDACTED_LOG_VALUE,
      data: REDACTED_LOG_VALUE,
    });
    expect(details?.circular).toMatchObject({
      safe: "ok",
      count: "1",
      self: REDACTED_LOG_VALUE,
    });
    expect(JSON.stringify(details)).not.toContain("raw-password");
  });
});
