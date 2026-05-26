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
    <div className="grid grid-cols-[minmax(0,7fr)_auto_auto] gap-grid-xs">
      <Button
        className="uppercase disabled:cursor-not-allowed disabled:opacity-70"
        disabled={disabled}
        fullWidth
        onClick={onBuy}
        variant="primary"
      >
        Buy
      </Button>
      <Button
        aria-label="Add to cart"
        className="uppercase disabled:cursor-not-allowed disabled:opacity-70"
        disabled={disabled}
        loading={loading}
        loadingLabel="Adding"
        onClick={onAddToCart}
        variant="secondary"
      >
        <ShoppingCart aria-hidden="true" className="size-4" />
        {addToCartLabel}
      </Button>
      <Button aria-label="Share" className="uppercase" onClick={onShare}>
        <Share2 aria-hidden="true" className="size-4" />
        Share
      </Button>
    </div>
  );
}

export default ProductActions;
