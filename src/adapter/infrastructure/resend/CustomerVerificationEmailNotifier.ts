import type {
  AccountEmailNotifier,
  AdminLifecycleEmailInput,
  BrandInvitationEmailInput,
  CustomerVerificationEmailInput,
  CustomerVerificationEmailNotifier,
  PasswordResetEmailInput,
} from "@/domain/notifications/account-emails";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";
import {
  emailActionLink,
  emailBody,
  emailFrame,
  emailMeta,
  emailTitle,
} from "./email-template";

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
  debugEmailSend: boolean;
};

export type ResendVerificationEmailConfigOptions = {
  requestUrl?: string;
};

export type ResendCustomerVerificationEmailNotifierOptions = {
  client: ResendEmailClient;
  fromEmail: string;
  appBaseUrl: string;
  debugEmailSend?: boolean;
};

const LOCAL_DEV_APP_BASE_URL = "http://localhost:4321";

class LazyResendEmailClient implements ResendEmailClient {
  readonly emails = {
    send: async (payload: ResendEmailPayload): Promise<unknown> => {
      const { Resend } = await import("resend");
      const client = new Resend(this.apiKey);
      return client.emails.send(payload);
    },
  };

  constructor(private readonly apiKey: string) {}
}

function configError(): GeneralError<Record<string, never>> {
  return new GeneralError({}, "PROVIDER_UNAVAILABLE");
}

function cleanString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function cleanBoolean(value: unknown): boolean {
  return typeof value === "string" && /^(1|true|yes|on)$/i.test(value.trim());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emailDomain(value: string): string | null {
  const email = value.match(/<([^>]+)>/)?.[1] ?? value;
  const domain = email.match(/@([^@\s>]+)$/)?.[1];
  return domain ? domain.toLowerCase() : null;
}

function scrubProviderMessage(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const scrubbed = value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/token=[^&\s"')]+/gi, "token=[REDACTED]")
    .replace(/\b(re|sk|pk)_(test|live)?[A-Za-z0-9_=-]+\b/gi, "[REDACTED_KEY]")
    .slice(0, 280);

  return /\b(password|secret|jwt|cookie|raw provider payload|raw-token)\b/i.test(
    scrubbed
  )
    ? "[REDACTED]"
    : scrubbed;
}

function providerErrorSummary(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: scrubProviderMessage(error.message),
    };
  }

  if (isRecord(error)) {
    return {
      name: typeof error.name === "string" ? error.name : undefined,
      statusCode:
        typeof error.statusCode === "number" ? error.statusCode : undefined,
      message: scrubProviderMessage(error.message),
    };
  }

  return {
    name: typeof error,
  };
}

function resendMessageId(response: unknown): string | undefined {
  if (!isRecord(response)) return undefined;

  if (typeof response.id === "string") return response.id;

  const data = response.data;
  if (isRecord(data) && typeof data.id === "string") {
    return data.id;
  }

  return undefined;
}

function resendProviderError(response: unknown): unknown | undefined {
  return isRecord(response) && response.error ? response.error : undefined;
}

function logEmailSendResult(input: {
  debugEmailSend: boolean;
  requestId: string;
  operation: string;
  from: string;
  to: string;
  response?: unknown;
  error?: unknown;
}): void {
  const providerError = input.error ?? resendProviderError(input.response);

  if (!providerError && !input.debugEmailSend) {
    return;
  }

  const details = {
    event: "resend.email_send",
    requestId: input.requestId,
    operation: input.operation,
    ok: !providerError,
    messageId: providerError ? undefined : resendMessageId(input.response),
    fromDomain: emailDomain(input.from),
    recipientDomain: emailDomain(input.to),
    providerError: providerError
      ? providerErrorSummary(providerError)
      : undefined,
  };

  console.error(JSON.stringify(details));
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function verificationUrl(baseUrl: string, token: string): string {
  const url = new URL("/verify-email", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function passwordResetUrl(baseUrl: string, token: string): string {
  const url = new URL("/reset-password", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function optionalActionUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

export function resolveResendVerificationEmailConfig(
  runtimeEnv: Partial<Env> & Record<string, unknown>,
  options: ResendVerificationEmailConfigOptions = {}
): AppResult<ResendVerificationEmailConfig> {
  const apiKey = cleanString(runtimeEnv.RESEND_API_KEY);
  const fromEmail = cleanString(runtimeEnv.RESEND_FROM_EMAIL);
  const configuredBaseUrl =
    cleanString(runtimeEnv.APP_BASE_URL) ??
    cleanString(runtimeEnv.PUBLIC_APP_BASE_URL);
  const debugEmailSend =
    cleanBoolean(runtimeEnv.RESEND_DEBUG) ||
    cleanBoolean(runtimeEnv.EMAIL_DEBUG);
  const appBaseUrl = configuredBaseUrl
    ? normalizeBaseUrl(configuredBaseUrl)
    : (normalizeBaseUrl(options.requestUrl) ?? LOCAL_DEV_APP_BASE_URL);

  if (!apiKey || !fromEmail || !appBaseUrl) {
    return Result.error(configError());
  }

  return Result.okay({
    apiKey,
    fromEmail,
    appBaseUrl,
    debugEmailSend,
  });
}

export class FailingCustomerVerificationEmailNotifier implements CustomerVerificationEmailNotifier {
  async sendVerificationEmail(_input: CustomerVerificationEmailInput) {
    return {
      ok: false as const,
      error: configError(),
    };
  }
}

export class FailingAccountEmailNotifier implements AccountEmailNotifier {
  async sendVerificationEmail(_input: CustomerVerificationEmailInput) {
    return {
      ok: false as const,
      error: configError(),
    };
  }

  async sendPasswordResetEmail(_input: PasswordResetEmailInput) {
    return {
      ok: false as const,
      error: configError(),
    };
  }

  async sendAdminInvitationEmail(_input: AdminLifecycleEmailInput) {
    return {
      ok: false as const,
      error: configError(),
    };
  }

  async sendAdminApprovalEmail(_input: AdminLifecycleEmailInput) {
    return {
      ok: false as const,
      error: configError(),
    };
  }

  async sendAdminRejectionEmail(_input: AdminLifecycleEmailInput) {
    return {
      ok: false as const,
      error: configError(),
    };
  }

  async sendBrandInvitationEmail(_input: BrandInvitationEmailInput) {
    return {
      ok: false as const,
      error: configError(),
    };
  }
}

export class ResendCustomerVerificationEmailNotifier implements AccountEmailNotifier {
  private readonly client: ResendEmailClient;
  private readonly fromEmail: string;
  private readonly appBaseUrl: string;
  private readonly debugEmailSend: boolean;

  constructor(options: ResendCustomerVerificationEmailNotifierOptions) {
    this.client = options.client;
    this.fromEmail = options.fromEmail;
    this.appBaseUrl =
      normalizeBaseUrl(options.appBaseUrl) ?? options.appBaseUrl;
    this.debugEmailSend = options.debugEmailSend ?? false;
  }

  async sendVerificationEmail(
    input: CustomerVerificationEmailInput
  ): Promise<{ ok: true } | { ok: false; error?: unknown }> {
    const url = verificationUrl(this.appBaseUrl, input.token);
    const template = emailFrame({
      title: "Verify your JRW account",
      blocks: [
        emailTitle({ content: "Verify your JRW account" }),
        emailBody({
          content:
            "Confirm this email address to finish setting up your JRW account.",
        }),
        emailActionLink({ label: "Verify email", url }),
        emailMeta({ label: "Expires at", value: input.expiresAt }),
      ],
    });

    try {
      const response = await this.client.emails.send({
        from: this.fromEmail,
        to: input.toEmail,
        subject: "Verify your JRW account",
        text: template.text,
        html: template.html,
      });

      logEmailSendResult({
        debugEmailSend: this.debugEmailSend,
        requestId: input.requestId,
        operation: "customer-verification",
        from: this.fromEmail,
        to: input.toEmail,
        response,
      });

      const providerError = resendProviderError(response);
      if (providerError) {
        return { ok: false, error: providerError };
      }

      return { ok: true };
    } catch (error) {
      logEmailSendResult({
        debugEmailSend: this.debugEmailSend,
        requestId: input.requestId,
        operation: "customer-verification",
        from: this.fromEmail,
        to: input.toEmail,
        error,
      });

      return { ok: false, error };
    }
  }

  async sendPasswordResetEmail(
    input: PasswordResetEmailInput
  ): Promise<{ ok: true } | { ok: false; error?: unknown }> {
    const url = passwordResetUrl(this.appBaseUrl, input.token);
    const template = emailFrame({
      title: "Reset your JRW password",
      blocks: [
        emailTitle({ content: "Reset your JRW password" }),
        emailBody({
          content:
            "Use this link to set a new password. If you did not request this, ignore this email.",
        }),
        emailActionLink({ label: "Reset password", url }),
        emailMeta({ label: "Expires at", value: input.expiresAt }),
      ],
    });

    try {
      const response = await this.client.emails.send({
        from: this.fromEmail,
        to: input.toEmail,
        subject: "Reset your JRW password",
        text: template.text,
        html: template.html,
      });

      logEmailSendResult({
        debugEmailSend: this.debugEmailSend,
        requestId: input.requestId,
        operation: "password-reset",
        from: this.fromEmail,
        to: input.toEmail,
        response,
      });

      const providerError = resendProviderError(response);
      if (providerError) {
        return { ok: false, error: providerError };
      }

      return { ok: true };
    } catch (error) {
      logEmailSendResult({
        debugEmailSend: this.debugEmailSend,
        requestId: input.requestId,
        operation: "password-reset",
        from: this.fromEmail,
        to: input.toEmail,
        error,
      });

      return { ok: false, error };
    }
  }

  async sendAdminInvitationEmail(
    input: AdminLifecycleEmailInput
  ): Promise<{ ok: true } | { ok: false; error?: unknown }> {
    return this.sendAdminLifecycleEmail({
      input,
      subject: "JRW admin invitation",
      intro: "You have been invited to JRW Admin.",
    });
  }

  async sendAdminApprovalEmail(
    input: AdminLifecycleEmailInput
  ): Promise<{ ok: true } | { ok: false; error?: unknown }> {
    return this.sendAdminLifecycleEmail({
      input,
      subject: "JRW admin account approved",
      intro: "Your JRW Admin account has been approved.",
    });
  }

  async sendAdminRejectionEmail(
    input: AdminLifecycleEmailInput
  ): Promise<{ ok: true } | { ok: false; error?: unknown }> {
    return this.sendAdminLifecycleEmail({
      input,
      subject: "JRW admin account update",
      intro: "Your JRW Admin account request was not approved.",
    });
  }

  async sendBrandInvitationEmail(
    input: BrandInvitationEmailInput
  ): Promise<{ ok: true } | { ok: false; error?: unknown }> {
    const actionUrl = optionalActionUrl(input.actionUrl);
    const safeBrandName = input.brandName.trim();
    const inviterLabel = input.invitedByDisplayName.trim();
    const template = emailFrame({
      title: "JRW brand invitation",
      blocks: [
        emailTitle({ content: "JRW brand invitation" }),
        emailBody({
          content: `${inviterLabel} invited you to join brand ${safeBrandName} for JRW catalog collaboration.`,
        }),
        ...(actionUrl
          ? [emailActionLink({ label: "Open JRW Admin", url: actionUrl })]
          : []),
      ],
    });

    try {
      const response = await this.client.emails.send({
        from: this.fromEmail,
        to: input.toEmail,
        subject: "JRW brand invitation",
        text: template.text,
        html: template.html,
      });

      logEmailSendResult({
        debugEmailSend: this.debugEmailSend,
        requestId: input.requestId,
        operation: "brand-invitation",
        from: this.fromEmail,
        to: input.toEmail,
        response,
      });

      const providerError = resendProviderError(response);
      if (providerError) {
        return { ok: false, error: providerError };
      }

      return { ok: true };
    } catch (error) {
      logEmailSendResult({
        debugEmailSend: this.debugEmailSend,
        requestId: input.requestId,
        operation: "brand-invitation",
        from: this.fromEmail,
        to: input.toEmail,
        error,
      });

      return { ok: false, error };
    }
  }

  private async sendAdminLifecycleEmail(input: {
    input: AdminLifecycleEmailInput;
    subject: string;
    intro: string;
  }): Promise<{ ok: true } | { ok: false; error?: unknown }> {
    const actionUrl = optionalActionUrl(input.input.actionUrl);
    const displayName = input.input.displayName
      ? ` ${input.input.displayName.trim()}`
      : "";
    const template = emailFrame({
      title: input.subject,
      blocks: [
        emailTitle({ content: input.subject }),
        emailBody({
          content: `${input.intro}${displayName ? ` (${displayName.trim()})` : ""}`,
        }),
        ...(input.input.statusLabel
          ? [
              emailMeta({
                label: "Status",
                value: input.input.statusLabel,
              }),
            ]
          : []),
        ...(actionUrl
          ? [emailActionLink({ label: "Open JRW Admin", url: actionUrl })]
          : []),
      ],
    });

    try {
      const response = await this.client.emails.send({
        from: this.fromEmail,
        to: input.input.toEmail,
        subject: input.subject,
        text: template.text,
        html: template.html,
      });

      logEmailSendResult({
        debugEmailSend: this.debugEmailSend,
        requestId: input.input.requestId,
        operation: "admin-lifecycle",
        from: this.fromEmail,
        to: input.input.toEmail,
        response,
      });

      const providerError = resendProviderError(response);
      if (providerError) {
        return { ok: false, error: providerError };
      }

      return { ok: true };
    } catch (error) {
      logEmailSendResult({
        debugEmailSend: this.debugEmailSend,
        requestId: input.input.requestId,
        operation: "admin-lifecycle",
        from: this.fromEmail,
        to: input.input.toEmail,
        error,
      });

      return { ok: false, error };
    }
  }
}

export function createCustomerVerificationEmailNotifier(
  runtimeEnv: Partial<Env> & Record<string, unknown>,
  options: ResendVerificationEmailConfigOptions = {}
): CustomerVerificationEmailNotifier {
  const config = resolveResendVerificationEmailConfig(runtimeEnv, options);

  if (config.error) {
    return new FailingCustomerVerificationEmailNotifier();
  }

  return new ResendCustomerVerificationEmailNotifier({
    client: new LazyResendEmailClient(config.content.apiKey),
    fromEmail: config.content.fromEmail,
    appBaseUrl: config.content.appBaseUrl,
    debugEmailSend: config.content.debugEmailSend,
  });
}

export function createAccountEmailNotifier(
  runtimeEnv: Partial<Env> & Record<string, unknown>,
  options: ResendVerificationEmailConfigOptions = {}
): AccountEmailNotifier {
  const config = resolveResendVerificationEmailConfig(runtimeEnv, options);

  if (config.error) {
    return new FailingAccountEmailNotifier();
  }

  return new ResendCustomerVerificationEmailNotifier({
    client: new LazyResendEmailClient(config.content.apiKey),
    fromEmail: config.content.fromEmail,
    appBaseUrl: config.content.appBaseUrl,
    debugEmailSend: config.content.debugEmailSend,
  });
}
