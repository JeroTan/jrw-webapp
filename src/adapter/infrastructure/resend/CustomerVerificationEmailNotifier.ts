import { Resend } from "resend";
import type {
  CustomerVerificationEmailInput,
  CustomerVerificationEmailNotifier,
} from "@/domain/notifications/customer-verification-email";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

export type ResendEmailPayload = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type ResendEmailClient = {
  emails: {
    send(payload: ResendEmailPayload): Promise<unknown>;
  };
};

export type ResendVerificationEmailConfig = {
  apiKey: string;
  fromEmail: string;
  appBaseUrl: string;
};

export type ResendCustomerVerificationEmailNotifierOptions = {
  client: ResendEmailClient;
  fromEmail: string;
  appBaseUrl: string;
};

function configError(): GeneralError<Record<string, never>> {
  return new GeneralError({}, "PROVIDER_UNAVAILABLE");
}

function cleanString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function verificationUrl(baseUrl: string, token: string): string {
  const url = new URL("/verify-email", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export function resolveResendVerificationEmailConfig(
  runtimeEnv: Partial<Env> & Record<string, unknown>
): AppResult<ResendVerificationEmailConfig> {
  const apiKey = cleanString(runtimeEnv.RESEND_API_KEY);
  const fromEmail = cleanString(runtimeEnv.RESEND_FROM_EMAIL);
  const appBaseUrl = normalizeBaseUrl(
    cleanString(runtimeEnv.APP_BASE_URL) ??
      cleanString(runtimeEnv.PUBLIC_APP_BASE_URL)
  );

  if (!apiKey || !fromEmail || !appBaseUrl) {
    return Result.error(configError());
  }

  return Result.okay({
    apiKey,
    fromEmail,
    appBaseUrl,
  });
}

export class FailingCustomerVerificationEmailNotifier
  implements CustomerVerificationEmailNotifier
{
  async sendVerificationEmail(_input: CustomerVerificationEmailInput) {
    return {
      ok: false as const,
      error: configError(),
    };
  }
}

export class ResendCustomerVerificationEmailNotifier
  implements CustomerVerificationEmailNotifier
{
  private readonly client: ResendEmailClient;
  private readonly fromEmail: string;
  private readonly appBaseUrl: string;

  constructor(options: ResendCustomerVerificationEmailNotifierOptions) {
    this.client = options.client;
    this.fromEmail = options.fromEmail;
    this.appBaseUrl = normalizeBaseUrl(options.appBaseUrl) ?? options.appBaseUrl;
  }

  async sendVerificationEmail(
    input: CustomerVerificationEmailInput
  ): Promise<{ ok: true } | { ok: false; error?: unknown }> {
    const url = verificationUrl(this.appBaseUrl, input.token);
    const safeUrl = escapeHtml(url);
    const safeExpiry = escapeHtml(input.expiresAt);

    try {
      await this.client.emails.send({
        from: this.fromEmail,
        to: input.toEmail,
        subject: "Verify your JRW account",
        text: [
          "Verify your JRW account:",
          url,
          `This link expires at ${input.expiresAt}.`,
        ].join("\n"),
        html: [
          "<p>Verify your JRW account:</p>",
          `<p><a href="${safeUrl}">${safeUrl}</a></p>`,
          `<p>This link expires at ${safeExpiry}.</p>`,
        ].join(""),
      });

      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }
}

export function createCustomerVerificationEmailNotifier(
  runtimeEnv: Partial<Env> & Record<string, unknown>
): CustomerVerificationEmailNotifier {
  const config = resolveResendVerificationEmailConfig(runtimeEnv);

  if (config.error) {
    return new FailingCustomerVerificationEmailNotifier();
  }

  return new ResendCustomerVerificationEmailNotifier({
    client: new Resend(config.content.apiKey) as ResendEmailClient,
    fromEmail: config.content.fromEmail,
    appBaseUrl: config.content.appBaseUrl,
  });
}
