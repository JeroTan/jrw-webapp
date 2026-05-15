import { describe, expect, it } from "vitest";
import {
  FailingAccountEmailNotifier,
  FailingCustomerVerificationEmailNotifier,
  ResendCustomerVerificationEmailNotifier,
  resolveResendVerificationEmailConfig,
  type ResendEmailClient,
} from "./CustomerVerificationEmailNotifier";

describe("Resend customer verification email notifier", () => {
  it("requires safe provider config and resolves app URL fallback order", () => {
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

    expect(
      resolveResendVerificationEmailConfig(
        {
          RESEND_API_KEY: "re_test",
          RESEND_FROM_EMAIL: "JRW <noreply@example.test>",
        },
        { requestUrl: "https://request-origin.test/api/customers" }
      ).content?.appBaseUrl
    ).toBe("https://request-origin.test");

    expect(
      resolveResendVerificationEmailConfig({
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: "JRW <noreply@example.test>",
      }).content?.appBaseUrl
    ).toBe("http://localhost:4321");

    expect(
      resolveResendVerificationEmailConfig({
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: "JRW <noreply@example.test>",
        APP_BASE_URL: "not a url",
      }).error?.code
    ).toBe("PROVIDER_UNAVAILABLE");
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

  it("sends password reset email with escaped reset link and no request id", async () => {
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

    const result = await notifier.sendPasswordResetEmail({
      toEmail: "buyer@example.test",
      token: "raw-reset-token&unsafe=<x>",
      expiresAt: "2026-05-15T00:30:00.000Z",
      requestId: "req_reset",
    });

    expect(result).toEqual({ ok: true });
    expect(sent[0]).toMatchObject({
      from: "JRW <noreply@example.test>",
      to: "buyer@example.test",
      subject: "Reset your JRW password",
    });
    expect(JSON.stringify(sent[0])).toContain(
      "https://jrw.test/reset-password?token=raw-reset-token%26unsafe%3D%3Cx%3E"
    );
    expect(JSON.stringify(sent[0])).not.toContain("<x>");
    expect(JSON.stringify(sent[0])).not.toContain("&unsafe=");
    expect(JSON.stringify(sent[0])).not.toContain("req_reset");
  });

  it("sends safe admin lifecycle payloads without auth internals", async () => {
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

    await expect(
      notifier.sendAdminInvitationEmail({
        toEmail: "admin@example.test",
        displayName: "Ops Admin",
        actionUrl: "https://jrw.test/admin",
        statusLabel: "invited",
        requestId: "req_invite",
      })
    ).resolves.toEqual({ ok: true });
    await expect(
      notifier.sendAdminApprovalEmail({
        toEmail: "admin@example.test",
        statusLabel: "approved",
        requestId: "req_approval",
      })
    ).resolves.toEqual({ ok: true });
    await expect(
      notifier.sendAdminRejectionEmail({
        toEmail: "admin@example.test",
        statusLabel: "rejected",
        requestId: "req_rejection",
      })
    ).resolves.toEqual({ ok: true });

    expect(sent).toHaveLength(3);
    expect(JSON.stringify(sent)).toContain("JRW admin invitation");
    expect(JSON.stringify(sent)).toContain("approved");
    expect(JSON.stringify(sent)).toContain("rejected");
    expect(JSON.stringify(sent)).not.toContain("req_invite");
    expect(JSON.stringify(sent)).not.toContain("password");
    expect(JSON.stringify(sent)).not.toContain("token");
    expect(JSON.stringify(sent)).not.toContain("auth state");
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
    const missingConfigNotifier =
      new FailingCustomerVerificationEmailNotifier();
    const missingAccountNotifier = new FailingAccountEmailNotifier();

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
    await expect(
      missingAccountNotifier.sendPasswordResetEmail({
        toEmail: "buyer@example.test",
        token: "raw-token",
        expiresAt: "2026-05-14T00:00:00.000Z",
        requestId: "req_email",
      })
    ).resolves.toMatchObject({ ok: false });
  });
});
