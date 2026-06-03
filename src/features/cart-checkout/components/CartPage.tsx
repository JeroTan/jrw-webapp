import * as React from "react";
import type { CartState } from "@/domain/checkout/cart";
import { refreshCartItems } from "../api";
import { useCartStore } from "../store";
import { CheckoutFlowShell } from "./CheckoutFlow";
import { CartLineItems } from "./CartLineItems";

type CartPageViewProps = {
  state: CartState;
};

export function CartPageView({ state }: CartPageViewProps) {
  return (
    <CheckoutFlowShell
      currentStep="cart"
      state={state}
      title="Cart"
      titleId="cart-title"
    >
      <CartLineItems items={state.items} />
    </CheckoutFlowShell>
  );
}

export function CartPage() {
  const state = useCartStore();

  React.useEffect(() => {
    async function verifyVisibleItems() {
      try {
        await refreshCartItems(state.items);
      } catch {
        // Cart refresh is best-effort; stored cart state stays visible.
      }
    }

    if (state.items.length > 0) {
      void verifyVisibleItems();
    }
  }, []);

  return <CartPageView state={state} />;
}
