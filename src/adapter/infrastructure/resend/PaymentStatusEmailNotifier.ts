import {
  FailingPaymentStatusEmailNotifier,
  paymentStatusEmailSubject,
  type PaymentStatusEmailInput,
  type PaymentStatusEmailNotifier,
  type PaymentStatusEmailResult,
} from "@/domain/notifications/payment-status-email";
import { formatCatalogPrice } from "@/domain/products/price-format";
import {
  emailActionLink,
  emailBody,
  emailFrame,
  emailMeta,
  emailTitle,
} from "./email-template";
import {
  resolveResendVerificationEmailConfig,
  type ResendEmailClient,
  type ResendEmailPayload,
  type ResendVerificationEmailConfigOptions,
} from "./CustomerVerificationEmailNotifier";

type ResendPaymentStatusEmailNotifierOptions = {
  appBaseUrl: string;
  client: ResendEmailClient;
  fromEmail: string;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resendMessageId(response: unknown): string | undefined {
  if (!isRecord(response)) return undefined;
  if (typeof response.id === "string") return response.id;

  const data = response.data;
  if (isRecord(data) && typeof data.id === "string") return data.id;

  return undefined;
}

function resendProviderError(response: unknown): unknown | undefined {
  return isRecord(response) && response.error ? response.error : undefined;
}

function absoluteActionUrl(appBaseUrl: string, nextActionUrl: string): string {
  try {
    return new URL(nextActionUrl, appBaseUrl).toString();
  } catch {
    return appBaseUrl;
  }
}

function paymentStatusTemplate(input: PaymentStatusEmailInput) {
  return emailFrame({
    title: "JRW payment update",
    blocks: [
      emailTitle({ content: "JRW payment update" }),
      emailBody({
        content:
          "Payment did not complete. Your order is not confirmed. You can retry checkout when ready.",
      }),
      emailMeta({ label: "Payment", value: input.paymentStatusLabel }),
      emailMeta({ label: "Reference", value: input.referenceLabel }),
      emailMeta({ label: "Total", value: formatCatalogPrice(input.totalCentavos) }),
      emailActionLink({ label: "Return to checkout", url: input.nextActionUrl }),
    ],
  });
}

export class ResendPaymentStatusEmailNotifier implements PaymentStatusEmailNotifier {
  private readonly appBaseUrl: string;
  private readonly client: ResendEmailClient;
  private readonly fromEmail: string;

  constructor(options: ResendPaymentStatusEmailNotifierOptions) {
    this.appBaseUrl = options.appBaseUrl;
    this.client = options.client;
    this.fromEmail = options.fromEmail;
  }

  async sendPaymentStatusEmail(
    input: PaymentStatusEmailInput
  ): Promise<PaymentStatusEmailResult> {
    const template = paymentStatusTemplate({
      ...input,
      nextActionUrl: absoluteActionUrl(this.appBaseUrl, input.nextActionUrl),
    });

    try {
      const response = await this.client.emails.send({
        from: this.fromEmail,
        to: input.toEmail,
        subject: paymentStatusEmailSubject(input),
        html: template.html,
        text: template.text,
      });
      const providerError = resendProviderError(response);

      if (providerError) {
        return { ok: false, error: providerError };
      }

      return { ok: true, messageId: resendMessageId(response) };
    } catch (error) {
      return { ok: false, error };
    }
  }
}

export function createPaymentStatusEmailNotifier(
  runtimeEnv: Partial<Env> & Record<string, unknown>,
  options: ResendVerificationEmailConfigOptions = {}
): PaymentStatusEmailNotifier {
  const config = resolveResendVerificationEmailConfig(runtimeEnv, options);

  if (config.error) {
    return new FailingPaymentStatusEmailNotifier();
  }

  return new ResendPaymentStatusEmailNotifier({
    appBaseUrl: config.content.appBaseUrl,
    client: new LazyResendEmailClient(config.content.apiKey),
    fromEmail: config.content.fromEmail,
  });
}
