import { describe, expect, it } from "vitest";
import {
  FailingCustomerVerificationEmailNotifier,
  ResendCustomerVerificationEmailNotifier,
  resolveResendVerificationEmailConfig,
  type ResendEmailClient,
} from "./CustomerVerificationEmailNotifier";

describe("Resend customer verification email notifier", () => {
  it("requires safe provider and app URL config", () => {
    expect(resolveResendVerificationEmailConfig({}).error?.code).toBe(
      "PROVIDER_UNAVAILABLE"
    );
    expect(
      resolveResendVerificationEmailConfig({
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: "JRW <noreply@example.test>",
        APP_BASE_URL: "https://jrw.test",
      }).content
    ).toEqual({
      apiKey: "re_test",
      fromEmail: "JRW <noreply@example.test>",
      appBaseUrl: "https://jrw.test",
    });
  });

  it("sends verification email with raw token only in email body/link", async () => {
    const sent: unknown[] = [];
    const client: ResendEmailClient = {
      emails: {
        send: async (payload) => {
          sent.push(payload);
          return { id: "email_1" };
        },
      },
    };
    const notifier = new ResendCustomerVerificationEmailNotifier({
      client,
      fromEmail: "JRW <noreply@example.test>",
      appBaseUrl: "https://jrw.test",
    });

    const result = await notifier.sendVerificationEmail({
      toEmail: "buyer@example.test",
      token: "raw-token",
      expiresAt: "2026-05-14T00:00:00.000Z",
      requestId: "req_email",
    });

    expect(result).toEqual({ ok: true });
    expect(sent[0]).toMatchObject({
      from: "JRW <noreply@example.test>",
      to: "buyer@example.test",
      subject: "Verify your JRW account",
    });
    expect(JSON.stringify(sent[0])).toContain(
      "https://jrw.test/verify-email?token=raw-token"
    );
    expect(JSON.stringify(sent[0])).not.toContain("req_email");
  });

  it("maps provider and missing-config failures to safe notifier failure", async () => {
    const failingClient: ResendEmailClient = {
      emails: {
        send: async () => {
          throw new Error("raw provider payload with raw-token");
        },
      },
    };
    const providerNotifier = new ResendCustomerVerificationEmailNotifier({
      client: failingClient,
      fromEmail: "JRW <noreply@example.test>",
      appBaseUrl: "https://jrw.test",
    });
    const missingConfigNotifier = new FailingCustomerVerificationEmailNotifier();

    await expect(
      providerNotifier.sendVerificationEmail({
        toEmail: "buyer@example.test",
        token: "raw-token",
        expiresAt: "2026-05-14T00:00:00.000Z",
        requestId: "req_email",
      })
    ).resolves.toMatchObject({ ok: false });
    await expect(
      missingConfigNotifier.sendVerificationEmail({
        toEmail: "buyer@example.test",
        token: "raw-token",
        expiresAt: "2026-05-14T00:00:00.000Z",
        requestId: "req_email",
      })
    ).resolves.toMatchObject({ ok: false });
  });
});
