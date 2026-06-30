import * as React from "react";
import { Button, ButtonLink } from "@/components/ui";
import type { CartState } from "@/domain/checkout/cart";
import { formatCatalogPrice } from "@/domain/products/price-format";
import {
  fetchPaymentReturnStatus,
  type PaymentReturnStatusClientResult,
  type PaymentReturnStatusResult,
} from "../api";
import { useCartStore } from "../store";
import { CheckoutFlowShell } from "./CheckoutFlow";

export type PaymentReturnStatusProps = {
  attemptId?: string | null;
  paymentId?: string | null;
  providerCheckoutSessionId?: string | null;
};

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
  onRefresh,
  result,
  refreshing = false,
}: {
  onRefresh?: () => void;
  refreshing?: boolean;
  result: PaymentReturnStatusClientResult;
}) {
  const loaded = result.kind === "loaded" ? result.status : null;
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
      className="mx-auto grid max-w-3xl gap-grid-sm border border-brand-border-strong p-grid-md"
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

      {loaded?.order ? (
        <dl className="grid gap-grid-xs border-t border-brand-border pt-grid-sm font-system text-sm">
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

      <div className="flex flex-wrap gap-grid-xs">
        {loaded?.next.refreshAllowed || result.kind !== "loaded" ? (
          <Button
            loading={refreshing}
            loadingLabel="Checking"
            onClick={onRefresh}
            textSize="xs"
            variant="primary"
          >
            Check status
          </Button>
        ) : null}
        {loaded?.next.retryCheckoutAllowed || result.kind === "missing" ? (
          <ButtonLink href="/checkout" textSize="xs" variant="secondary">
            Return to checkout
          </ButtonLink>
        ) : null}
        <ButtonLink href="/products" textSize="xs" variant="ghost">
          Continue shopping
        </ButtonLink>
      </div>
    </section>
  );
}

function receiptSummaryMessage(result: PaymentReturnStatusClientResult): string {
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
  if (
    result.kind !== "loaded" ||
    result.status.status !== "confirmed" ||
    !result.status.order
  ) {
    return undefined;
  }

  return {
    description: `Order ${result.status.order.orderNumber}`,
    hasBlockingIssues: false,
    lineItemCount: 0,
    subtotalLabel: formatCatalogPrice(result.status.order.totalCentavos),
    title: "Order summary",
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

  return (
    <CheckoutFlowShell
      currentStep="receipt"
      state={state}
      summaryAction={{
        ...summaryAction,
        statusMessage: receiptSummaryMessage(result),
      }}
      summaryOverride={receiptSummaryOverride(result)}
      title="Checkout receipt"
      titleId="checkout-receipt-return-title"
    >
      <PaymentReturnStatusView
        onRefresh={onRefresh}
        refreshing={refreshing}
        result={result}
      />
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

  const loadStatus = React.useCallback(async () => {
    setRefreshing(true);
    const next = await fetchPaymentReturnStatus(props);
    setResult(next);
    setRefreshing(false);
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
