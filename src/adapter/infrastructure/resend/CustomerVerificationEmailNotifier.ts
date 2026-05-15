import type {
  AccountEmailNotifier,
  AdminLifecycleEmailInput,
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
};

export type ResendVerificationEmailConfigOptions = {
  requestUrl?: string;
};

export type ResendCustomerVerificationEmailNotifierOptions = {
  client: ResendEmailClient;
  fromEmail: string;
  appBaseUrl: string;
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
}

export class ResendCustomerVerificationEmailNotifier implements AccountEmailNotifier {
  private readonly client: ResendEmailClient;
  private readonly fromEmail: string;
  private readonly appBaseUrl: string;

  constructor(options: ResendCustomerVerificationEmailNotifierOptions) {
    this.client = options.client;
    this.fromEmail = options.fromEmail;
    this.appBaseUrl =
      normalizeBaseUrl(options.appBaseUrl) ?? options.appBaseUrl;
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
      await this.client.emails.send({
        from: this.fromEmail,
        to: input.toEmail,
        subject: "Verify your JRW account",
        text: template.text,
        html: template.html,
      });

      return { ok: true };
    } catch (error) {
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
      await this.client.emails.send({
        from: this.fromEmail,
        to: input.toEmail,
        subject: "Reset your JRW password",
        text: template.text,
        html: template.html,
      });

      return { ok: true };
    } catch (error) {
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
      await this.client.emails.send({
        from: this.fromEmail,
        to: input.input.toEmail,
        subject: input.subject,
        text: template.text,
        html: template.html,
      });

      return { ok: true };
    } catch (error) {
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
  });
}
