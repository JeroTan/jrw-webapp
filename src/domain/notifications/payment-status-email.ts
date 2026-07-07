export type PaymentStatusEmailInput = {
  currency: "PHP";
  nextActionUrl: string;
  paymentStatusLabel: string;
  referenceLabel: string;
  requestId: string;
  toEmail: string;
  totalCentavos: number;
};

export type PaymentStatusEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; error?: unknown };

export type PaymentStatusEmailNotifier = {
  sendPaymentStatusEmail(
    input: PaymentStatusEmailInput
  ): Promise<PaymentStatusEmailResult>;
};

export function paymentStatusEmailSubject(input: {
  paymentStatusLabel: string;
  referenceLabel: string;
}): string {
  void input.referenceLabel;
  return `JRW payment update: ${input.paymentStatusLabel}`;
}

export class FailingPaymentStatusEmailNotifier implements PaymentStatusEmailNotifier {
  async sendPaymentStatusEmail(): Promise<PaymentStatusEmailResult> {
    return { ok: false };
  }
}
