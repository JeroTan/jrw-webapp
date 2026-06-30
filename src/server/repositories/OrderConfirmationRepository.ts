import { createId } from "@paralleldrive/cuid2";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { AppDb } from "@/adapter/infrastructure/db/client";
import {
  type OrderConfirmationEmailStatus,
  type OrderFulfillmentStatus,
  initialOrderFulfillmentStatus,
  paymentReturnStatusFromPayment,
  type PaymentReturnStatus,
} from "@/domain/payments/payment-reconciliation";
import { products, product_variants } from "@/domain/schema/catalog";
import {
  checkout_attempts,
  checkout_payment_items,
  checkout_payments,
  checkout_reservations,
  order_snapshots,
  orders,
} from "@/domain/schema/transactions";
import type { OrderConfirmationEmailItem } from "@/domain/notifications/order-confirmation-email";

type OrderRow = typeof orders.$inferSelect;

export type OrderConfirmationRecord = {
  checkoutAttemptId: string;
  createdAt: string;
  currency: "PHP";
  customerId: string | null;
  emailStatus: OrderConfirmationEmailStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  orderId: string;
  orderNumber: string;
  paymentId: string;
  paymentStatus: "PAYMENT_PAID";
  reservationId: string;
  totalCentavos: number;
  updatedAt: string;
};

export type ConfirmPaidPaymentInput = {
  now?: string;
  paymentId: string;
  requestId: string;
};

export type ConfirmPaidPaymentResult =
  | {
      created: boolean;
      decision: "confirmed";
      order: OrderConfirmationRecord;
    }
  | { decision: "missing-payment" }
  | { decision: "not-paid"; paymentId: string; paymentStatus: string };

export type MarkProviderCheckoutSessionPaidInput = {
  now?: string;
  providerCheckoutSessionId: string;
  requestId: string;
};

export type MarkProviderCheckoutSessionPaidResult =
  | {
      decision: "already-paid" | "paid";
      paymentId: string;
      paymentStatus: "PAYMENT_PAID";
    }
  | { decision: "invalid-state"; paymentId: string; paymentStatus: string }
  | { decision: "missing-payment" };

export type PaymentReturnLookupInput = {
  attemptId?: string | null;
  paymentId?: string | null;
  providerCheckoutSessionId?: string | null;
};

export type PaymentReturnRecord = {
  canRetry: boolean;
  checkoutAttemptId: string;
  orderId: string | null;
  orderNumber: string | null;
  paymentId: string;
  paymentStatus: string;
  providerCheckoutSessionId: string;
  status: PaymentReturnStatus;
  totalCentavos: number | null;
};

export type OrderConfirmationEmailRecord = {
  currency: "PHP";
  items: OrderConfirmationEmailItem[];
  orderNumber: string;
  toEmail: string;
  totalCentavos: number;
};

export type OrderConfirmationRepositoryLike = {
  claimOrderConfirmationEmail(input: {
    now?: string;
    orderId: string;
    requestId: string;
  }): Promise<boolean>;
  createOrderConfirmationForPaidPayment(
    input: ConfirmPaidPaymentInput
  ): Promise<ConfirmPaidPaymentResult>;
  findPaymentReturnRecord(
    input: PaymentReturnLookupInput
  ): Promise<PaymentReturnRecord | null>;
  getOrderConfirmationEmail(
    orderId: string
  ): Promise<OrderConfirmationEmailRecord | null>;
  markOrderConfirmationEmailFailed(input: {
    now?: string;
    orderId: string;
    requestId: string;
  }): Promise<void>;
  markOrderConfirmationEmailSent(input: {
    messageId?: string;
    now?: string;
    orderId: string;
    requestId: string;
  }): Promise<void>;
  markProviderCheckoutSessionPaid(
    input: MarkProviderCheckoutSessionPaidInput
  ): Promise<MarkProviderCheckoutSessionPaidResult>;
};

type PaymentItemSnapshotSource = {
  amountCentavos: number;
  id: string;
  name: string;
  productId: string | null;
  productName: string | null;
  productSlug: string | null;
  quantity: number;
  variantId: string | null;
  variantName: string | null;
  variantOptions: unknown;
};

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function orderNumberFromId(orderId: string, now: string): string {
  const year = Number.isFinite(Date.parse(now))
    ? new Date(now).getUTCFullYear()
    : new Date().getUTCFullYear();

  return `JRW-${year}-${orderId.slice(0, 8).toUpperCase()}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /SQLITE_CONSTRAINT|UNIQUE constraint failed|constraint failed/i.test(
      error.message
    )
  );
}

function emailStatus(value: string): OrderConfirmationEmailStatus {
  switch (value) {
    case "PENDING":
    case "SENDING":
    case "SENT":
    case "FAILED":
      return value;
    default:
      return "FAILED";
  }
}

function fulfillmentStatus(value: string): OrderFulfillmentStatus {
  switch (value) {
    case "ORDER_PLACED":
    case "PROCESSING":
    case "SHIPPED":
    case "DELIVERED":
    case "CANCELLED":
      return value;
    default:
      return "ORDER_PLACED";
  }
}

function rowToOrderConfirmation(row: OrderRow): OrderConfirmationRecord {
  if (!row.payment_id || !row.checkout_attempt_id || !row.reservation_id) {
    throw new Error("ORDER_CONFIRMATION_ROW_INCOMPLETE");
  }

  return {
    checkoutAttemptId: row.checkout_attempt_id,
    createdAt: row.created_at,
    currency: row.currency === "PHP" ? "PHP" : "PHP",
    customerId: row.customer_id,
    emailStatus: emailStatus(row.order_confirmation_email_status),
    fulfillmentStatus: fulfillmentStatus(row.fulfillment_status),
    orderId: row.id,
    orderNumber: row.order_number ?? row.id,
    paymentId: row.payment_id,
    paymentStatus: "PAYMENT_PAID",
    reservationId: row.reservation_id,
    totalCentavos: Number(row.total_centavos),
    updatedAt: row.updated_at,
  };
}

function splitPaymentItemName(name: string): {
  productName: string;
  variantName: string;
} {
  const [productName, ...variantParts] = name.split(" - ");
  const variantName = variantParts.join(" - ");

  return {
    productName: cleanString(productName) ?? "Product",
    variantName: cleanString(variantName) ?? "Variant",
  };
}

function normalizeVariantOptions(value: unknown): Array<{
  group: string;
  name: string;
}> {
  const parsed =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return [];
          }
        })()
      : value;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter(
      (option): option is { group: unknown; name: unknown } =>
        typeof option === "object" && option !== null
    )
    .map((option) => ({
      group: cleanString(option.group) ?? "",
      name: cleanString(option.name) ?? "",
    }))
    .filter((option) => option.group.length > 0 && option.name.length > 0);
}

function snapshotSignature(input: {
  item: PaymentItemSnapshotSource;
  orderId: string;
  productName: string;
  productSlug: string | null;
  variantName: string;
  variantOptions: Array<{ group: string; name: string }>;
}): string {
  return JSON.stringify({
    orderId: input.orderId,
    paymentItemId: input.item.id,
    productId: input.item.productId,
    productName: input.productName,
    productSlug: input.productSlug,
    variantId: input.item.variantId,
    variantName: input.variantName,
    variantOptions: input.variantOptions,
    amountCentavos: input.item.amountCentavos,
    quantity: input.item.quantity,
  });
}

function canRetryPaymentStatus(status: PaymentReturnStatus): boolean {
  return (
    status === "failed" ||
    status === "expired" ||
    status === "cancelled" ||
    status === "unknown"
  );
}

export class DrizzleOrderConfirmationRepository implements OrderConfirmationRepositoryLike {
  constructor(private readonly db: AppDb) {}

  async createOrderConfirmationForPaidPayment(
    input: ConfirmPaidPaymentInput
  ): Promise<ConfirmPaidPaymentResult> {
    const now = input.now ?? new Date().toISOString();
    const existing = await this.findOrderByPaymentId(input.paymentId);

    if (existing) {
      await this.ensureSnapshotsForOrder({
        now,
        orderId: existing.id,
        paymentId: input.paymentId,
      });

      return {
        created: false,
        decision: "confirmed",
        order: rowToOrderConfirmation(existing),
      };
    }

    const sourceRows = await this.db
      .select({
        paymentId: checkout_payments.id,
        paymentStatus: checkout_payments.status,
        checkoutAttemptId: checkout_payments.checkout_attempt_id,
        reservationId: checkout_payments.reservation_id,
        amountCentavos: checkout_payments.amount_centavos,
        currency: checkout_payments.currency,
        customerId: checkout_attempts.customer_id,
        checkoutEmail: checkout_attempts.checkout_email,
        fullName: checkout_attempts.full_name,
        phone: checkout_attempts.phone,
        streetAddress: checkout_attempts.street_address,
        barangay: checkout_attempts.barangay,
        cityProvince: checkout_attempts.city_province,
        postalCode: checkout_attempts.postal_code,
        subtotalCentavos: checkout_reservations.subtotal_centavos,
      })
      .from(checkout_payments)
      .innerJoin(
        checkout_attempts,
        eq(checkout_attempts.id, checkout_payments.checkout_attempt_id)
      )
      .leftJoin(
        checkout_reservations,
        eq(checkout_reservations.id, checkout_payments.reservation_id)
      )
      .where(eq(checkout_payments.id, input.paymentId))
      .limit(1);
    const source = sourceRows[0];

    if (!source) {
      return { decision: "missing-payment" };
    }

    if (source.paymentStatus !== "PAYMENT_PAID") {
      return {
        decision: "not-paid",
        paymentId: source.paymentId,
        paymentStatus: source.paymentStatus,
      };
    }

    const orderId = createId();
    const orderNumber = orderNumberFromId(orderId, now);
    const fulfillment = initialOrderFulfillmentStatus();

    try {
      const rows = await this.db
        .insert(orders)
        .values({
          id: orderId,
          order_number: orderNumber,
          customer_id: source.customerId,
          checkout_attempt_id: source.checkoutAttemptId,
          reservation_id: source.reservationId,
          payment_id: source.paymentId,
          status: "PENDING",
          status_description: "Payment confirmed",
          shipping_type: "STANDARD",
          total_amount: Number(source.amountCentavos) / 100,
          checkout_email: source.checkoutEmail,
          full_name: source.fullName,
          phone: source.phone,
          street_address: source.streetAddress,
          barangay: source.barangay,
          city_province: source.cityProvince,
          postal_code: source.postalCode,
          payment_status: "PAYMENT_PAID",
          fulfillment_status: fulfillment,
          subtotal_centavos: Number(
            source.subtotalCentavos ?? source.amountCentavos
          ),
          total_centavos: Number(source.amountCentavos),
          currency: source.currency,
          order_confirmation_email_status: "PENDING",
          created_request_id: input.requestId,
          updated_request_id: input.requestId,
          created_at: now,
          updated_at: now,
        })
        .returning();
      const order = rows[0];

      if (!order) {
        throw new Error("ORDER_CONFIRMATION_NOT_CREATED");
      }

      await this.ensureSnapshotsForOrder({
        now,
        orderId: order.id,
        paymentId: input.paymentId,
      });

      return {
        created: true,
        decision: "confirmed",
        order: rowToOrderConfirmation(order),
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const duplicate = await this.findOrderByPaymentId(input.paymentId);

        if (duplicate) {
          await this.ensureSnapshotsForOrder({
            now,
            orderId: duplicate.id,
            paymentId: input.paymentId,
          });

          return {
            created: false,
            decision: "confirmed",
            order: rowToOrderConfirmation(duplicate),
          };
        }
      }

      throw error;
    }
  }

  async findPaymentReturnRecord(
    input: PaymentReturnLookupInput
  ): Promise<PaymentReturnRecord | null> {
    const condition = cleanString(input.paymentId)
      ? eq(checkout_payments.id, cleanString(input.paymentId)!)
      : cleanString(input.providerCheckoutSessionId)
        ? eq(
            checkout_payments.provider_checkout_session_id,
            cleanString(input.providerCheckoutSessionId)!
          )
        : cleanString(input.attemptId)
          ? eq(
              checkout_payments.checkout_attempt_id,
              cleanString(input.attemptId)!
            )
          : null;

    if (!condition) {
      return null;
    }

    const rows = await this.db
      .select({
        checkoutAttemptId: checkout_payments.checkout_attempt_id,
        orderId: orders.id,
        orderNumber: orders.order_number,
        paymentId: checkout_payments.id,
        paymentStatus: checkout_payments.status,
        providerCheckoutSessionId:
          checkout_payments.provider_checkout_session_id,
        totalCentavos: orders.total_centavos,
      })
      .from(checkout_payments)
      .leftJoin(orders, eq(orders.payment_id, checkout_payments.id))
      .where(and(eq(checkout_payments.provider, "PAYMONGO"), condition))
      .orderBy(desc(checkout_payments.created_at), desc(checkout_payments.id))
      .limit(1);
    const row = rows[0];

    if (!row) {
      return null;
    }

    const status = paymentReturnStatusFromPayment({
      orderId: row.orderId,
      paymentStatus: row.paymentStatus,
    });

    return {
      canRetry: canRetryPaymentStatus(status),
      checkoutAttemptId: row.checkoutAttemptId,
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      paymentId: row.paymentId,
      paymentStatus: row.paymentStatus,
      providerCheckoutSessionId: row.providerCheckoutSessionId,
      status,
      totalCentavos:
        typeof row.totalCentavos === "number"
          ? Number(row.totalCentavos)
          : null,
    };
  }

  async markProviderCheckoutSessionPaid(
    input: MarkProviderCheckoutSessionPaidInput
  ): Promise<MarkProviderCheckoutSessionPaidResult> {
    const now = input.now ?? new Date().toISOString();
    const providerCheckoutSessionId = cleanString(
      input.providerCheckoutSessionId
    );

    if (!providerCheckoutSessionId) {
      return { decision: "missing-payment" };
    }

    const paymentRows = await this.db
      .select()
      .from(checkout_payments)
      .where(
        and(
          eq(checkout_payments.provider, "PAYMONGO"),
          eq(
            checkout_payments.provider_checkout_session_id,
            providerCheckoutSessionId
          )
        )
      )
      .limit(1);
    const payment = paymentRows[0];

    if (!payment) {
      return { decision: "missing-payment" };
    }

    if (payment.status === "PAYMENT_PAID") {
      return {
        decision: "already-paid",
        paymentId: payment.id,
        paymentStatus: "PAYMENT_PAID",
      };
    }

    if (payment.status !== "PAYMENT_PENDING") {
      return {
        decision: "invalid-state",
        paymentId: payment.id,
        paymentStatus: payment.status,
      };
    }

    const rows = await this.db
      .update(checkout_payments)
      .set({
        status: "PAYMENT_PAID",
        updated_request_id: input.requestId,
        updated_at: now,
      })
      .where(
        and(
          eq(checkout_payments.id, payment.id),
          eq(checkout_payments.status, "PAYMENT_PENDING")
        )
      )
      .returning({ id: checkout_payments.id, status: checkout_payments.status });

    if (rows[0]) {
      return {
        decision: "paid",
        paymentId: rows[0].id,
        paymentStatus: "PAYMENT_PAID",
      };
    }

    const latestRows = await this.db
      .select({ id: checkout_payments.id, status: checkout_payments.status })
      .from(checkout_payments)
      .where(eq(checkout_payments.id, payment.id))
      .limit(1);
    const latest = latestRows[0];

    if (latest?.status === "PAYMENT_PAID") {
      return {
        decision: "already-paid",
        paymentId: latest.id,
        paymentStatus: "PAYMENT_PAID",
      };
    }

    return {
      decision: "invalid-state",
      paymentId: payment.id,
      paymentStatus: latest?.status ?? payment.status,
    };
  }

  async claimOrderConfirmationEmail(input: {
    now?: string;
    orderId: string;
    requestId: string;
  }): Promise<boolean> {
    const now = input.now ?? new Date().toISOString();
    const rows = await this.db
      .update(orders)
      .set({
        order_confirmation_email_status: "SENDING",
        order_confirmation_email_last_attempt_at: now,
        updated_request_id: input.requestId,
        updated_at: now,
      })
      .where(
        and(
          eq(orders.id, input.orderId),
          sql`${orders.order_confirmation_email_status} IN ('PENDING', 'FAILED')`
        )
      )
      .returning({ id: orders.id });

    return rows.length === 1;
  }

  async markOrderConfirmationEmailSent(input: {
    messageId?: string;
    now?: string;
    orderId: string;
    requestId: string;
  }): Promise<void> {
    const now = input.now ?? new Date().toISOString();

    await this.db
      .update(orders)
      .set({
        order_confirmation_email_status: "SENT",
        order_confirmation_email_sent_at: now,
        order_confirmation_email_last_attempt_at: now,
        order_confirmation_email_message_id: input.messageId ?? null,
        updated_request_id: input.requestId,
        updated_at: now,
      })
      .where(eq(orders.id, input.orderId));
  }

  async markOrderConfirmationEmailFailed(input: {
    now?: string;
    orderId: string;
    requestId: string;
  }): Promise<void> {
    const now = input.now ?? new Date().toISOString();

    await this.db
      .update(orders)
      .set({
        order_confirmation_email_status: "FAILED",
        order_confirmation_email_last_attempt_at: now,
        updated_request_id: input.requestId,
        updated_at: now,
      })
      .where(eq(orders.id, input.orderId));
  }

  async getOrderConfirmationEmail(
    orderId: string
  ): Promise<OrderConfirmationEmailRecord | null> {
    const orderRows = await this.db
      .select({
        checkoutEmail: orders.checkout_email,
        currency: orders.currency,
        orderNumber: orders.order_number,
        totalCentavos: orders.total_centavos,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    const order = orderRows[0];

    if (!order?.checkoutEmail || !order.orderNumber) {
      return null;
    }

    const itemRows = await this.db
      .select({
        amountCentavos: order_snapshots.price_centavos,
        productName: order_snapshots.product_name,
        quantity: order_snapshots.quantity,
        variantName: order_snapshots.variant_name,
      })
      .from(order_snapshots)
      .where(eq(order_snapshots.order_id, orderId))
      .orderBy(
        asc(order_snapshots.snapshot_timestamp),
        asc(order_snapshots.id)
      );

    return {
      currency: "PHP",
      items: itemRows.map((item) => ({
        amountCentavos: Number(item.amountCentavos),
        name: `${item.productName} - ${item.variantName}`,
        quantity: Number(item.quantity),
      })),
      orderNumber: order.orderNumber,
      toEmail: order.checkoutEmail,
      totalCentavos: Number(order.totalCentavos),
    };
  }

  private async findOrderByPaymentId(
    paymentId: string
  ): Promise<OrderRow | null> {
    const rows = await this.db
      .select()
      .from(orders)
      .where(eq(orders.payment_id, paymentId))
      .limit(1);

    return rows[0] ?? null;
  }

  private async ensureSnapshotsForOrder(input: {
    now: string;
    orderId: string;
    paymentId: string;
  }): Promise<void> {
    const items = await this.paymentItemSnapshotSources(input.paymentId);

    for (const item of items) {
      const fallbackNames = splitPaymentItemName(item.name);
      const productName =
        cleanString(item.productName) ?? fallbackNames.productName;
      const variantName =
        cleanString(item.variantName) ?? fallbackNames.variantName;
      const productSlug =
        cleanString(item.productSlug) ?? cleanString(item.productId);
      const variantOptions = normalizeVariantOptions(item.variantOptions);
      const signature = snapshotSignature({
        item,
        orderId: input.orderId,
        productName,
        productSlug,
        variantName,
        variantOptions,
      });

      const existing = await this.db
        .select({ id: order_snapshots.id })
        .from(order_snapshots)
        .where(eq(order_snapshots.snapshot_signature, signature))
        .limit(1);

      if (existing[0]) {
        continue;
      }

      try {
        await this.db.insert(order_snapshots).values({
          id: createId(),
          order_id: input.orderId,
          product_id: item.productId,
          product_slug: productSlug,
          variant_id: item.variantId,
          product_name: productName,
          variant_name: variantName,
          variant_options: variantOptions,
          price_at_purchase: item.amountCentavos,
          price_centavos: item.amountCentavos,
          quantity: item.quantity,
          image_r2_key: null,
          snapshot_timestamp: input.now,
          snapshot_signature: signature,
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }
  }

  private async paymentItemSnapshotSources(
    paymentId: string
  ): Promise<PaymentItemSnapshotSource[]> {
    const rows = await this.db
      .select({
        amountCentavos: checkout_payment_items.amount_centavos,
        id: checkout_payment_items.id,
        name: checkout_payment_items.name,
        productId: checkout_payment_items.product_id,
        productName: products.name,
        productSlug: products.slug,
        quantity: checkout_payment_items.quantity,
        variantId: checkout_payment_items.variant_id,
        variantName: product_variants.name,
        variantOptions: product_variants.variation_chain,
      })
      .from(checkout_payment_items)
      .leftJoin(products, eq(products.id, checkout_payment_items.product_id))
      .leftJoin(
        product_variants,
        eq(product_variants.id, checkout_payment_items.variant_id)
      )
      .where(eq(checkout_payment_items.payment_id, paymentId))
      .orderBy(
        asc(checkout_payment_items.created_at),
        asc(checkout_payment_items.id)
      );

    return rows.map((row) => ({
      amountCentavos: Number(row.amountCentavos),
      id: row.id,
      name: row.name,
      productId: row.productId,
      productName: row.productName,
      productSlug: row.productSlug,
      quantity: Number(row.quantity),
      variantId: row.variantId,
      variantName: row.variantName,
      variantOptions: row.variantOptions,
    }));
  }
}
