import * as React from "react";
import { Input } from "@/components/ui";

export type InventoryAdjusterProps = {
  quantity: string;
  disabled?: boolean;
  error?: string;
  conflictMessage?: string;
  onChange: (value: string) => void;
};

export function InventoryAdjuster({
  quantity,
  disabled = false,
  error,
  conflictMessage,
  onChange,
}: InventoryAdjusterProps) {
  return (
    <div className="jrw-inventory-adjuster">
      <Input
        description="Non-negative integer. Quantity 0 maps to Out of stock unless state is Preorder."
        disabled={disabled}
        error={error}
        inputMode="numeric"
        label="Stock quantity"
        min={0}
        onChange={(event) => onChange(event.currentTarget.value)}
        step={1}
        type="number"
        value={quantity}
      />
      {conflictMessage ? (
        <p className="jrw-field__error" role="alert">
          {conflictMessage}
        </p>
      ) : null}
    </div>
  );
}
