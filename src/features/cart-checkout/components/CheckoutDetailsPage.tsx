import * as React from "react";
import { Button, ButtonLink, InputBox } from "@/components/ui";
import type { CartState } from "@/domain/checkout/cart";
import { validateCartBeforeCheckout } from "../api";
import {
  applyCheckoutValidationSummaryToStore,
  getCartSnapshot,
  useCartStore,
} from "../store";
import { CartLineItems } from "./CartLineItems";
import { CheckoutFlowShell } from "./CheckoutFlow";

type CheckoutDetailsPageViewProps = {
  onRetryValidation?: () => void;
  state: CartState;
  validationMessage?: string | null;
  validationStatus?: "blocked" | "error" | "pending" | "valid";
};

const detailFields = [
  { autoComplete: "name", label: "Full name", name: "fullName", type: "text" },
  { autoComplete: "email", label: "Email", name: "email", type: "email" },
  { autoComplete: "tel", label: "Phone", name: "phone", type: "tel" },
  { autoComplete: "address-level2", label: "City", name: "city", type: "text" },
  {
    autoComplete: "address-level3",
    label: "Barangay",
    name: "barangay",
    type: "text",
  },
  {
    autoComplete: "postal-code",
    label: "Postal code",
    name: "postalCode",
    type: "text",
  },
] as const;

function cartValidationFingerprint(state: CartState): string {
  return state.items
    .map((item) =>
      [
        item.productId,
        item.variantId,
        item.productSlug,
        item.priceCentavos,
        item.quantity,
        item.availabilityStatus,
      ].join(":")
    )
    .join("|");
}

export function CheckoutDetailsPageView({
  onRetryValidation,
  state,
  validationMessage = null,
  validationStatus = "valid",
}: CheckoutDetailsPageViewProps) {
  if (validationStatus !== "valid") {
    const pending = validationStatus === "pending";

    return (
      <CheckoutFlowShell
        currentStep="cart"
        state={state}
        title="Checkout validation"
        titleId="checkout-validation-title"
      >
        <section className="grid gap-grid-sm border border-brand-border-strong p-grid-sm">
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            Cart check
          </p>
          <h2 className="m-0 font-identity text-2xl font-bold">
            {pending ? "Checking cart" : "Review cart"}
          </h2>
          <p className="m-0 text-sm text-brand-muted" role="status">
            {validationMessage ??
              (pending
                ? "Checking cart..."
                : "Resolve cart updates before details.")}
          </p>
          {state.items.length > 0 ? (
            <CartLineItems items={state.items} />
          ) : null}
          <div className="flex flex-wrap gap-grid-xs">
            {onRetryValidation ? (
              <Button
                disabled={pending}
                loading={pending}
                loadingLabel="Checking cart"
                onClick={onRetryValidation}
                textSize="xs"
                variant="primary"
              >
                Check cart
              </Button>
            ) : null}
            <ButtonLink href="/cart" textSize="xs" variant="secondary">
              Return to cart
            </ButtonLink>
          </div>
        </section>
      </CheckoutFlowShell>
    );
  }

  return (
    <CheckoutFlowShell
      currentStep="details"
      state={state}
      title="Checkout details"
      titleId="checkout-details-title"
    >
      <form className="grid md:grid-cols-2" noValidate>
        {detailFields.map((field) => {
          const inputId = `checkout-${field.name}`;

          return (
            <div
              className="-mt-px -ml-px grid min-h-21.5 gap-grid-xs border border-brand-border p-grid-sm"
              key={field.name}
            >
              <InputBox
                label={field.label}
                autoComplete={field.autoComplete}
                id={inputId}
                name={field.name}
                textSize="sm"
                type={field.type}
              />
            </div>
          );
        })}
      </form>
    </CheckoutFlowShell>
  );
}

export function CheckoutDetailsPage() {
  const state = useCartStore();
  const cartFingerprint = cartValidationFingerprint(state);
  const lastValidationFingerprintRef = React.useRef<string | null>(null);
  const [validationStatus, setValidationStatus] = React.useState<
    "blocked" | "error" | "pending" | "valid"
  >("pending");
  const [validationMessage, setValidationMessage] = React.useState<
    string | null
  >("Checking cart...");

  const validateDirectCheckout = React.useCallback(async () => {
    const requestFingerprint = cartValidationFingerprint(state);
    lastValidationFingerprintRef.current = requestFingerprint;

    if (state.items.length === 0) {
      setValidationStatus("blocked");
      setValidationMessage("Add an item before checkout.");
      return;
    }

    setValidationStatus("pending");
    setValidationMessage("Checking cart...");
    const requestState = state;
    const result = await validateCartBeforeCheckout(requestState);

    if (result.kind === "failure") {
      setValidationStatus("error");
      setValidationMessage(result.reason);
      return;
    }

    const applied = applyCheckoutValidationSummaryToStore(
      result.summary,
      requestState
    );

    if (!applied) {
      lastValidationFingerprintRef.current =
        cartValidationFingerprint(getCartSnapshot());
      setValidationStatus("blocked");
      setValidationMessage("Cart changed. Check cart again.");
      return;
    }

    lastValidationFingerprintRef.current =
      cartValidationFingerprint(getCartSnapshot());

    if (result.kind === "valid") {
      setValidationStatus("valid");
      setValidationMessage(null);
      return;
    }

    setValidationStatus("blocked");
    setValidationMessage(
      result.kind === "changed"
        ? "Review cart updates before checkout."
        : "Resolve unavailable items before checkout."
    );
  }, [state]);

  React.useEffect(() => {
    if (lastValidationFingerprintRef.current === cartFingerprint) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void validateDirectCheckout();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [cartFingerprint, validateDirectCheckout]);

  return (
    <CheckoutDetailsPageView
      onRetryValidation={validateDirectCheckout}
      state={state}
      validationMessage={validationMessage}
      validationStatus={validationStatus}
    />
  );
}
