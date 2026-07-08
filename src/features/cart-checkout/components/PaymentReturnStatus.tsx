import * as React from "react";
import type { CartState } from "@/domain/checkout/cart";
import { formatCatalogPrice } from "@/domain/products/price-format";
import {
  fetchPaymentReturnStatus,
  type PaymentReturnStatusClientResult,
  type PaymentReturnStatusResult,
} from "../api";
import { removePurchasedCartItemsFromStoreOnce, useCartStore } from "../store";
import { CheckoutFlowShell } from "./CheckoutFlow";

export type PaymentReturnStatusProps = {
  attemptId?: string | null;
  paymentId?: string | null;
  providerCheckoutSessionId?: string | null;
};

type PaymentReturnReceiptItem = NonNullable<
  PaymentReturnStatusResult["receipt"]
>["items"][number];

export function purchasedCartItemsFromPaymentReturn(
  result: PaymentReturnStatusClientResult
): PaymentReturnReceiptItem[] {
  if (result.kind !== "loaded" || result.status.status !== "confirmed") {
    return [];
  }

  return result.status.receipt?.items ?? [];
}

function purchasedCartRemovalKeyFromPaymentReturn(
  result: PaymentReturnStatusClientResult
): string | null {
  if (result.kind !== "loaded" || result.status.status !== "confirmed") {
    return null;
  }

  return `payment-return:${result.status.payment.paymentId}`;
}

function statusCopy(status: PaymentReturnStatusResult["status"]): {
  body: string;
  title: string;
} {
  switch (status) {
    case "confirmed":
      return {
        title: "Order confirmed",
        body: "Payment confirmed. Order is placed.",
      };
    case "failed":
      return {
        title: "Payment failed",
        body: "Payment was not completed. No order was placed.",
      };
    case "expired":
      return {
        title: "Payment expired",
        body: "Payment session expired. No order was placed.",
      };
    case "cancelled":
      return {
        title: "Payment cancelled",
        body: "Payment was cancelled. No order was placed.",
      };
    case "refunded":
      return {
        title: "Payment refunded",
        body: "Payment is refunded. Order status may update separately.",
      };
    case "unknown":
      return {
        title: "Status unavailable",
        body: "Payment status is not available yet.",
      };
    case "pending":
    default:
      return {
        title: "Payment pending",
        body: "Payment is still reconciling. Order is not confirmed yet.",
      };
  }
}

export function PaymentReturnStatusView({
  result,
}: {
  result: PaymentReturnStatusClientResult;
}) {
  const loaded = result.kind === "loaded" ? result.status : null;
  const receipt = loaded?.receipt;
  const copy = loaded
    ? statusCopy(loaded.status)
    : {
        title:
          result.kind === "missing" ? "Status unavailable" : "Checking payment",
        body:
          result.kind === "missing"
            ? result.reason
            : result.kind === "failure"
              ? result.reason
              : "Checking server payment status.",
      };

  return (
    <section
      aria-labelledby="payment-return-title"
      className="mx-auto grid w-full max-w-xl content-start gap-grid-sm"
    >
      <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
        Checkout
      </p>
      <h1
        className="m-0 font-identity text-3xl font-bold leading-tight text-brand-content"
        id="payment-return-title"
      >
        {copy.title}
      </h1>
      <p className="m-0 text-sm leading-relaxed text-brand-muted" role="status">
        {copy.body}
      </p>

      {receipt ? (
        <div className="grid gap-grid-sm">
          <dl className="grid gap-grid-xs font-system text-sm">
            {receipt.orderNumber || loaded?.order?.orderNumber ? (
              <div className="flex flex-wrap justify-between gap-grid-xs">
                <dt className="text-brand-muted">Order</dt>
                <dd className="m-0 font-bold">
                  {receipt.orderNumber ?? loaded?.order?.orderNumber}
                </dd>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-between gap-grid-xs">
              <dt className="text-brand-muted">Payment</dt>
              <dd className="m-0 font-bold">
                {receipt.statusLanes.payment.label}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-grid-xs">
              <dt className="text-brand-muted">Fulfillment</dt>
              <dd className="m-0 font-bold">
                {receipt.statusLanes.fulfillment.label}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-grid-xs">
              <dt className="text-brand-muted">Return</dt>
              <dd className="m-0 font-bold">
                {receipt.statusLanes.return.label}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-grid-xs">
              <dt className="text-brand-muted">Refund</dt>
              <dd className="m-0 font-bold">
                {receipt.statusLanes.refund.label}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-grid-xs">
              <dt className="text-brand-muted">Total</dt>
              <dd className="m-0 font-bold">
                {formatCatalogPrice(receipt.totals.totalCentavos)}
              </dd>
            </div>
          </dl>

          {receipt.items.length > 0 ? (
            <div className="grid gap-grid-xs border-t border-brand-border pt-grid-sm">
              <h2 className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
                Items
              </h2>
              <ul className="m-0 grid list-none gap-grid-xs p-0">
                {receipt.items.map((item, index) => (
                  <li
                    className="grid gap-1 border-b border-brand-border pb-grid-xs last:border-b-0 last:pb-0"
                    key={`${item.name}-${item.variantLabel ?? "item"}-${index}`}
                  >
                    <div className="flex flex-wrap justify-between gap-grid-xs">
                      <span className="font-bold text-brand-content">
                        {item.name}
                      </span>
                      <span className="font-system text-sm font-bold text-brand-content">
                        {formatCatalogPrice(item.lineTotalCentavos)}
                      </span>
                    </div>
                    <p className="m-0 font-system text-xs text-brand-muted">
                      {item.quantity} x{" "}
                      {formatCatalogPrice(item.unitAmountCentavos)}
                      {item.variantLabel ? ` / ${item.variantLabel}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {receipt.inboxReminder ? (
            <p className="m-0 border-t border-brand-border pt-grid-sm text-sm leading-relaxed text-brand-muted">
              {receipt.inboxReminder}
            </p>
          ) : null}
        </div>
      ) : loaded?.order ? (
        <dl className="grid max-w-lg gap-grid-xs pt-grid-xs font-system text-sm">
          <div className="flex flex-wrap justify-between gap-grid-xs">
            <dt className="text-brand-muted">Order</dt>
            <dd className="m-0 font-bold">{loaded.order.orderNumber}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-grid-xs">
            <dt className="text-brand-muted">Total</dt>
            <dd className="m-0 font-bold">
              {formatCatalogPrice(loaded.order.totalCentavos)}
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

function receiptSummaryMessage(
  result: PaymentReturnStatusClientResult
): string {
  if (result.kind !== "loaded") {
    return result.kind === "missing"
      ? "Checkout status unavailable."
      : "Payment status unavailable. Try again in a moment.";
  }

  switch (result.status.status) {
    case "confirmed":
      return result.status.order?.orderNumber
        ? `Order ${result.status.order.orderNumber} confirmed.`
        : "Order confirmed.";
    case "failed":
      return "Payment failed. No order placed.";
    case "expired":
      return "Payment expired. No order placed.";
    case "cancelled":
      return "Payment cancelled. No order placed.";
    case "refunded":
      return "Payment refunded.";
    case "unknown":
      return "Payment status unavailable.";
    case "pending":
    default:
      return "Payment pending. Refresh after PayMongo confirms.";
  }
}

function receiptSummaryOverride(result: PaymentReturnStatusClientResult) {
  if (result.kind !== "loaded") {
    return undefined;
  }

  const receipt = result.status.receipt;

  if (receipt) {
    const totalQuantity = receipt.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    return {
      amountLabel: "Total",
      description: null,
      hasBlockingIssues: false,
      lineItemCount: receipt.items.length,
      subtotalLabel: formatCatalogPrice(receipt.totals.totalCentavos),
      title: result.status.status === "confirmed" ? null : "Payment summary",
      totalQuantity,
    };
  }

  if (result.status.status !== "confirmed" || !result.status.order) {
    return undefined;
  }

  return {
    amountLabel: "Total",
    description: null,
    hasBlockingIssues: false,
    lineItemCount: 0,
    subtotalLabel: formatCatalogPrice(result.status.order.totalCentavos),
    title: null,
    totalQuantity: 0,
  };
}

export function PaymentReturnCheckoutView({
  onRefresh,
  refreshing = false,
  result,
  state,
}: {
  onRefresh?: () => void;
  refreshing?: boolean;
  result: PaymentReturnStatusClientResult;
  state: CartState;
}) {
  const isConfirmed =
    result.kind === "loaded" && result.status.status === "confirmed";
  const loaded = result.kind === "loaded" ? result.status : null;
  const isCheckingPayment =
    result.kind === "failure" &&
    result.reason === "Checking server payment status.";
  const canRefresh = !loaded || loaded.next.refreshAllowed;
  const retryCheckoutAllowed = Boolean(loaded?.next.retryCheckoutAllowed);
  const summaryAction = isConfirmed
    ? { href: "/products", label: "Continue shopping" }
    : canRefresh && onRefresh
      ? {
          disabled: refreshing,
          label: "Check status",
          loading: refreshing,
          loadingLabel: "Checking",
          onClick: onRefresh,
        }
      : retryCheckoutAllowed
        ? { href: "/checkout", label: "Return to checkout" }
        : { href: "/products", label: "Continue shopping" };
  const guestAccountCta = loaded?.receipt?.guestAccountCta;
  const secondarySummaryAction =
    isConfirmed &&
    guestAccountCta?.eligible &&
    guestAccountCta.href &&
    guestAccountCta.label
      ? {
          secondaryHref: guestAccountCta.href,
          secondaryLabel: guestAccountCta.label,
          secondaryMessage: guestAccountCta.message,
        }
      : {};

  return (
    <CheckoutFlowShell
      currentStep="receipt"
      state={state}
      summaryAction={{
        ...summaryAction,
        ...secondarySummaryAction,
        statusMessage: isConfirmed ? null : receiptSummaryMessage(result),
      }}
      summaryContentHidden={isCheckingPayment || (refreshing && !loaded)}
      summaryOverride={receiptSummaryOverride(result)}
      title="Checkout receipt"
      titleId="checkout-receipt-return-title"
    >
      <PaymentReturnStatusView result={result} />
    </CheckoutFlowShell>
  );
}

export function PaymentReturnStatus(props: PaymentReturnStatusProps) {
  const state = useCartStore();
  const [result, setResult] = React.useState<PaymentReturnStatusClientResult>({
    kind: "failure",
    reason: "Checking server payment status.",
  });
  const [refreshing, setRefreshing] = React.useState(false);
  const requestSequence = React.useRef(0);

  const loadStatus = React.useCallback(async () => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setRefreshing(true);
    const next = await fetchPaymentReturnStatus(props);

    if (sequence === requestSequence.current) {
      const removalKey = purchasedCartRemovalKeyFromPaymentReturn(next);

      if (removalKey) {
        removePurchasedCartItemsFromStoreOnce(
          removalKey,
          purchasedCartItemsFromPaymentReturn(next)
        );
      }

      setResult(next);
      setRefreshing(false);
    }
  }, [props.attemptId, props.paymentId, props.providerCheckoutSessionId]);

  React.useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  return (
    <PaymentReturnCheckoutView
      onRefresh={loadStatus}
      refreshing={refreshing}
      result={result}
      state={state}
    />
  );
}
