import { describe, expect, it } from "vitest";
import {
  createPayMongoWebhookSignatureHeader,
  hashPayMongoWebhookPayload,
  verifyPayMongoWebhookSignature,
} from "./PayMongoWebhookVerifier";

const webhookSecret = "jrw-test-webhook-secret";
const timestamp = 1_787_000_000;
const nowMs = timestamp * 1000;
const rawBody = '{"data":{"type":"checkout_session.payment.paid"}}';

describe("PayMongoWebhookVerifier", () => {
  it.each(["test", "live"] as const)(
    "verifies %s mode signature against exact raw body",
    async (mode) => {
      const signatureHeader = await createPayMongoWebhookSignatureHeader({
        mode,
        rawBody,
        timestamp,
        webhookSecret,
      });

      await expect(
        verifyPayMongoWebhookSignature({
          nowMs,
          rawBody,
          signatureHeader,
          webhookSecret,
        })
      ).resolves.toEqual({
        mode,
        ok: true,
        payloadHash: await hashPayMongoWebhookPayload(rawBody),
        timestamp,
      });
    }
  );

  it("rejects a reserialized body", async () => {
    const signatureHeader = await createPayMongoWebhookSignatureHeader({
      mode: "test",
      rawBody,
      timestamp,
      webhookSecret,
    });

    await expect(
      verifyPayMongoWebhookSignature({
        nowMs,
        rawBody: JSON.stringify(JSON.parse(rawBody), null, 2),
        signatureHeader,
        webhookSecret,
      })
    ).resolves.toEqual({
      code: "WEBHOOK_INVALID_SIGNATURE",
      ok: false,
      reason: "invalid_signature",
    });
  });

  it("rejects missing, malformed, stale, and invalid signatures safely", async () => {
    const validHeader = await createPayMongoWebhookSignatureHeader({
      mode: "test",
      rawBody,
      timestamp,
      webhookSecret,
    });

    await expect(
      verifyPayMongoWebhookSignature({
        nowMs,
        rawBody,
        signatureHeader: validHeader,
        webhookSecret: "",
      })
    ).resolves.toEqual({
      code: "PROVIDER_UNAVAILABLE",
      ok: false,
      reason: "missing_key",
    });
    await expect(
      verifyPayMongoWebhookSignature({ nowMs, rawBody, webhookSecret })
    ).resolves.toEqual({
      code: "WEBHOOK_INVALID_SIGNATURE",
      ok: false,
      reason: "missing_signature",
    });
    await expect(
      verifyPayMongoWebhookSignature({
        nowMs,
        rawBody,
        signatureHeader: "t=1496734173,te=bad,li=",
        webhookSecret,
      })
    ).resolves.toEqual({
      code: "WEBHOOK_INVALID_SIGNATURE",
      ok: false,
      reason: "malformed_signature",
    });
    await expect(
      verifyPayMongoWebhookSignature({
        nowMs: nowMs + 301_000,
        rawBody,
        signatureHeader: validHeader,
        webhookSecret,
      })
    ).resolves.toEqual({
      code: "WEBHOOK_INVALID_SIGNATURE",
      ok: false,
      reason: "stale_signature",
    });
  });
});
