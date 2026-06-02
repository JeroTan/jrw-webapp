import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Button, Input } from "@/components/ui";

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

export function nextQuantityFromInputValue(
  value: string,
  currentQuantity: number,
  maxQuantity: number
): number {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return currentQuantity;
  }

  const parsed = Number(cleanValue);

  if (!Number.isFinite(parsed)) {
    return currentQuantity;
  }

  return clampQuantity(parsed, maxQuantity);
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
      <div className="flex">
        <Button
          interactive={false}
          aria-label="Decrease quantity"
          disabled={disabled || quantity <= 1}
          onClick={() => onQuantityChange(clampQuantity(quantity - 1, max))}
          square
          variant="secondary"
          className="aspect-square"
        >
          <Minus aria-hidden="true" className="size-4" />
        </Button>
        <Input
          aria-label="Quantity"
          disabled={disabled}
          id="product-quantity"
          inputMode="numeric"
          max={max && max < 99 ? max : 99}
          interactive={false}
          onChange={(event) =>
            onQuantityChange(
              nextQuantityFromInputValue(
                event.currentTarget.value,
                quantity,
                max
              )
            )
          }
          type="number"
          className="w-16! text-center"
          value={quantity}
        />
        <Button
          interactive={false}
          aria-label="Increase quantity"
          disabled={disabled || quantity >= max}
          onClick={() => onQuantityChange(clampQuantity(quantity + 1, max))}
          square
          variant="secondary"
          className="aspect-square"
        >
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default ProductQuantityControl;
