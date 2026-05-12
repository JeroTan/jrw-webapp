import { describe, expect, it } from "vitest";
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
        authorization: "Bearer token",
        safeStatus: "PAYMENT_PENDING",
        nested: {
          paymongoSecret: "sk_test",
          rawPaymentPayload: { card: "raw-card-data" },
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
      authorization: REDACTED_LOG_VALUE,
      safeStatus: "PAYMENT_PENDING",
      nested: {
        paymongoSecret: REDACTED_LOG_VALUE,
        rawPaymentPayload: REDACTED_LOG_VALUE,
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
});
