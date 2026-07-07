import { and, eq, isNull } from "drizzle-orm";
import type { AppDb } from "@/adapter/infrastructure/db/client";
import type { ReceiptAccountPrefillPayload } from "@/domain/auth/receipt-account-prefill";
import {
  checkout_attempts,
  checkout_payments,
  orders,
} from "@/domain/schema/transactions";

export type CustomerRegistrationPrefill = {
  email: string;
};

function cleanEmail(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export class DrizzleCustomerRegistrationPrefillRepository {
  constructor(private readonly db: AppDb) {}

  async findConfirmedGuestReceiptPrefill(
    payload: ReceiptAccountPrefillPayload
  ): Promise<CustomerRegistrationPrefill | null> {
    const rows = await this.db
      .select({
        checkoutEmail: checkout_attempts.checkout_email,
      })
      .from(checkout_payments)
      .innerJoin(
        checkout_attempts,
        eq(checkout_attempts.id, checkout_payments.checkout_attempt_id)
      )
      .innerJoin(orders, eq(orders.payment_id, checkout_payments.id))
      .where(
        and(
          eq(checkout_payments.provider, "PAYMONGO"),
          eq(checkout_payments.id, payload.paymentId),
          eq(checkout_payments.checkout_attempt_id, payload.attemptId),
          eq(checkout_payments.status, "PAYMENT_PAID"),
          isNull(checkout_attempts.customer_id),
          isNull(orders.customer_id)
        )
      )
      .limit(1);
    const email = cleanEmail(rows[0]?.checkoutEmail);

    return email ? { email } : null;
  }
}
