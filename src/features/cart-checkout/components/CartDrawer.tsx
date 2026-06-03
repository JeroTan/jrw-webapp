import * as React from "react";
import { ButtonLink, Drawer } from "@/components/ui";
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
    async function verifyVisibleItems() {
      try {
        await refreshCartItems(state.items);
      } catch {
        // Cart refresh is best-effort; stored cart state stays visible.
      }
    }

    if (open && state.items.length > 0) {
      void verifyVisibleItems();
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
        <ButtonLink href="/cart" textSize="xs">
          See full cart page
        </ButtonLink>
      </div>
    </Drawer>
  );
}

export function CartDrawer(props: CartDrawerProps) {
  const state = useCartStore();

  return <CartDrawerView {...props} state={state} />;
}

