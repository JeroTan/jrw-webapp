import * as React from "react";
import { Button, ButtonLink, Checkbox, InputBox } from "@/components/ui";
import { validateCheckoutContactDetails } from "@/domain/checkout/contact-delivery";
import type { CartState } from "@/domain/checkout/cart";
import {
  fetchCurrentCustomerProfile,
  fetchCustomerCheckoutSession,
  registerCustomerForCheckout,
  reserveCheckoutInventory,
  signInCustomerForCheckout,
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
  accountMessage?: string | null;
  authValues?: AccountAssistValues;
  detailsStatus?: CheckoutDetailsStatus;
  detailsValues?: CheckoutDetailsFormValues;
  fieldErrors?: CheckoutDetailsFieldErrors;
  formMessage?: string | null;
  formSummaryRef?: React.RefObject<HTMLDivElement | null>;
  onAccountFieldChange?: (
    field: keyof AccountAssistValues,
    value: string
  ) => void;
  onDetailsChange?: (
    field: keyof CheckoutDetailsFormValues,
    value: boolean | string
  ) => void;
  onDetailsSubmit?: FormSubmitHandler;
  onRetryValidation?: () => void;
  onSignInSubmit?: FormSubmitHandler;
  onRegisterSubmit?: FormSubmitHandler;
  state: CartState;
  validationMessage?: string | null;
  validationStatus?: "blocked" | "error" | "pending" | "valid";
};

type CheckoutDetailsStatus =
  | "idle"
  | "reserved"
  | "reserving"
  | "saved"
  | "saving";

type AccountAssistValues = {
  registerEmail: string;
  registerPassword: string;
  signInEmail: string;
  signInPassword: string;
};

type FormSubmitHandler = (
  event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
) => void;

type CheckoutDetailsFieldName = keyof CheckoutDetailsFormValues;
type CheckoutDetailsFieldErrors = Partial<
  Record<CheckoutDetailsFieldName, string>
>;

type DetailTextField = Exclude<
  CheckoutDetailsFieldName,
  "privacyAcknowledged"
>;

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

const emptyAccountAssistValues: AccountAssistValues = {
  registerEmail: "",
  registerPassword: "",
  signInEmail: "",
  signInPassword: "",
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
    | ((field: keyof CheckoutDetailsFormValues, value: boolean | string) => void)
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
    | ((field: keyof CheckoutDetailsFormValues, value: boolean | string) => void)
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

function accountInputValueProps(
  field: keyof AccountAssistValues,
  authValues: AccountAssistValues,
  onAccountFieldChange:
    | ((field: keyof AccountAssistValues, value: string) => void)
    | undefined
) {
  const value = authValues[field];

  if (!onAccountFieldChange) {
    return { defaultValue: value };
  }

  return {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      onAccountFieldChange(field, event.currentTarget.value),
    value,
  };
}

export function CheckoutDetailsPageView({
  accountMessage = null,
  authValues = emptyAccountAssistValues,
  detailsStatus = "idle",
  detailsValues = emptyDetailsValues,
  fieldErrors = {},
  formMessage = null,
  formSummaryRef,
  onAccountFieldChange,
  onDetailsChange,
  onDetailsSubmit,
  onRetryValidation,
  onRegisterSubmit,
  onSignInSubmit,
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
      currentStep={detailsStatus === "reserved" ? "payment" : "details"}
      state={state}
      title="Checkout details"
      titleId="checkout-details-title"
    >
      <section className="grid gap-grid-sm border border-brand-border-strong p-grid-sm">
        <div className="grid gap-1">
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            Account assist
          </p>
          <p className="m-0 text-sm text-brand-muted">
            Guest checkout stays available. Account actions only help prefill
            saved details.
          </p>
        </div>
        {accountMessage ? (
          <p className="m-0 border border-brand-border p-grid-xs text-sm font-bold text-brand-muted">
            {accountMessage}
          </p>
        ) : null}
        <div className="grid gap-grid-sm md:grid-cols-3">
          <form className="grid gap-grid-xs" onSubmit={onSignInSubmit}>
            <InputBox
              autoComplete="email"
              label="Sign-in email"
              name="signInEmail"
              textSize="sm"
              type="email"
              {...accountInputValueProps(
                "signInEmail",
                authValues,
                onAccountFieldChange
              )}
            />
            <InputBox
              autoComplete="current-password"
              label="Sign-in password"
              name="signInPassword"
              textSize="sm"
              type="password"
              {...accountInputValueProps(
                "signInPassword",
                authValues,
                onAccountFieldChange
              )}
            />
            <Button textSize="xs" type="submit" variant="secondary">
              Email sign in
            </Button>
          </form>
          <form className="grid gap-grid-xs" onSubmit={onRegisterSubmit}>
            <InputBox
              autoComplete="email"
              label="New account email"
              name="registerEmail"
              textSize="sm"
              type="email"
              {...accountInputValueProps(
                "registerEmail",
                authValues,
                onAccountFieldChange
              )}
            />
            <InputBox
              autoComplete="new-password"
              label="New account password"
              name="registerPassword"
              textSize="sm"
              type="password"
              {...accountInputValueProps(
                "registerPassword",
                authValues,
                onAccountFieldChange
              )}
            />
            <Button textSize="xs" type="submit" variant="secondary">
              Create account
            </Button>
          </form>
          <div className="grid content-start gap-grid-xs">
            <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
              Google
            </p>
            <ButtonLink
              href="/api/oauth/google/sessions?returnTo=/checkout"
              textSize="xs"
              variant="secondary"
            >
              Continue with Google
            </ButtonLink>
          </div>
        </div>
      </section>

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
        <div className="grid gap-grid-sm border border-brand-border p-grid-sm">
          <Checkbox
            error={fieldErrors.privacyAcknowledged}
            label="I agree JRW can use these details for checkout, delivery, order status, and support."
            name="privacyAcknowledged"
            required
            size="sm"
            {...checkboxValueProps(detailsValues, onDetailsChange)}
          />
          <div className="flex flex-wrap gap-grid-xs">
            <Button
              disabled={detailsStatus === "reserved"}
              loading={detailsStatus === "saving" || detailsStatus === "reserving"}
              loadingLabel={
                detailsStatus === "reserving"
                  ? "Reserving items"
                  : "Saving details"
              }
              textSize="xs"
              type="submit"
              variant="primary"
            >
              {detailsStatus === "reserved" ? "Items reserved" : "Save details"}
            </Button>
            {detailsStatus === "reserving" ? (
              <p className="m-0 self-center text-sm font-bold text-brand-muted">
                Reserving items for payment.
              </p>
            ) : null}
            {detailsStatus === "reserved" ? (
              <p className="m-0 self-center text-sm font-bold text-brand-muted">
                Items reserved. Payment is next.
              </p>
            ) : null}
            {detailsStatus === "saved" ? (
              <p className="m-0 self-center text-sm font-bold text-brand-muted">
                Details saved for checkout.
              </p>
            ) : null}
          </div>
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
  const [authValues, setAuthValues] = React.useState<AccountAssistValues>(
    emptyAccountAssistValues
  );
  const [fieldErrors, setFieldErrors] =
    React.useState<CheckoutDetailsFieldErrors>({});
  const [formMessage, setFormMessage] = React.useState<string | null>(null);
  const [accountMessage, setAccountMessage] = React.useState<string | null>(
    null
  );
  const [detailsStatus, setDetailsStatus] = React.useState<
    CheckoutDetailsStatus
  >("idle");
  const formSummaryRef = React.useRef<HTMLDivElement | null>(null);

  const validateDirectCheckout = React.useCallback(async (): Promise<
    | { kind: "valid"; state: CartState }
    | { kind: "blocked" | "failure" }
  > => {
    const requestFingerprint = cartValidationFingerprint(state);
    lastValidationFingerprintRef.current = requestFingerprint;

    if (state.items.length === 0) {
      setValidationStatus("blocked");
      setValidationMessage("Add an item before checkout.");
      return { kind: "blocked" };
    }

    setValidationStatus("pending");
    setValidationMessage("Checking cart...");
    const requestState = state;
    const result = await validateCartBeforeCheckout(requestState);

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
      setAccountMessage(
        "Account is signed in but not verified. Checkout can continue with entered details."
      );
      return;
    }

    const profileResult = await fetchCurrentCustomerProfile();

    if (profileResult.kind === "loaded") {
      setDetailsValues((current) =>
        prefillDetailsFromProfile(current, profileResult.profile)
      );
      setAuthValues((current) => ({
        ...current,
        registerEmail: current.registerEmail || profileResult.profile.email,
        signInEmail: current.signInEmail || profileResult.profile.email,
      }));
      setAccountMessage("Signed-in account details loaded where available.");
      return;
    }

    setAccountMessage(profileResult.reason);
  }, []);

  const updateDetailField = React.useCallback(
    (field: keyof CheckoutDetailsFormValues, value: boolean | string) => {
      setDetailsValues((current) => ({ ...current, [field]: value }));
      setFieldErrors((current) => {
        if (!(field in current)) {
          return current;
        }

        const next = { ...current };
        delete next[field];
        return next;
      });
      setDetailsStatus("idle");
    },
    []
  );

  const updateAccountField = React.useCallback(
    (field: keyof AccountAssistValues, value: string) => {
      setAuthValues((current) => ({ ...current, [field]: value }));
    },
    []
  );

  const focusFormSummary = React.useCallback(() => {
    window.setTimeout(() => formSummaryRef.current?.focus(), 0);
  }, []);

  const handleDetailsSubmit = React.useCallback(
    async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
      event.preventDefault();
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
        setDetailsStatus("saved");
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
        setDetailsStatus("reserved");
        setFormMessage(null);
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

      setDetailsStatus("saved");
      setFormMessage(reservationResult.reason);
      focusFormSummary();
    },
    [detailsValues, focusFormSummary, validateDirectCheckout]
  );

  const handleSignInSubmit = React.useCallback(
    async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
      event.preventDefault();
      const result = await signInCustomerForCheckout({
        email: authValues.signInEmail,
        password: authValues.signInPassword,
      });

      if (result.kind === "signed-in") {
        setAccountMessage("Signed in. Loading saved details.");
        await loadCustomerPrefill();
        return;
      }

      setAccountMessage(result.reason);
    },
    [authValues.signInEmail, authValues.signInPassword, loadCustomerPrefill]
  );

  const handleRegisterSubmit = React.useCallback(
    async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
      event.preventDefault();
      const result = await registerCustomerForCheckout({
        email: authValues.registerEmail,
        password: authValues.registerPassword,
      });

      if (result.kind === "created") {
        setDetailsValues((current) => ({
          ...current,
          email: current.email || authValues.registerEmail,
        }));
        setAccountMessage(
          "Account created. Verify email later; checkout can continue here."
        );
        return;
      }

      setAccountMessage(result.reason);
    },
    [authValues.registerEmail, authValues.registerPassword]
  );

  React.useEffect(() => {
    if (lastValidationFingerprintRef.current === cartFingerprint) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void validateDirectCheckout();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [cartFingerprint, validateDirectCheckout]);

  React.useEffect(() => {
    void loadCustomerPrefill();
  }, [loadCustomerPrefill]);

  return (
    <CheckoutDetailsPageView
      accountMessage={accountMessage}
      authValues={authValues}
      detailsStatus={detailsStatus}
      detailsValues={detailsValues}
      fieldErrors={fieldErrors}
      formMessage={formMessage}
      formSummaryRef={formSummaryRef}
      onAccountFieldChange={updateAccountField}
      onDetailsChange={updateDetailField}
      onDetailsSubmit={handleDetailsSubmit}
      onRetryValidation={validateDirectCheckout}
      onRegisterSubmit={handleRegisterSubmit}
      onSignInSubmit={handleSignInSubmit}
      state={state}
      validationMessage={validationMessage}
      validationStatus={validationStatus}
    />
  );
}
