import * as React from "react";
import { Share2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui";

type ProductActionsProps = {
  addToCartLabel: string;
  disabled: boolean;
  loading: boolean;
  onAddToCart: () => void;
  onBuy: () => void;
  onShare: () => void;
};

export function ProductActions({
  addToCartLabel,
  disabled,
  loading,
  onAddToCart,
  onBuy,
  onShare,
}: ProductActionsProps) {
  return (
    <div className="grid grid-cols-1 gap-grid-xs xs:grid-cols-2 md:grid-cols-[minmax(0,7fr)_auto_auto]">
      <Button
        className="uppercase disabled:cursor-not-allowed disabled:opacity-70 xs:col-span-2 md:col-span-1"
        disabled={disabled}
        fullWidth
        onClick={onBuy}
        variant="primary"
      >
        Buy
      </Button>
      <Button
        aria-label={addToCartLabel}
        className="w-full uppercase disabled:cursor-not-allowed disabled:opacity-70"
        disabled={disabled}
        fullWidth
        loading={loading}
        loadingLabel="Adding"
        onClick={onAddToCart}
        variant="secondary"
      >
        <span className="inline-flex min-w-0 items-center justify-center gap-grid-xs">
          <ShoppingCart aria-hidden="true" className="size-4 shrink-0" />
          <span>{addToCartLabel}</span>
        </span>
      </Button>
      <Button
        aria-label="Share"
        className="w-full uppercase"
        fullWidth
        onClick={onShare}
      >
        <span className="inline-flex min-w-0 items-center justify-center gap-grid-xs">
          <Share2 aria-hidden="true" className="size-4 shrink-0" />
          <span>Share</span>
        </span>
      </Button>
    </div>
  );
}

export default ProductActions;
