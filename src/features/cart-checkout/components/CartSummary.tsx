import * as React from "react";
import { Button } from "@/components/ui";
import type { CartState } from "@/domain/checkout/cart";
import { refreshCartItems } from "../api";
import { getCartSummary } from "../store";

type CartSummaryProps = {
  onRefresh?: () => void;
  state: CartState;
};

const actionClass =
  "inline-flex min-h-control-md items-center justify-center border border-brand-accent bg-brand-accent px-grid-sm font-system text-xs font-bold uppercase text-brand-surface no-underline hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent";

export function CartSummary({ onRefresh, state }: CartSummaryProps) {
  const summary = getCartSummary(state);
  const isEmpty = state.items.length === 0;
  const [refreshing, setRefreshing] = React.useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshCartItems(state.items);
    onRefresh?.();
    setRefreshing(false);
  }

  return (
    <aside className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm">
      <div className="grid gap-1">
        <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
          Cart summary
        </p>
        <div className="flex items-end justify-between gap-grid-sm">
          <span className="font-system text-sm font-bold uppercase text-brand-muted">
            Subtotal
          </span>
          <strong className="font-identity text-2xl">
            {summary.subtotalLabel}
          </strong>
        </div>
        <p className="m-0 text-sm text-brand-muted">
          {summary.totalQuantity} item quantity across {summary.lineItemCount} line
          items.
        </p>
      </div>

      {summary.hasBlockingIssues ? (
        <p className="m-0 border border-brand-danger bg-brand-surface p-grid-xs text-sm font-bold text-brand-danger">
          Resolve unavailable or unverified items before checkout.
        </p>
      ) : (
        <p className="m-0 min-h-control-md text-sm text-brand-muted">
          Checkout validates price and availability again before payment.
        </p>
      )}

      <div className="grid gap-grid-xs sm:grid-cols-2">
        <Button
          disabled={isEmpty || refreshing}
          loading={refreshing}
          loadingLabel="Refreshing"
          onClick={handleRefresh}
          variant="secondary"
        >
          Refresh cart
        </Button>
        {isEmpty || summary.hasBlockingIssues ? (
          <Button disabled variant="primary">
            {isEmpty ? "Cart empty" : "Resolve items"}
          </Button>
        ) : (
          <a className={actionClass} href="/account">
            Continue to account
          </a>
        )}
      </div>
    </aside>
  );
}

