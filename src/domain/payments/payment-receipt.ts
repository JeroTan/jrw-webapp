import {
  paymentReturnStatusFromPayment,
  type OrderFulfillmentStatus,
  type PaymentReturnStatus,
} from "./payment-reconciliation";
import {
  buildCustomerOrderStatusLanes,
  type CustomerOrderStatusLanes,
} from "@/domain/orders/customer-order-status";

export type PublicPaymentReceiptItem = {
  lineTotalCentavos: number;
  name: string;
  productId: string | null;
  quantity: number;
  unitAmountCentavos: number;
  variantId: string | null;
  variantLabel: string | null;
};

export type PublicPaymentReceipt = {
  fulfillmentStatus: {
    label: string;
    value: OrderFulfillmentStatus | null;
  };
  guestAccountCta: {
    eligible: boolean;
    href?: string;
    label?: string;
    message?: string;
  };
  inboxReminder?: string;
  items: PublicPaymentReceiptItem[];
  orderNumber?: string;
  paymentStatus: {
    label: string;
    value: PaymentReturnStatus;
  };
  source: "order" | "payment";
  statusLanes: CustomerOrderStatusLanes;
  totals: {
    currency: "PHP";
    subtotalCentavos: number;
    totalCentavos: number;
  };
};

export type BuildPaymentReceiptInput = {
  accountPrefillContext?: string | null;
  customerId: string | null;
  fulfillmentStatus?: OrderFulfillmentStatus | null;
  items: PublicPaymentReceiptItem[];
  orderId?: string | null;
  orderNumber?: string | null;
  paymentStatus: string;
  source: "order" | "payment";
  statusUpdatedAt?: string | null;
  subtotalCentavos: number;
  totalCentavos: number;
};

export function paymentStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "PAYMENT_PAID":
      return "Payment paid";
    case "PAYMENT_PENDING":
      return "Payment pending";
    case "PAYMENT_FAILED":
      return "Payment failed";
    case "PAYMENT_EXPIRED":
      return "Payment expired";
    case "PAYMENT_CANCELLED":
      return "Payment cancelled";
    case "PAYMENT_REFUNDED":
      return "Payment refunded";
    default:
      return "Payment status unavailable";
  }
}

export function fulfillmentStatusLabel(
  status: OrderFulfillmentStatus | null | undefined
): string {
  switch (status) {
    case "ORDER_PLACED":
      return "Order placed";
    case "PROCESSING":
      return "Processing";
    case "SHIPPED":
      return "Shipped";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Not started";
  }
}

function confirmedGuestAccountCta(input: {
  accountPrefillContext?: string | null;
  customerId: string | null;
}) {
  if (input.customerId) {
    return { eligible: false };
  }
  const params = new URLSearchParams({ returnTo: "/account/orders" });

  if (input.accountPrefillContext) {
    params.set("receiptContext", input.accountPrefillContext);
  }

  return {
    eligible: true,
    href: `/account/register?${params.toString()}`,
    label: "Create account",
    message:
      "Create an account with this email to track delivery faster next time.",
  };
}

export function buildPaymentReceipt(
  input: BuildPaymentReceiptInput
): PublicPaymentReceipt {
  const publicStatus = paymentReturnStatusFromPayment({
    orderId: input.orderId ?? (input.source === "order" ? "order" : null),
    paymentStatus: input.paymentStatus,
  });
  const isConfirmed = publicStatus === "confirmed";

  return {
    fulfillmentStatus: {
      label: fulfillmentStatusLabel(input.fulfillmentStatus ?? null),
      value: input.fulfillmentStatus ?? null,
    },
    guestAccountCta: isConfirmed
      ? confirmedGuestAccountCta({
          accountPrefillContext: input.accountPrefillContext,
          customerId: input.customerId,
        })
      : { eligible: false },
    ...(isConfirmed
      ? {
          inboxReminder:
            "Order and delivery updates were sent to your checkout email inbox.",
        }
      : {}),
    items: input.items,
    ...(input.orderNumber ? { orderNumber: input.orderNumber } : {}),
    paymentStatus: {
      label: paymentStatusLabel(input.paymentStatus),
      value: publicStatus,
    },
    source: input.source,
    statusLanes: buildCustomerOrderStatusLanes({
      fulfillmentStatus: input.fulfillmentStatus ?? null,
      paymentStatus: input.paymentStatus,
      updatedAt: input.statusUpdatedAt ?? null,
    }),
    totals: {
      currency: "PHP",
      subtotalCentavos: input.subtotalCentavos,
      totalCentavos: input.totalCentavos,
    },
  };
}
