import * as React from "react";
import { Input, Textarea } from "@/components/ui";
import type { InventoryState } from "../types";
import { InventoryStateSelector } from "./InventoryStateSelector";

export type InventoryAdjusterProps = {
  quantity: string;
  disabled?: boolean;
  error?: string;
  state?: InventoryState;
  stateError?: string;
  reason?: string;
  reasonError?: string;
  showReasonField?: boolean;
  allowedNextAction?: string | null;
  conflictMessage?: string;
  onChange: (value: string) => void;
  onStateChange?: (state: InventoryState) => void;
  onReasonChange?: (reason: string) => void;
};

export function InventoryAdjuster({
  quantity,
  disabled = false,
  error,
  state,
  stateError,
  reason = "",
  reasonError,
  showReasonField = false,
  allowedNextAction = null,
  conflictMessage,
  onChange,
  onStateChange,
  onReasonChange,
}: InventoryAdjusterProps) {
  return (
    <div className="grid gap-grid-xs">
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

      {state && onStateChange ? (
        <InventoryStateSelector
          disabled={disabled}
          error={stateError}
          onChange={onStateChange}
          state={state}
        />
      ) : null}

      {showReasonField ? (
        <Textarea
          description="Optional audit note for stock changes."
          disabled={disabled}
          error={reasonError}
          label="Adjustment reason"
          onChange={(event) => onReasonChange?.(event.currentTarget.value)}
          rows={3}
          value={reason}
        />
      ) : null}

      {conflictMessage ? (
        <section className="grid gap-0.5" role="alert">
          <p className="font-system text-xs font-bold text-brand-danger">{conflictMessage}</p>
          {allowedNextAction ? (
            <p className="font-system text-xs text-brand-muted">Next action: {allowedNextAction}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
