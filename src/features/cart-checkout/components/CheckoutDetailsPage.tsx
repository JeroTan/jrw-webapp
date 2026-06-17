import * as React from "react";
import { useDebounceEffect } from "ahooks";
import { Button, ButtonLink, Checkbox, InputBox } from "@/components/ui";
import { validateCheckoutContactDetails } from "@/domain/checkout/contact-delivery";
import type { CartState } from "@/domain/checkout/cart";
import {
  canUseLocalPayMongoCheckoutProxy,
  createLocalPayMongoCheckoutHandoff,
  createPayMongoPaymentHandoff,
  fetchCurrentCustomerProfile,
  fetchCustomerCheckoutSession,
  reserveCheckoutInventory,
  submitCheckoutDetails,
  validateCartBeforeCheckout,
  type CheckoutDetailsFormValues,
  type CustomerProfileSummary,
} from "../api";
import {
  applyCheckoutValidationSummaryToStore,
  getCartSnapshot,
  useCartStore,
} from "../store";
import { CartLineItems } from "./CartLineItems";
import { CheckoutFlowShell } from "./CheckoutFlow";

type CheckoutDetailsPageViewProps = {
  detailsStatus?: CheckoutDetailsStatus;
  detailsValues?: CheckoutDetailsFormValues;
  fieldErrors?: CheckoutDetailsFieldErrors;
  formMessage?: string | null;
  formSummaryRef?: React.RefObject<HTMLDivElement | null>;
  onDetailsChange?: (
    field: keyof CheckoutDetailsFormValues,
    value: boolean | string
  ) => void;
  onContinueToPayment?: () => void;
  onDetailsSubmit?: FormSubmitHandler;
  onRetryValidation?: () => void;
  state: CartState;
  canContinueToPayment?: boolean;
  paymentHandoffUrl?: string | null;
  validationMessage?: string | null;
  validationStatus?: "blocked" | "error" | "pending" | "valid";
};

type CheckoutDetailsStatus =
  | "creating-payment"
  | "idle"
  | "reserved"
  | "reserving"
  | "saving";

type FormSubmitHandler = (
  event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
) => void;

type CheckoutDetailsFieldName = keyof CheckoutDetailsFormValues;
type CheckoutDetailsFieldErrors = Partial<
  Record<CheckoutDetailsFieldName, string>
>;

type DetailTextField = Exclude<CheckoutDetailsFieldName, "privacyAcknowledged">;

const emptyDetailsValues: CheckoutDetailsFormValues = {
  barangay: "",
  cityProvince: "",
  email: "",
  fullName: "",
  phone: "",
  postalCode: "",
  privacyAcknowledged: false,
  streetAddress: "",
};

const fieldLabels: Record<CheckoutDetailsFieldName, string> = {
  barangay: "Barangay",
  cityProvince: "City / Province",
  email: "Email",
  fullName: "Full name",
  phone: "Phone",
  postalCode: "Postal code",
  privacyAcknowledged: "Privacy acknowledgement",
  streetAddress: "Street address",
};

const detailFields = [
  {
    autoComplete: "name",
    label: fieldLabels.fullName,
    name: "fullName",
    type: "text",
  },
  {
    autoComplete: "email",
    label: fieldLabels.email,
    name: "email",
    type: "email",
  },
  {
    autoComplete: "tel",
    label: fieldLabels.phone,
    name: "phone",
    type: "tel",
  },
  {
    autoComplete: "street-address",
    label: fieldLabels.streetAddress,
    name: "streetAddress",
    type: "text",
  },
  {
    autoComplete: "address-level3",
    label: fieldLabels.barangay,
    name: "barangay",
    type: "text",
  },
  {
    autoComplete: "address-level2",
    label: fieldLabels.cityProvince,
    name: "cityProvince",
    type: "text",
  },
  {
    autoComplete: "postal-code",
    label: fieldLabels.postalCode,
    name: "postalCode",
    type: "text",
  },
] as const satisfies ReadonlyArray<{
  autoComplete: string;
  label: string;
  name: DetailTextField;
  type: "email" | "tel" | "text";
}>;

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

function detailInputValueProps(
  field: DetailTextField,
  detailsValues: CheckoutDetailsFormValues,
  onDetailsChange:
    | ((
        field: keyof CheckoutDetailsFormValues,
        value: boolean | string
      ) => void)
    | undefined
) {
  const value = detailsValues[field];

  if (!onDetailsChange) {
    return { defaultValue: value };
  }

  return {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      onDetailsChange(field, event.currentTarget.value),
    value,
  };
}

function checkboxValueProps(
  detailsValues: CheckoutDetailsFormValues,
  onDetailsChange:
    | ((
        field: keyof CheckoutDetailsFormValues,
        value: boolean | string
      ) => void)
    | undefined
) {
  if (!onDetailsChange) {
    return { defaultChecked: detailsValues.privacyAcknowledged };
  }

  return {
    checked: detailsValues.privacyAcknowledged,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      onDetailsChange("privacyAcknowledged", event.currentTarget.checked),
  };
}

export function CheckoutDetailsPageView({
  canContinueToPayment = false,
  detailsStatus = "idle",
  detailsValues = emptyDetailsValues,
  fieldErrors = {},
  formMessage = null,
  formSummaryRef,
  onContinueToPayment,
  onDetailsChange,
  onDetailsSubmit,
  onRetryValidation,
  paymentHandoffUrl = null,
  state,
  validationMessage = null,
  validationStatus = "valid",
}: CheckoutDetailsPageViewProps) {
  const cartValidationFailed =
    validationStatus === "blocked" || validationStatus === "error";

  if (cartValidationFailed && detailsStatus === "idle") {
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
          <h2 className="m-0 font-identity text-2xl font-bold">Review cart</h2>
          <p className="m-0 text-sm text-brand-muted" role="status">
            {validationMessage ?? "Resolve cart updates before details."}
          </p>
          {state.items.length > 0 ? (
            <CartLineItems items={state.items} />
          ) : null}
          <div className="flex flex-wrap gap-grid-xs">
            {onRetryValidation ? (
              <Button
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

  const detailsBusy =
    detailsStatus === "saving" ||
    detailsStatus === "reserving" ||
    detailsStatus === "creating-payment";
  const summaryAction =
    detailsStatus === "reserved"
      ? paymentHandoffUrl
        ? {
            href: paymentHandoffUrl,
            label: "Continue to PayMongo",
            statusMessage: "Items reserved. Continue with PayMongo.",
          }
        : {
            disabled: true,
            label: "Payment ready",
            statusMessage: "Items reserved. Payment is next.",
          }
      : {
          disabled: !canContinueToPayment || detailsBusy,
          label: "Continue to Payment",
          loading: detailsBusy,
          loadingLabel:
            detailsStatus === "reserving"
              ? "Reserving items"
              : detailsStatus === "creating-payment"
                ? "Preparing PayMongo"
                : "Preparing payment",
          onClick: onContinueToPayment,
          statusMessage:
            detailsStatus === "reserving"
              ? "Reserving items for payment."
              : detailsStatus === "creating-payment"
                ? "Preparing PayMongo checkout."
                : validationStatus === "pending"
                  ? "Checking cart before payment."
                  : null,
        };

  return (
    <CheckoutFlowShell
      currentStep={detailsStatus === "reserved" ? "payment" : "details"}
      state={state}
      summaryAction={summaryAction}
      title="Checkout details"
      titleId="checkout-details-title"
    >
      <form className="grid gap-grid-sm" noValidate onSubmit={onDetailsSubmit}>
        {formMessage ? (
          <div
            className="border border-brand-danger bg-brand-surface p-grid-xs text-sm font-bold text-brand-danger"
            ref={formSummaryRef}
            role="alert"
            tabIndex={-1}
          >
            {formMessage}
          </div>
        ) : null}
        <div className="grid md:grid-cols-2">
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
                  error={fieldErrors[field.name]}
                  id={inputId}
                  name={field.name}
                  required
                  textSize="sm"
                  type={field.type}
                  {...detailInputValueProps(
                    field.name,
                    detailsValues,
                    onDetailsChange
                  )}
                />
              </div>
            );
          })}
        </div>
        <div className="grid gap-grid-sm">
          <Checkbox
            error={fieldErrors.privacyAcknowledged}
            label="I agree JRW can use these details for checkout, delivery, order status, and support."
            name="privacyAcknowledged"
            required
            size="sm"
            {...checkboxValueProps(detailsValues, onDetailsChange)}
          />
        </div>
      </form>
    </CheckoutFlowShell>
  );
}

function fieldErrorMessage(reason: string): string | null {
  const [field, type] = reason.split(":") as [
    CheckoutDetailsFieldName | string,
    string | undefined,
  ];

  if (!(field in fieldLabels)) {
    return null;
  }

  const label = fieldLabels[field as CheckoutDetailsFieldName];

  switch (type) {
    case "format":
      return `${label} format is invalid.`;
    case "too_long":
      return `${label} is too long.`;
    case "required":
    default:
      return `${label} is required.`;
  }
}

function errorsFromReasons(reasons: string[]): CheckoutDetailsFieldErrors {
  return reasons.reduce<CheckoutDetailsFieldErrors>((errors, reason) => {
    const field = reason.split(":")[0] as CheckoutDetailsFieldName;
    const message = fieldErrorMessage(reason);

    if (message && field in fieldLabels) {
      errors[field] = message;
    }

    return errors;
  }, {});
}

function fullNameFromProfile(profile: CustomerProfileSummary): string {
  const firstLast = [profile.firstName, profile.lastName]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim();

  return firstLast || profile.displayName?.trim() || "";
}

function prefillDetailsFromProfile(
  current: CheckoutDetailsFormValues,
  profile: CustomerProfileSummary
): CheckoutDetailsFormValues {
  const profileFullName = fullNameFromProfile(profile);

  return {
    ...current,
    barangay: current.barangay || profile.barangay || "",
    cityProvince: current.cityProvince || profile.cityProvince || "",
    email: current.email || profile.email || "",
    fullName: current.fullName || profileFullName,
    phone: current.phone || profile.phone || "",
    postalCode: current.postalCode || profile.postalCode || "",
    streetAddress: current.streetAddress || profile.streetAddress || "",
  };
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
  const [detailsValues, setDetailsValues] =
    React.useState<CheckoutDetailsFormValues>(emptyDetailsValues);
  const [fieldErrors, setFieldErrors] =
    React.useState<CheckoutDetailsFieldErrors>({});
  const [formMessage, setFormMessage] = React.useState<string | null>(null);
  const [detailsStatus, setDetailsStatus] =
    React.useState<CheckoutDetailsStatus>("idle");
  const [paymentHandoffUrl, setPaymentHandoffUrl] = React.useState<
    string | null
  >(null);
  const [detailsReady, setDetailsReady] = React.useState(false);
  const formSummaryRef = React.useRef<HTMLDivElement | null>(null);
  const validationRequestIdRef = React.useRef(0);

  const validateDirectCheckout = React.useCallback(async (): Promise<
    { kind: "valid"; state: CartState } | { kind: "blocked" | "failure" }
  > => {
    const validationRequestId = validationRequestIdRef.current + 1;
    validationRequestIdRef.current = validationRequestId;
    const isCurrentValidation = () =>
      validationRequestIdRef.current === validationRequestId;
    const requestFingerprint = cartValidationFingerprint(state);
    lastValidationFingerprintRef.current = requestFingerprint;

    if (state.items.length === 0) {
      if (isCurrentValidation()) {
        setValidationStatus("blocked");
        setValidationMessage("Add an item before checkout.");
      }
      return { kind: "blocked" };
    }

    if (isCurrentValidation()) {
      setValidationStatus("pending");
      setValidationMessage("Checking cart...");
    }
    const requestState = state;
    const result = await validateCartBeforeCheckout(requestState);

    if (!isCurrentValidation()) {
      return { kind: "failure" };
    }

    if (result.kind === "failure") {
      setValidationStatus("error");
      setValidationMessage(result.reason);
      return { kind: "failure" };
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
      return { kind: "blocked" };
    }

    lastValidationFingerprintRef.current =
      cartValidationFingerprint(getCartSnapshot());

    if (result.kind === "valid") {
      setValidationStatus("valid");
      setValidationMessage(null);
      return { kind: "valid", state: getCartSnapshot() };
    }

    setValidationStatus("blocked");
    setValidationMessage(
      result.kind === "changed"
        ? "Review cart updates before checkout."
        : "Resolve unavailable items before checkout."
    );
    return { kind: "blocked" };
  }, [state]);

  const loadCustomerPrefill = React.useCallback(async () => {
    const sessionResult = await fetchCustomerCheckoutSession();

    if (sessionResult.kind !== "loaded") {
      return;
    }

    const { session } = sessionResult;

    if (!session.authenticated || session.actor?.role !== "CUSTOMER") {
      return;
    }

    if (!session.actor.accountStatus.emailVerified) {
      return;
    }

    const profileResult = await fetchCurrentCustomerProfile();

    if (profileResult.kind === "loaded") {
      setDetailsValues((current) =>
        prefillDetailsFromProfile(current, profileResult.profile)
      );
    }
  }, []);

  const updateDetailField = React.useCallback(
    (field: keyof CheckoutDetailsFormValues, value: boolean | string) => {
      setDetailsValues((current) => ({ ...current, [field]: value }));
      setDetailsReady(false);
      setFieldErrors((current) => {
        if (!(field in current)) {
          return current;
        }

        const next = { ...current };
        delete next[field];
        return next;
      });
      setDetailsStatus("idle");
      setPaymentHandoffUrl(null);
    },
    []
  );

  const focusFormSummary = React.useCallback(() => {
    window.setTimeout(() => formSummaryRef.current?.focus(), 0);
  }, []);

  const handleContinueToPayment = React.useCallback(async () => {
    const validation = validateCheckoutContactDetails(detailsValues);

    if (!validation.ok) {
      setFieldErrors(errorsFromReasons(validation.reasons));
      setFormMessage("Complete required checkout details before payment.");
      setDetailsStatus("idle");
      focusFormSummary();
      return;
    }

    setFieldErrors({});
    setFormMessage(null);
    setDetailsStatus("saving");

    const result = await submitCheckoutDetails(detailsValues);

    if (result.kind === "invalid") {
      setFieldErrors(errorsFromReasons(result.reasons));
      setFormMessage(result.reason);
      setDetailsStatus("idle");
      focusFormSummary();
      return;
    }

    if (result.kind === "failure") {
      setFormMessage(result.reason);
      setDetailsStatus("idle");
      focusFormSummary();
      return;
    }

    setDetailsValues({
      barangay: result.details.barangay,
      cityProvince: result.details.cityProvince,
      email: result.details.email,
      fullName: result.details.fullName,
      phone: result.details.phone,
      postalCode: result.details.postalCode,
      privacyAcknowledged: true,
      streetAddress: result.details.streetAddress,
    });
    setFormMessage(null);
    setDetailsStatus("reserving");

    const validationResult = await validateDirectCheckout();

    if (validationResult.kind !== "valid") {
      setDetailsStatus("idle");
      return;
    }

    const reservationResult = await reserveCheckoutInventory({
      attemptId: result.attempt.attemptId,
      attemptToken: result.attempt.attemptToken,
      state: validationResult.state,
    });

    if (reservationResult.kind === "reserved") {
      applyCheckoutValidationSummaryToStore(
        reservationResult.cart,
        validationResult.state
      );
      setDetailsStatus("creating-payment");

      if (canUseLocalPayMongoCheckoutProxy()) {
        const localPaymentResult = await createLocalPayMongoCheckoutHandoff({
          attemptId: result.attempt.attemptId,
          reservation: {
            expiresAt: reservationResult.reservation.expiresAt,
            reservationId: reservationResult.reservation.reservationId,
          },
          state: validationResult.state,
        });

        if (localPaymentResult.kind === "handoff") {
          setPaymentHandoffUrl(localPaymentResult.checkoutUrl);
          setDetailsStatus("reserved");
          setFormMessage(null);
          return;
        }
      }

      const paymentResult = await createPayMongoPaymentHandoff({
        attemptId: result.attempt.attemptId,
        attemptToken: result.attempt.attemptToken,
      });

      if (paymentResult.kind === "handoff") {
        setPaymentHandoffUrl(paymentResult.checkoutUrl);
        setDetailsStatus("reserved");
        setFormMessage(null);
        return;
      }

      setPaymentHandoffUrl(null);
      setDetailsStatus("idle");
      setFormMessage(paymentResult.reason);
      focusFormSummary();
      return;
    }

    if (
      reservationResult.kind === "changed" ||
      reservationResult.kind === "blocked"
    ) {
      applyCheckoutValidationSummaryToStore(
        reservationResult.summary,
        validationResult.state
      );
      setValidationStatus("blocked");
      setValidationMessage(reservationResult.reason);
    }

    setDetailsStatus("idle");
    setFormMessage(reservationResult.reason);
    focusFormSummary();
  }, [detailsValues, focusFormSummary, validateDirectCheckout]);

  const handleDetailsSubmit = React.useCallback(
    (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
      event.preventDefault();
      void handleContinueToPayment();
    },
    [handleContinueToPayment]
  );

  React.useEffect(() => {
    if (lastValidationFingerprintRef.current === cartFingerprint) {
      return;
    }

    if (detailsStatus === "reserved") {
      setDetailsStatus("idle");
      setPaymentHandoffUrl(null);
      setFormMessage("Cart changed. Continue to Payment again after review.");
    }

    const timeoutId = window.setTimeout(() => {
      void validateDirectCheckout();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [cartFingerprint, detailsStatus, validateDirectCheckout]);

  React.useEffect(() => {
    void loadCustomerPrefill();
  }, [loadCustomerPrefill]);

  useDebounceEffect(
    () => {
      const validation = validateCheckoutContactDetails(detailsValues);
      setDetailsReady(validation.ok);

      if (validation.ok) {
        setFieldErrors({});
        setFormMessage((current) =>
          current === "Complete required checkout details before payment."
            ? null
            : current
        );
        return;
      }

      setFieldErrors((current) =>
        Object.keys(current).length > 0
          ? errorsFromReasons(validation.reasons)
          : current
      );
    },
    [detailsValues],
    { wait: 200 }
  );

  return (
    <CheckoutDetailsPageView
      canContinueToPayment={detailsReady && validationStatus === "valid"}
      detailsStatus={detailsStatus}
      detailsValues={detailsValues}
      fieldErrors={fieldErrors}
      formMessage={formMessage}
      formSummaryRef={formSummaryRef}
      onContinueToPayment={handleContinueToPayment}
      onDetailsChange={updateDetailField}
      onDetailsSubmit={handleDetailsSubmit}
      onRetryValidation={validateDirectCheckout}
      paymentHandoffUrl={paymentHandoffUrl}
      state={state}
      validationMessage={validationMessage}
      validationStatus={validationStatus}
    />
  );
}
