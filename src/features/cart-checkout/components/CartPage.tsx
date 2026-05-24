import * as React from "react";
import type { CartState } from "@/domain/checkout/cart";
import { refreshCartItems } from "../api";
import { useCartStore } from "../store";
import { CartLineItems } from "./CartLineItems";
import { CartSummary } from "./CartSummary";

type CartPageViewProps = {
  state: CartState;
};

export function CartPageView({ state }: CartPageViewProps) {
  return (
    <section
      aria-labelledby="cart-title"
      className="grid gap-grid-md pb-[calc(var(--spacing-grid-lg)+88px)] md:grid-cols-[minmax(0,1fr)_minmax(320px,390px)] md:items-start md:pb-0"
    >
      <header className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-md md:col-span-2">
        <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
          Storefront cart
        </p>
        <h1
          className="m-0 font-identity text-[clamp(2.2rem,8vw,4.25rem)] font-bold"
          id="cart-title"
        >
          Cart
        </h1>
        <p className="m-0 max-w-[70ch] text-sm text-brand-muted">
          Saved in this browser. Price and availability recheck before payment.
        </p>
      </header>

      <div className="grid gap-grid-sm">
        <CartLineItems items={state.items} />
      </div>

      <div className="sticky bottom-0 z-20 md:static">
        <CartSummary state={state} />
      </div>
    </section>
  );
}

export function CartPage() {
  const state = useCartStore();

  React.useEffect(() => {
    void refreshCartItems(state.items);
  }, []);

  return <CartPageView state={state} />;
}
