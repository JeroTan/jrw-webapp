import * as React from "react";
import { Drawer } from "@/components/ui";
import type { CartState } from "@/domain/checkout/cart";
import { refreshCartItems } from "../api";
import { useCartStore } from "../store";
import { CartLineItems } from "./CartLineItems";
import { CartSummary } from "./CartSummary";

type CartDrawerProps = {
  onClose: () => void;
  open: boolean;
};

type CartDrawerViewProps = CartDrawerProps & {
  state: CartState;
};

export function CartDrawerView({ onClose, open, state }: CartDrawerViewProps) {
  React.useEffect(() => {
    if (open) {
      void refreshCartItems(state.items);
    }
  }, [open]);

  return (
    <Drawer
      description="Review line items before next checkout step."
      onClose={onClose}
      open={open}
      title="Cart"
    >
      <div className="grid gap-grid-sm">
        <CartLineItems items={state.items} />
        <CartSummary state={state} />
        <a
          className="inline-flex min-h-control-md items-center justify-center border border-brand-border-strong px-grid-sm font-system text-xs font-bold uppercase no-underline hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          href="/cart"
        >
          Open cart page
        </a>
      </div>
    </Drawer>
  );
}

export function CartDrawer(props: CartDrawerProps) {
  const state = useCartStore();

  return <CartDrawerView {...props} state={state} />;
}

