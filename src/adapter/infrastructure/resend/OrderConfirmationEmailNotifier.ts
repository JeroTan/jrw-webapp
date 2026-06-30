import type {
  OrderConfirmationEmailInput,
  OrderConfirmationEmailNotifier,
  OrderConfirmationEmailResult,
} from "@/domain/notifications/order-confirmation-email";
import { formatCatalogPrice } from "@/domain/products/price-format";
import { FailingOrderConfirmationEmailNotifier } from "@/domain/notifications/order-confirmation-email";
import { emailBody, emailFrame, emailMeta, emailTitle } from "./email-template";
import {
  resolveResendVerificationEmailConfig,
  type ResendEmailClient,
  type ResendEmailPayload,
  type ResendVerificationEmailConfigOptions,
} from "./CustomerVerificationEmailNotifier";

type ResendOrderConfirmationEmailNotifierOptions = {
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

function itemSummary(input: OrderConfirmationEmailInput): string {
  return input.items
    .slice(0, 6)
    .map(
      (item) =>
        `${item.quantity} x ${item.name} @ ${formatCatalogPrice(
          item.amountCentavos
        )}`
    )
    .join("; ");
}

function absoluteStatusUrl(appBaseUrl: string, statusUrl: string): string {
  try {
    return new URL(statusUrl, appBaseUrl).toString();
  } catch {
    return appBaseUrl;
  }
}

function orderConfirmationTemplate(input: OrderConfirmationEmailInput) {
  return emailFrame({
    title: "JRW order confirmed",
    blocks: [
      emailTitle({ content: "JRW order confirmed" }),
      emailBody({
        content:
          "Payment is confirmed. We will prepare your order and send updates when fulfillment changes.",
      }),
      emailMeta({ label: "Order", value: input.orderNumber }),
      emailMeta({ label: "Payment", value: input.paymentStatusLabel }),
      emailMeta({ label: "Fulfillment", value: input.fulfillmentStatusLabel }),
      emailMeta({
        label: "Total",
        value: formatCatalogPrice(input.totalCentavos),
      }),
      ...(input.items.length > 0
        ? [emailMeta({ label: "Items", value: itemSummary(input) })]
        : []),
      emailMeta({ label: "Status", value: input.statusUrl }),
    ],
  });
}

export class ResendOrderConfirmationEmailNotifier implements OrderConfirmationEmailNotifier {
  private readonly appBaseUrl: string;
  private readonly client: ResendEmailClient;
  private readonly fromEmail: string;

  constructor(options: ResendOrderConfirmationEmailNotifierOptions) {
    this.appBaseUrl = options.appBaseUrl;
    this.client = options.client;
    this.fromEmail = options.fromEmail;
  }

  async sendOrderConfirmationEmail(
    input: OrderConfirmationEmailInput
  ): Promise<OrderConfirmationEmailResult> {
    const template = orderConfirmationTemplate({
      ...input,
      statusUrl: absoluteStatusUrl(this.appBaseUrl, input.statusUrl),
    });

    try {
      const response = await this.client.emails.send({
        from: this.fromEmail,
        to: input.toEmail,
        subject: `JRW order ${input.orderNumber} confirmed`,
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

export function createOrderConfirmationEmailNotifier(
  runtimeEnv: Partial<Env> & Record<string, unknown>,
  options: ResendVerificationEmailConfigOptions = {}
): OrderConfirmationEmailNotifier {
  const config = resolveResendVerificationEmailConfig(runtimeEnv, options);

  if (config.error) {
    return new FailingOrderConfirmationEmailNotifier();
  }

  return new ResendOrderConfirmationEmailNotifier({
    appBaseUrl: config.content.appBaseUrl,
    client: new LazyResendEmailClient(config.content.apiKey),
    fromEmail: config.content.fromEmail,
  });
}
