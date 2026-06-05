import * as React from "react";
import type { CartState } from "@/domain/checkout/cart";
import { validateCartBeforeCheckout } from "../api";
import { applyCheckoutValidationSummaryToStore } from "../store";

export type CheckoutValidationUiStatus =
  | "idle"
  | "pending"
  | "success"
  | "changed"
  | "blocked"
  | "error";

export type CheckoutValidationUiState = {
  message: string | null;
  status: CheckoutValidationUiStatus;
};

const initialValidationState: CheckoutValidationUiState = {
  message: null,
  status: "idle",
};

function messageForStatus(status: Exclude<CheckoutValidationUiStatus, "idle">) {
  switch (status) {
    case "pending":
      return "Checking cart...";
    case "success":
      return "Cart checked.";
    case "changed":
      return "Review cart updates before checkout.";
    case "blocked":
      return "Resolve unavailable items before checkout.";
    case "error":
      return "Could not verify cart. Try again.";
  }
}

function navigateToCheckout() {
  if (typeof window === "undefined") {
    return;
  }

  window.location.assign("/checkout");
}

export function useCheckoutValidationAction(input: {
  navigateOnSuccess?: boolean;
  onValidated?: () => void;
  state: CartState;
}) {
  const [validation, setValidation] = React.useState<CheckoutValidationUiState>(
    initialValidationState
  );

  const validate = React.useCallback(async () => {
    if (input.state.items.length === 0) {
      setValidation({
        message: "Add an item before checkout.",
        status: "error",
      });
      return;
    }

    setValidation({
      message: messageForStatus("pending"),
      status: "pending",
    });

    const result = await validateCartBeforeCheckout(input.state);

    if (result.kind === "failure") {
      setValidation({
        message: result.reason,
        status: "error",
      });
      return;
    }

    applyCheckoutValidationSummaryToStore(result.summary);
    input.onValidated?.();

    if (result.kind === "valid") {
      setValidation({
        message: messageForStatus("success"),
        status: "success",
      });

      if (input.navigateOnSuccess) {
        navigateToCheckout();
      }

      return;
    }

    setValidation({
      message: messageForStatus(result.kind),
      status: result.kind,
    });
  }, [input]);

  return {
    isPending: validation.status === "pending",
    validate,
    validation,
  };
}
