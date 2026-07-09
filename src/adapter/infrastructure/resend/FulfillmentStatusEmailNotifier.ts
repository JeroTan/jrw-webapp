import {
  FailingFulfillmentStatusEmailNotifier,
  fulfillmentStatusEmailSubject,
  type FulfillmentStatusEmailInput,
  type FulfillmentStatusEmailNotifier,
  type FulfillmentStatusEmailResult,
} from "@/domain/notifications/fulfillment-status-email";
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

type ResendFulfillmentStatusEmailNotifierOptions = {
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

function absoluteActionUrl(appBaseUrl: string, statusUrl: string): string {
  try {
    return new URL(statusUrl, appBaseUrl).toString();
  } catch {
    return appBaseUrl;
  }
}

function fulfillmentStatusTemplate(input: FulfillmentStatusEmailInput) {
  return emailFrame({
    title: "JRW order update",
    blocks: [
      emailTitle({ content: "JRW order update" }),
      emailBody({
        content:
          "Your order status changed. Sign in to view latest delivery progress.",
      }),
      emailMeta({ label: "Order", value: input.orderNumber }),
      emailMeta({ label: "Fulfillment", value: input.fulfillmentStatusLabel }),
      emailMeta({
        label: "Total",
        value: formatCatalogPrice(input.totalCentavos),
      }),
      ...input.items.map((item) =>
        emailMeta({
          label: `Item x${item.quantity}`,
          value: `${item.name} - ${formatCatalogPrice(item.amountCentavos)}`,
        })
      ),
      emailActionLink({ label: "View order", url: input.statusUrl }),
    ],
  });
}

export class ResendFulfillmentStatusEmailNotifier implements FulfillmentStatusEmailNotifier {
  private readonly appBaseUrl: string;
  private readonly client: ResendEmailClient;
  private readonly fromEmail: string;

  constructor(options: ResendFulfillmentStatusEmailNotifierOptions) {
    this.appBaseUrl = options.appBaseUrl;
    this.client = options.client;
    this.fromEmail = options.fromEmail;
  }

  async sendFulfillmentStatusEmail(
    input: FulfillmentStatusEmailInput
  ): Promise<FulfillmentStatusEmailResult> {
    const template = fulfillmentStatusTemplate({
      ...input,
      statusUrl: absoluteActionUrl(this.appBaseUrl, input.statusUrl),
    });

    try {
      const response = await this.client.emails.send({
        from: this.fromEmail,
        to: input.toEmail,
        subject: fulfillmentStatusEmailSubject(input),
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

export function createFulfillmentStatusEmailNotifier(
  runtimeEnv: Partial<Env> & Record<string, unknown>,
  options: ResendVerificationEmailConfigOptions = {}
): FulfillmentStatusEmailNotifier {
  const config = resolveResendVerificationEmailConfig(runtimeEnv, options);

  if (config.error) {
    return new FailingFulfillmentStatusEmailNotifier();
  }

  return new ResendFulfillmentStatusEmailNotifier({
    appBaseUrl: config.content.appBaseUrl,
    client: new LazyResendEmailClient(config.content.apiKey),
    fromEmail: config.content.fromEmail,
  });
}
