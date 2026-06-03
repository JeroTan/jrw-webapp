import * as React from "react";
import { Button, ButtonLink } from "@/components/ui";
import type { CartState } from "@/domain/checkout/cart";
import { RefreshCw } from "lucide-react";
import { refreshCartItems } from "../api";
import { getCartSummary } from "../store";

type CartSummaryProps = {
  onRefresh?: () => void;
  state: CartState;
};

export function CartSummary({ onRefresh, state }: CartSummaryProps) {
  const summary = getCartSummary(state);
  const isEmpty = state.items.length === 0;
  const [refreshing, setRefreshing] = React.useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshCartItems(state.items);
      onRefresh?.();
    } catch {
      // Cart verification is best-effort; stale state remains visible.
    } finally {
      setRefreshing(false);
    }
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
          <strong className="brand-title-big text-brand-accent">
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
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-grid-xs">
        {isEmpty || summary.hasBlockingIssues ? (
          <Button disabled variant="primary">
            Checkout
          </Button>
        ) : (
          <ButtonLink href="/checkout" textSize="xs" variant="primary">
            Checkout
          </ButtonLink>
        )}
        <Button
          aria-label="Refresh cart"
          disabled={isEmpty || refreshing}
          onClick={handleRefresh}
          square
          title="Refresh cart"
          variant="secondary"
        >
          <RefreshCw
            aria-hidden="true"
            className={refreshing ? "motion-safe:animate-spin" : undefined}
            size={16}
          />
        </Button>
      </div>
    </aside>
  );
}

