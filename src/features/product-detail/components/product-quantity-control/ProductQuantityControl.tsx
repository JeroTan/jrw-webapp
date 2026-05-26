import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui";

type ProductQuantityControlProps = {
  disabled?: boolean;
  maxQuantity: number;
  onQuantityChange: (quantity: number) => void;
  quantity: number;
};

function clampQuantity(value: number, maxQuantity: number): number {
  const max = Math.max(1, Math.trunc(maxQuantity));
  const quantity = Number.isFinite(value) ? Math.trunc(value) : 1;

  return Math.min(Math.max(quantity, 1), max);
}

export function ProductQuantityControl({
  disabled = false,
  maxQuantity,
  onQuantityChange,
  quantity,
}: ProductQuantityControlProps) {
  const max = Math.max(1, Math.trunc(maxQuantity));

  return (
    <div className="grid gap-1">
      <label
        className="font-system text-xs font-bold uppercase text-brand-muted"
        htmlFor="product-quantity"
      >
        Quantity
      </label>
      <div className="grid grid-cols-[auto_minmax(4.5rem,5.5rem)_auto]">
        <Button
          aria-label="Decrease quantity"
          disabled={disabled || quantity <= 1}
          onClick={() => onQuantityChange(clampQuantity(quantity - 1, max))}
          square
          variant="secondary"
        >
          <Minus aria-hidden="true" className="size-4" />
        </Button>
        <input
          aria-label="Quantity"
          className="min-h-control-md border-y border-brand-border-strong bg-brand-surface px-grid-xs text-center font-system text-sm font-bold text-brand-content"
          disabled={disabled}
          id="product-quantity"
          inputMode="numeric"
          max={max}
          min={1}
          onChange={(event) =>
            onQuantityChange(clampQuantity(Number(event.currentTarget.value), max))
          }
          type="number"
          value={quantity}
        />
        <Button
          aria-label="Increase quantity"
          disabled={disabled || quantity >= max}
          onClick={() => onQuantityChange(clampQuantity(quantity + 1, max))}
          square
          variant="secondary"
        >
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default ProductQuantityControl;
