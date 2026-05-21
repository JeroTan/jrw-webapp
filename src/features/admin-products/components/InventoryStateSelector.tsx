import * as React from "react";
import { Select } from "@/components/ui";
import type { InventoryState } from "../types";

export type InventoryStateSelectorProps = {
  state: InventoryState;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  onChange: (state: InventoryState) => void;
};

const stateOptions: Array<{ value: InventoryState; label: string }> = [
  { value: "IN_STOCK", label: "In stock" },
  { value: "LOW_STOCK", label: "Low stock" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
  { value: "PREORDER", label: "Preorder" },
];

export function InventoryStateSelector({
  state,
  disabled = false,
  error,
  helpText,
  onChange,
}: InventoryStateSelectorProps) {
  return (
    <div className="jrw-inventory-state-selector">
      <Select
        description={helpText ?? "Select stock state shown in admin and customer availability."}
        disabled={disabled}
        error={error}
        label="Inventory state"
        onChange={(event) => onChange(event.currentTarget.value as InventoryState)}
        value={state}
      >
        {stateOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
