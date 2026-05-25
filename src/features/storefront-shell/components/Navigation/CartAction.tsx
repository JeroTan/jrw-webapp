import { Button } from "@/components/ui";
import { CartDrawer, useCartSummary } from "@/features/cart-checkout";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";

export default function CartAction() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const summary = useCartSummary();
  const cartLabel =
    summary.totalQuantity === 1
      ? "Open cart, 1 item"
      : `Open cart, ${summary.totalQuantity} items`;

  return (
    <>
      <div className="relative">
        <Button
          paddingX="sm"
          loadingLabel="..."
          aria-label={cartLabel}
          onClick={() => setDrawerOpen(true)}
        >
          <ShoppingCart size="16" />
        </Button>
        <div
          className="
            absolute inline-flex items-center justify-center 
            size-4.5
            border border-brand-border-strong bg-brand-surface
            font-system text-[0.625rem] font-bold leading-none
            -right-1.5 -top-1.5
          "
        >
          {summary.totalQuantity}
        </div>
      </div>
      <CartDrawer onClose={() => setDrawerOpen(false)} open={drawerOpen} />
    </>
  );
}
