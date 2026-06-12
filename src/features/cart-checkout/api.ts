import type {
  CheckoutCartValidationSummary,
  ValidatedCartLine,
} from "@/domain/checkout/cart-validation";
import type {
  PublicCatalogDetailResult,
  PublicCatalogDetailVariant,
} from "@/domain/products/public-types";
import type {
  CartItemSnapshot,
  CreateCartItemSnapshotInput,
} from "@/domain/checkout/cart";
import type { ApiResponse } from "@/lib/api/response";
import {
  markCartItemAvailabilityInStore,
  replaceCartItemInStore,
} from "./store";

export type CartRefreshResult =
  | { detail: PublicCatalogDetailResult; kind: "ok" }
  | { kind: "unavailable"; reason: string }
  | { kind: "stale"; reason: string };

type PublicCatalogDetailEnvelope = ApiResponse<PublicCatalogDetailResult>;
type CheckoutCartValidationEnvelope = ApiResponse<CheckoutCartValidationSummary>;

export type CheckoutDetailsFormValues = {
  barangay: string;
  cityProvince: string;
  email: string;
  fullName: string;
  phone: string;
  postalCode: string;
  privacyAcknowledged: boolean;
  streetAddress: string;
};

export type CheckoutContactSnapshot = CheckoutDetailsFormValues & {
  firstName: string | null;
  lastName: string | null;
  privacyAcknowledged: true;
};

export type CheckoutDetailsResult = {
  attempt: {
    attemptId: string;
    status: "DETAILS_CAPTURED";
  };
  customer: {
    customerId: string | null;
    mode: "guest" | "signed-in";
  };
  details: CheckoutContactSnapshot;
  next: {
    cartValidationRequired: true;
    paymentAllowed: false;
  };
};

export type CheckoutDetailsClientResult =
  | (CheckoutDetailsResult & { kind: "saved" })
  | { kind: "invalid"; reason: string; reasons: string[] }
  | { kind: "failure"; reason: string };

export type CustomerSessionSummary = {
  authenticated: boolean;
  actor: null | {
    id: string;
    role: "CUSTOMER" | "PROSPECT" | "ADMIN" | "SUPER_ADMIN";
    accountStatus: {
      approved: boolean;
      emailVerified: boolean;
      status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    };
  };
  session: null | {
    expiresAt: string;
  };
};

export type CustomerProfileSummary = {
  avatarUrl: string | null;
  barangay: string | null;
  cityProvince: string | null;
  displayName: string | null;
  email: string;
  emailMarketingOptIn: boolean;
  emailVerified: boolean;
  firstName: string | null;
  id: string;
  lastName: string | null;
  phone: string | null;
  postalCode: string | null;
  role: "CUSTOMER";
  streetAddress: string | null;
};

type CustomerSessionEnvelope = ApiResponse<CustomerSessionSummary>;
type CustomerProfileEnvelope = ApiResponse<CustomerProfileSummary>;
type CheckoutDetailsEnvelope = ApiResponse<CheckoutDetailsResult>;

export type CheckoutCartValidationClientResult =
  | { kind: "valid"; summary: CheckoutCartValidationSummary }
  | { kind: "changed"; summary: CheckoutCartValidationSummary }
  | { kind: "blocked"; summary: CheckoutCartValidationSummary }
  | { kind: "failure"; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function variantImageAlt(
  detail: PublicCatalogDetailResult,
  variant: PublicCatalogDetailVariant
): string | undefined {
  if (variant.imageSrc) {
    return (
      detail.gallery.find((image) => image.src === variant.imageSrc)?.alt ??
      detail.product.primaryImage?.alt ??
      detail.product.name
    );
  }

  return detail.product.primaryImage?.alt ?? detail.product.name;
}

export function cartItemInputFromDetail(
  detail: PublicCatalogDetailResult,
  variant: PublicCatalogDetailVariant,
  quantity: number | string = 1
): CreateCartItemSnapshotInput {
  return {
    availabilityText: variant.availability.label,
    imageAlt: variantImageAlt(detail, variant),
    imageSrc: variant.imageSrc ?? detail.product.primaryImage?.src,
    maxQuantity: variant.maxQuantity,
    priceCentavos: variant.priceCentavos,
    priceLabel: variant.priceLabel,
    productId: detail.product.id,
    productName: detail.product.name,
    productSlug: detail.product.slug,
    quantity,
    variantId: variant.id,
    variantLabel: variant.label,
    variantOptions: variant.optionValues,
    variantProductId: variant.productId,
  };
}

export async function fetchCartProductDetail(
  slug: string,
  fetcher: typeof fetch = fetch
): Promise<CartRefreshResult> {
  try {
    const response = await fetcher(
      `/api/storefront/catalog/products/${encodeURIComponent(slug)}`,
      {
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (response.status === 404) {
      return {
        kind: "unavailable",
        reason: "Product is no longer available.",
      };
    }

    if (!response.ok) {
      return {
        kind: "stale",
        reason: "Could not verify this item. Try refresh.",
      };
    }

    const body = (await response.json()) as PublicCatalogDetailEnvelope;

    if ("data" in body) {
      return { detail: body.data, kind: "ok" };
    }

    return {
      kind: "stale",
      reason: "Could not verify this item. Try refresh.",
    };
  } catch {
    return {
      kind: "stale",
      reason: "Could not verify this item. Try refresh.",
    };
  }
}

export function refreshCartItemWithDetail(
  item: CartItemSnapshot,
  detail: PublicCatalogDetailResult
): CartRefreshResult {
  if (detail.product.id !== item.productId) {
    return {
      kind: "unavailable",
      reason: "Product is no longer available.",
    };
  }

  const variant = detail.variants.find(
    (candidate) => candidate.id === item.variantId
  );

  if (!variant) {
    return {
      kind: "unavailable",
      reason: "Selected option is no longer available.",
    };
  }

  if (variant.disabled || !variant.availability.inStock) {
    return {
      kind: "unavailable",
      reason:
        variant.unavailableReason ?? "Selected option is unavailable right now.",
    };
  }

  replaceCartItemInStore(cartItemInputFromDetail(detail, variant, item.quantity));
  return { detail, kind: "ok" };
}

export async function refreshCartItem(
  item: CartItemSnapshot,
  fetcher: typeof fetch = fetch
): Promise<CartRefreshResult> {
  const result = await fetchCartProductDetail(item.productSlug, fetcher);

  if (result.kind === "ok") {
    const detailResult = refreshCartItemWithDetail(item, result.detail);

    if (detailResult.kind !== "ok") {
      markCartItemAvailabilityInStore(
        item.productId,
        item.variantId,
        detailResult.kind === "unavailable" ? "UNAVAILABLE" : "STALE",
        detailResult.reason
      );
    }

    return detailResult;
  }

  markCartItemAvailabilityInStore(
    item.productId,
    item.variantId,
    result.kind === "unavailable" ? "UNAVAILABLE" : "STALE",
    result.reason
  );

  return result;
}

export async function refreshCartItems(
  items: CartItemSnapshot[],
  fetcher: typeof fetch = fetch
) {
  for (const item of items) {
    await refreshCartItem(item, fetcher);
  }
}

function cartValidationRequestBody(state: {
  items: CartItemSnapshot[];
  updatedAt: string;
}) {
  return {
    cartUpdatedAt: state.updatedAt,
    items: state.items.map((item) => ({
      priceCentavos: item.priceCentavos,
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      quantity: item.quantity,
      variantId: item.variantId,
      variantLabel: item.variantLabel,
      variantOptions: item.variantOptions,
    })),
  };
}

function isValidationSummary(value: unknown): value is CheckoutCartValidationSummary {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<CheckoutCartValidationSummary>;
  return (
    Array.isArray(candidate.items) &&
    Array.isArray(candidate.issues) &&
    (candidate.status === "VALID" ||
      candidate.status === "CHANGED" ||
      candidate.status === "BLOCKED")
  );
}

function isCustomerSessionSummary(value: unknown): value is CustomerSessionSummary {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.authenticated === "boolean";
}

function isCustomerProfile(value: unknown): value is CustomerProfileSummary {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.email === "string" &&
    value.role === "CUSTOMER" &&
    typeof value.emailVerified === "boolean"
  );
}

function isCheckoutDetailsResult(value: unknown): value is CheckoutDetailsResult {
  if (!isRecord(value) || !isRecord(value.details) || !isRecord(value.customer)) {
    return false;
  }

  return (
    isRecord(value.attempt) &&
    typeof value.attempt.attemptId === "string" &&
    value.attempt.status === "DETAILS_CAPTURED" &&
    typeof value.details.email === "string" &&
    typeof value.details.fullName === "string" &&
    (value.customer.customerId === null ||
      typeof value.customer.customerId === "string") &&
    (value.customer.mode === "guest" || value.customer.mode === "signed-in")
  );
}

function validationResultFromSummary(
  summary: CheckoutCartValidationSummary
): CheckoutCartValidationClientResult {
  switch (summary.status) {
    case "VALID":
      return { kind: "valid", summary };
    case "CHANGED":
      return { kind: "changed", summary };
    case "BLOCKED":
      return { kind: "blocked", summary };
  }
}

export function cartItemInputFromValidatedLine(
  line: ValidatedCartLine,
  fallback?: CartItemSnapshot
): CreateCartItemSnapshotInput {
  const imageAlt = line.imageAlt ?? fallback?.imageAlt;
  const imageSrc = line.imageSrc ?? fallback?.imageSrc;
  const maxQuantity =
    line.maxQuantity > 0 ? line.maxQuantity : fallback?.maxQuantity;

  return {
    availabilityText:
      line.availabilityStatus === "ACTIVE"
        ? line.availabilityLabel
        : line.reason ?? line.availabilityLabel,
    ...(imageAlt ? { imageAlt } : {}),
    ...(imageSrc ? { imageSrc } : {}),
    ...(maxQuantity ? { maxQuantity } : {}),
    priceCentavos: line.priceCentavos,
    priceLabel: line.priceLabel,
    productId: line.productId,
    productName: line.productName,
    productSlug: line.productSlug,
    quantity: line.quantity > 0 ? line.quantity : fallback?.quantity ?? 1,
    variantId: line.variantId,
    variantLabel: line.variantLabel,
    variantOptions: line.variantOptions,
    variantProductId: line.productId,
  };
}

export async function validateCartBeforeCheckout(
  state: { items: CartItemSnapshot[]; updatedAt: string },
  fetcher: typeof fetch = fetch
): Promise<CheckoutCartValidationClientResult> {
  try {
    const response = await fetcher("/api/checkout/cart-validations", {
      body: JSON.stringify(cartValidationRequestBody(state)),
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = (await response.json()) as CheckoutCartValidationEnvelope;

    if ("data" in body && isValidationSummary(body.data)) {
      return validationResultFromSummary(body.data);
    }

    if ("error" in body && isValidationSummary(body.error.details)) {
      return validationResultFromSummary(body.error.details);
    }

    return {
      kind: "failure",
      reason: response.ok
        ? "Could not verify cart. Try again."
        : "Could not verify cart. Try again.",
    };
  } catch {
    return {
      kind: "failure",
      reason: "Could not verify cart. Try again.",
    };
  }
}

export async function fetchCustomerCheckoutSession(
  fetcher: typeof fetch = fetch
): Promise<
  | { kind: "loaded"; session: CustomerSessionSummary }
  | { kind: "failure"; reason: string }
> {
  try {
    const response = await fetcher("/api/customer/auth/session", {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });
    const body = (await response.json()) as CustomerSessionEnvelope;

    if ("data" in body && isCustomerSessionSummary(body.data)) {
      return { kind: "loaded", session: body.data };
    }

    return { kind: "failure", reason: "Could not check account session." };
  } catch {
    return { kind: "failure", reason: "Could not check account session." };
  }
}

export async function fetchCurrentCustomerProfile(
  fetcher: typeof fetch = fetch
): Promise<
  | { kind: "loaded"; profile: CustomerProfileSummary }
  | { kind: "forbidden"; reason: string }
  | { kind: "failure"; reason: string }
> {
  try {
    const response = await fetcher("/api/customers/me", {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });
    const body = (await response.json()) as CustomerProfileEnvelope;

    if ("data" in body && isCustomerProfile(body.data)) {
      return { kind: "loaded", profile: body.data };
    }

    if ("error" in body && response.status === 403) {
      return {
        kind: "forbidden",
        reason: "Account details are unavailable; checkout can continue here.",
      };
    }

    return { kind: "failure", reason: "Could not load account details." };
  } catch {
    return { kind: "failure", reason: "Could not load account details." };
  }
}

function checkoutDetailsRequestBody(details: CheckoutDetailsFormValues) {
  return {
    barangay: details.barangay,
    cityProvince: details.cityProvince,
    email: details.email,
    fullName: details.fullName,
    phone: details.phone,
    postalCode: details.postalCode,
    privacyAcknowledged: details.privacyAcknowledged,
    streetAddress: details.streetAddress,
  };
}

function safeReasonsFromErrorDetails(details: unknown): string[] {
  if (!isRecord(details) || !Array.isArray(details.reasons)) {
    return [];
  }

  return details.reasons.filter(
    (reason): reason is string => typeof reason === "string"
  );
}

export async function submitCheckoutDetails(
  details: CheckoutDetailsFormValues,
  fetcher: typeof fetch = fetch
): Promise<CheckoutDetailsClientResult> {
  try {
    const response = await fetcher("/api/checkout/details", {
      body: JSON.stringify(checkoutDetailsRequestBody(details)),
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = (await response.json()) as CheckoutDetailsEnvelope;

    if ("data" in body && isCheckoutDetailsResult(body.data)) {
      return {
        kind: "saved",
        ...body.data,
      };
    }

    if ("error" in body && body.error.code === "VALIDATION_FAILED") {
      return {
        kind: "invalid",
        reason: "Complete required checkout details.",
        reasons: safeReasonsFromErrorDetails(body.error.details),
      };
    }

    return {
      kind: "failure",
      reason: "Could not save checkout details. Try again.",
    };
  } catch {
    return {
      kind: "failure",
      reason: "Could not save checkout details. Try again.",
    };
  }
}

export async function signInCustomerForCheckout(
  input: { email: string; password: string },
  fetcher: typeof fetch = fetch
): Promise<{ kind: "signed-in" } | { kind: "failure"; reason: string }> {
  try {
    const response = await fetcher("/api/customer/auth/sessions", {
      body: JSON.stringify(input),
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (response.ok) {
      return { kind: "signed-in" };
    }

    return {
      kind: "failure",
      reason: "Sign in did not change checkout. Continue as guest.",
    };
  } catch {
    return {
      kind: "failure",
      reason: "Sign in did not change checkout. Continue as guest.",
    };
  }
}

export async function registerCustomerForCheckout(
  input: { email: string; password: string },
  fetcher: typeof fetch = fetch
): Promise<{ kind: "created" } | { kind: "failure"; reason: string }> {
  try {
    const response = await fetcher("/api/customers", {
      body: JSON.stringify(input),
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (response.ok) {
      return { kind: "created" };
    }

    return {
      kind: "failure",
      reason: "Account was not created. Checkout can continue as guest.",
    };
  } catch {
    return {
      kind: "failure",
      reason: "Account was not created. Checkout can continue as guest.",
    };
  }
}
