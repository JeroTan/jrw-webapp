export type FulfillmentStatusEmailItem = {
  amountCentavos: number;
  name: string;
  quantity: number;
};

export type FulfillmentStatusEmailInput = {
  currency: "PHP";
  fulfillmentStatusLabel: string;
  items: readonly FulfillmentStatusEmailItem[];
  orderNumber: string;
  requestId: string;
  statusUrl: string;
  toEmail: string;
  totalCentavos: number;
};

export type FulfillmentStatusEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; error?: unknown };

export type FulfillmentStatusEmailNotifier = {
  sendFulfillmentStatusEmail(
    input: FulfillmentStatusEmailInput
  ): Promise<FulfillmentStatusEmailResult>;
};

export function fulfillmentStatusEmailSubject(input: {
  fulfillmentStatusLabel: string;
  orderNumber: string;
}): string {
  void input.orderNumber;
  return `JRW order update: ${input.fulfillmentStatusLabel}`;
}

export class FailingFulfillmentStatusEmailNotifier implements FulfillmentStatusEmailNotifier {
  async sendFulfillmentStatusEmail(): Promise<FulfillmentStatusEmailResult> {
    return { ok: false };
  }
}
