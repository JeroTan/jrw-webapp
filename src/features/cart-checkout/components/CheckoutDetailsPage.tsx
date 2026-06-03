import * as React from "react";
import { InputBox } from "@/components/ui";
import type { CartState } from "@/domain/checkout/cart";
import { useCartStore } from "../store";
import { CheckoutFlowShell } from "./CheckoutFlow";

type CheckoutDetailsPageViewProps = {
  state: CartState;
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

export function CheckoutDetailsPageView({
  state,
}: CheckoutDetailsPageViewProps) {
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

  return <CheckoutDetailsPageView state={state} />;
}
