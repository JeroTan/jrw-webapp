export type OrderConfirmationEmailItem = {
  amountCentavos: number;
  name: string;
  quantity: number;
};

export type OrderConfirmationEmailInput = {
  currency: "PHP";
  fulfillmentStatusLabel: string;
  items: readonly OrderConfirmationEmailItem[];
  orderNumber: string;
  paymentStatusLabel: string;
  requestId: string;
  statusUrl: string;
  toEmail: string;
  totalCentavos: number;
};

export type OrderConfirmationEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; error?: unknown };

export type OrderConfirmationEmailNotifier = {
  sendOrderConfirmationEmail(
    input: OrderConfirmationEmailInput
  ): Promise<OrderConfirmationEmailResult>;
};

export class FailingOrderConfirmationEmailNotifier implements OrderConfirmationEmailNotifier {
  async sendOrderConfirmationEmail(): Promise<OrderConfirmationEmailResult> {
    return { ok: false };
  }
}
