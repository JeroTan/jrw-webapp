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
import { isTrustedPayMongoCheckoutUrl } from "@/domain/payments/paymongo-checkout";
import { formatCatalogPrice } from "@/domain/products/price-format";
import type { ApiResponse } from "@/lib/api/response";
import {
  getCartSnapshot,
  markCartItemAvailabilityInStore,
  replaceCartItemInStore,
} from "./store";

export type CartRefreshResult =
  | { detail: PublicCatalogDetailResult; kind: "ok" }
  | { kind: "unavailable"; reason: string }
  | { kind: "stale"; reason: string };

type PublicCatalogDetailEnvelope = ApiResponse<PublicCatalogDetailResult>;
type CheckoutCartValidationEnvelope =
  ApiResponse<CheckoutCartValidationSummary>;

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
    attemptToken: string;
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

export type CheckoutReservationResult = {
  attempt: {
    attemptId: string;
    status: "INVENTORY_RESERVED";
  };
  reservation: {
    expiresAt: string;
    reservationId: string;
    status: "ACTIVE";
  };
  cart: CheckoutCartValidationSummary;
  next: {
    payMongoCreationRequired: true;
    paymentAllowed: true;
  };
};

export type CheckoutReservationClientResult =
  | (CheckoutReservationResult & { kind: "reserved" })
  | { kind: "changed"; reason: string; summary: CheckoutCartValidationSummary }
  | { kind: "blocked"; reason: string; summary: CheckoutCartValidationSummary }
  | { kind: "conflict"; reason: string }
  | { kind: "denied"; reason: string }
  | { kind: "failure"; reason: string };

export type CheckoutPaymentResult = {
  attempt: {
    attemptId: string;
    status: "PAYMENT_CREATED";
  };
  reservation: {
    expiresAt: string;
    reservationId: string;
    status: "ACTIVE";
  };
  payment: {
    amountCentavos: number;
    currency: "PHP";
    paymentId: string;
    provider: "PAYMONGO";
    providerCheckoutSessionId: string;
    status: "PAYMENT_PENDING";
  };
  handoff: {
    checkoutUrl: string;
    redirectMethod: "browser";
  };
  next: {
    orderCreated: false;
    receiptAvailable: false;
    webhookRequired: true;
  };
};

export type CheckoutPaymentClientResult =
  | (CheckoutPaymentResult & { checkoutUrl: string; kind: "handoff" })
  | { kind: "conflict"; reason: string }
  | { kind: "denied"; reason: string }
  | { kind: "failure"; networkFailure?: boolean; reason: string };

export type PaymentReturnPublicStatus =
  | "cancelled"
  | "confirmed"
  | "expired"
  | "failed"
  | "pending"
  | "refunded"
  | "unknown";

export type PaymentReturnStatusResult = {
  canRetry: boolean;
  email?: {
    status: "FAILED" | "PENDING" | "SENT" | "SENDING";
  };
  next: {
    refreshAllowed: boolean;
    retryCheckoutAllowed: boolean;
  };
  order?: {
    orderId: string;
    orderNumber: string;
    totalCentavos: number;
  };
  payment: {
    paymentId: string;
    status: string;
  };
  receipt?: {
    fulfillmentStatus: {
      label: string;
      value:
        | "CANCELLED"
        | "DELIVERED"
        | "ORDER_PLACED"
        | "PROCESSING"
        | "SHIPPED"
        | null;
    };
    guestAccountCta: {
      eligible: boolean;
      href?: string;
      label?: string;
      message?: string;
    };
    inboxReminder?: string;
    items: Array<{
      lineTotalCentavos: number;
      name: string;
      productId: string | null;
      quantity: number;
      unitAmountCentavos: number;
      variantId: string | null;
      variantLabel: string | null;
    }>;
    orderNumber?: string;
    paymentStatus: {
      label: string;
      value: PaymentReturnPublicStatus;
    };
    source: "order" | "payment";
    totals: {
      currency: "PHP";
      subtotalCentavos: number;
      totalCentavos: number;
    };
  };
  status: PaymentReturnPublicStatus;
};

export type PaymentReturnStatusClientResult =
  | { kind: "loaded"; status: PaymentReturnStatusResult }
  | { kind: "missing"; reason: string }
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
type CheckoutReservationEnvelope = ApiResponse<CheckoutReservationResult>;
type CheckoutPaymentEnvelope = ApiResponse<CheckoutPaymentResult>;
type PaymentReturnStatusEnvelope = ApiResponse<PaymentReturnStatusResult>;

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
        variant.unavailableReason ??
        "Selected option is unavailable right now.",
    };
  }

  replaceCartItemInStore(
    cartItemInputFromDetail(detail, variant, item.quantity)
  );
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

function isValidationSummary(
  value: unknown
): value is CheckoutCartValidationSummary {
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

function isCustomerSessionSummary(
  value: unknown
): value is CustomerSessionSummary {
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

function isCheckoutDetailsResult(
  value: unknown
): value is CheckoutDetailsResult {
  if (
    !isRecord(value) ||
    !isRecord(value.details) ||
    !isRecord(value.customer)
  ) {
    return false;
  }

  return (
    isRecord(value.attempt) &&
    typeof value.attempt.attemptId === "string" &&
    typeof value.attempt.attemptToken === "string" &&
    value.attempt.status === "DETAILS_CAPTURED" &&
    typeof value.details.email === "string" &&
    typeof value.details.fullName === "string" &&
    (value.customer.customerId === null ||
      typeof value.customer.customerId === "string") &&
    (value.customer.mode === "guest" || value.customer.mode === "signed-in")
  );
}

function isCheckoutReservationResult(
  value: unknown
): value is CheckoutReservationResult {
  return (
    isRecord(value) &&
    isRecord(value.attempt) &&
    isRecord(value.reservation) &&
    isRecord(value.next) &&
    isValidationSummary(value.cart) &&
    typeof value.attempt.attemptId === "string" &&
    value.attempt.status === "INVENTORY_RESERVED" &&
    typeof value.reservation.reservationId === "string" &&
    value.reservation.status === "ACTIVE" &&
    typeof value.reservation.expiresAt === "string" &&
    value.next.paymentAllowed === true &&
    value.next.payMongoCreationRequired === true
  );
}

function isCheckoutPaymentResult(
  value: unknown
): value is CheckoutPaymentResult {
  return (
    isRecord(value) &&
    isRecord(value.attempt) &&
    isRecord(value.reservation) &&
    isRecord(value.payment) &&
    isRecord(value.handoff) &&
    isRecord(value.next) &&
    typeof value.attempt.attemptId === "string" &&
    value.attempt.status === "PAYMENT_CREATED" &&
    typeof value.reservation.reservationId === "string" &&
    value.reservation.status === "ACTIVE" &&
    typeof value.reservation.expiresAt === "string" &&
    typeof value.payment.amountCentavos === "number" &&
    Number.isSafeInteger(value.payment.amountCentavos) &&
    value.payment.amountCentavos > 0 &&
    value.payment.currency === "PHP" &&
    typeof value.payment.paymentId === "string" &&
    value.payment.provider === "PAYMONGO" &&
    typeof value.payment.providerCheckoutSessionId === "string" &&
    value.payment.status === "PAYMENT_PENDING" &&
    isTrustedPayMongoCheckoutUrl(value.handoff.checkoutUrl) &&
    value.handoff.redirectMethod === "browser" &&
    value.next.orderCreated === false &&
    value.next.receiptAvailable === false &&
    value.next.webhookRequired === true
  );
}

function isSafeReceipt(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.totals)) {
    return false;
  }

  const candidate = value as PaymentReturnStatusResult["receipt"];

  return Boolean(
    candidate &&
    Array.isArray(candidate.items) &&
    candidate.items.every(
      (item) =>
        isRecord(item) &&
        typeof item.name === "string" &&
        (typeof item.productId === "string" || item.productId === null) &&
        typeof item.quantity === "number" &&
        Number.isSafeInteger(item.quantity) &&
        typeof item.unitAmountCentavos === "number" &&
        Number.isSafeInteger(item.unitAmountCentavos) &&
        typeof item.lineTotalCentavos === "number" &&
        Number.isSafeInteger(item.lineTotalCentavos) &&
        (typeof item.variantId === "string" || item.variantId === null) &&
        (typeof item.variantLabel === "string" || item.variantLabel === null)
    ) &&
    candidate.totals.currency === "PHP" &&
    typeof candidate.totals.subtotalCentavos === "number" &&
    Number.isSafeInteger(candidate.totals.subtotalCentavos) &&
    typeof candidate.totals.totalCentavos === "number" &&
    Number.isSafeInteger(candidate.totals.totalCentavos) &&
    isRecord(candidate.paymentStatus) &&
    typeof candidate.paymentStatus.label === "string" &&
    typeof candidate.paymentStatus.value === "string" &&
    isRecord(candidate.fulfillmentStatus) &&
    typeof candidate.fulfillmentStatus.label === "string" &&
    isRecord(candidate.guestAccountCta) &&
    typeof candidate.guestAccountCta.eligible === "boolean" &&
    (candidate.source === "order" || candidate.source === "payment")
  );
}

function isPaymentReturnStatusResult(
  value: unknown
): value is PaymentReturnStatusResult {
  return (
    isRecord(value) &&
    isRecord(value.payment) &&
    isRecord(value.next) &&
    typeof value.canRetry === "boolean" &&
    typeof value.payment.paymentId === "string" &&
    typeof value.payment.status === "string" &&
    typeof value.next.refreshAllowed === "boolean" &&
    typeof value.next.retryCheckoutAllowed === "boolean" &&
    (!("receipt" in value) || isSafeReceipt(value.receipt)) &&
    (value.status === "cancelled" ||
      value.status === "confirmed" ||
      value.status === "expired" ||
      value.status === "failed" ||
      value.status === "pending" ||
      value.status === "refunded" ||
      value.status === "unknown")
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
        : (line.reason ?? line.availabilityLabel),
    ...(imageAlt ? { imageAlt } : {}),
    ...(imageSrc ? { imageSrc } : {}),
    ...(maxQuantity ? { maxQuantity } : {}),
    priceCentavos: line.priceCentavos,
    priceLabel: line.priceLabel,
    productId: line.productId,
    productName: line.productName,
    productSlug: line.productSlug,
    quantity: line.quantity > 0 ? line.quantity : (fallback?.quantity ?? 1),
    variantId: line.variantId,
    variantLabel: line.variantLabel,
    variantOptions: line.variantOptions,
    variantProductId: line.productId,
  };
}

async function validateCartBeforeCheckoutRequest(
  state: { items: CartItemSnapshot[]; updatedAt: string },
  fetcher: typeof fetch,
  retryAfterRefresh: boolean
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

    if (
      "error" in body &&
      (body.error.code === "CONFLICT_STATE" ||
        body.error.code === "INVENTORY_UNAVAILABLE")
    ) {
      if (retryAfterRefresh) {
        await refreshCartItems(state.items, fetcher);

        return validateCartBeforeCheckoutRequest(
          getCartSnapshot(),
          fetcher,
          false
        );
      }

      return {
        kind: "failure",
        reason: "Cart changed. Check cart again.",
      };
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

export async function validateCartBeforeCheckout(
  state: { items: CartItemSnapshot[]; updatedAt: string },
  fetcher: typeof fetch = fetch
): Promise<CheckoutCartValidationClientResult> {
  return validateCartBeforeCheckoutRequest(state, fetcher, true);
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

function checkoutDetailsFailureReason(
  response: Response,
  body: CheckoutDetailsEnvelope
): string {
  if ("error" in body) {
    switch (body.error.code) {
      case "PROVIDER_UNAVAILABLE":
        return "Checkout service is unavailable. Try again in a moment.";
      case "RATE_LIMITED":
      case "TOO_MANY_REQUESTS":
        return "Too many checkout attempts. Try again in a moment.";
      case "INTERNAL_ERROR":
      case "INTERNAL_SERVER_ERROR":
        return "Checkout had a server issue. Try again in a moment.";
      default:
        break;
    }
  }

  if (response.status >= 500) {
    return "Checkout had a server issue. Try again in a moment.";
  }

  return "Checkout details were not saved. Try again.";
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
      reason: checkoutDetailsFailureReason(response, body),
    };
  } catch {
    return {
      kind: "failure",
      reason: "Checkout service is unavailable. Try again in a moment.",
    };
  }
}

export async function reserveCheckoutInventory(
  input: {
    attemptId: string;
    attemptToken: string;
    state: { items: CartItemSnapshot[]; updatedAt: string };
  },
  fetcher: typeof fetch = fetch
): Promise<CheckoutReservationClientResult> {
  try {
    const response = await fetcher(
      `/api/checkout/attempts/${encodeURIComponent(input.attemptId)}/reservations`,
      {
        body: JSON.stringify({
          attemptToken: input.attemptToken,
          ...cartValidationRequestBody(input.state),
        }),
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      }
    );
    const body = (await response.json()) as CheckoutReservationEnvelope;

    if ("data" in body && isCheckoutReservationResult(body.data)) {
      return { kind: "reserved", ...body.data };
    }

    if ("error" in body) {
      if (
        body.error.code === "CONFLICT_STATE" &&
        isValidationSummary(body.error.details)
      ) {
        return {
          kind: "changed",
          reason: "Review cart updates before payment.",
          summary: body.error.details,
        };
      }

      if (
        body.error.code === "INVENTORY_UNAVAILABLE" &&
        isValidationSummary(body.error.details)
      ) {
        return {
          kind: "blocked",
          reason: "Item is unavailable. Review cart.",
          summary: body.error.details,
        };
      }

      if (body.error.code === "AUTH_FORBIDDEN") {
        return {
          kind: "denied",
          reason: "Checkout session expired. Continue to Payment again.",
        };
      }

      if (body.error.code === "IDEMPOTENCY_CONFLICT") {
        return {
          kind: "conflict",
          reason: "Cart changed. Continue to Payment again after review.",
        };
      }
    }

    return {
      kind: "failure",
      reason: "Could not reserve items. Try again.",
    };
  } catch {
    return {
      kind: "failure",
      reason: "Could not reserve items. Try again.",
    };
  }
}

function checkoutPaymentFailureReason(
  response: Response,
  body: CheckoutPaymentEnvelope
): string {
  if ("error" in body) {
    switch (body.error.code) {
      case "AUTH_FORBIDDEN":
        return "Checkout session expired. Continue to Payment again.";
      case "CONFLICT_STATE":
      case "IDEMPOTENCY_CONFLICT":
        return "Checkout changed. Continue to Payment again after review.";
      case "PAYMENT_FAILED":
        if (
          isRecord(body.error.details) &&
          typeof body.error.details.minimumAmountCentavos === "number" &&
          typeof body.error.details.subtotalCentavos === "number"
        ) {
          return `PayMongo checkout needs at least ${formatCatalogPrice(
            body.error.details.minimumAmountCentavos
          )}. Current cart is ${formatCatalogPrice(
            body.error.details.subtotalCentavos
          )}. Increase quantity or add items before payment.`;
        }

        return "PayMongo could not start payment. Try another method in a moment.";
      case "PROVIDER_UNAVAILABLE":
        return "Payment service is unavailable. Try again in a moment.";
      default:
        break;
    }
  }

  if (response.status >= 500) {
    return "Payment service is unavailable. Try again in a moment.";
  }

  return "Could not start PayMongo checkout. Try again.";
}

export async function createPayMongoPaymentHandoff(
  input: {
    attemptId: string;
    attemptToken: string;
  },
  fetcher: typeof fetch = fetch
): Promise<CheckoutPaymentClientResult> {
  try {
    const response = await fetcher(
      `/api/checkout/attempts/${encodeURIComponent(input.attemptId)}/payments`,
      {
        body: JSON.stringify({
          attemptToken: input.attemptToken,
        }),
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      }
    );
    const body = (await response.json()) as CheckoutPaymentEnvelope;

    if (response.ok && "data" in body && isCheckoutPaymentResult(body.data)) {
      return {
        checkoutUrl: body.data.handoff.checkoutUrl,
        kind: "handoff",
        ...body.data,
      };
    }

    if ("error" in body) {
      if (body.error.code === "AUTH_FORBIDDEN") {
        return {
          kind: "denied",
          reason: checkoutPaymentFailureReason(response, body),
        };
      }

      if (
        body.error.code === "CONFLICT_STATE" ||
        body.error.code === "IDEMPOTENCY_CONFLICT"
      ) {
        return {
          kind: "conflict",
          reason: checkoutPaymentFailureReason(response, body),
        };
      }
    }

    return {
      kind: "failure",
      reason: checkoutPaymentFailureReason(response, body),
    };
  } catch {
    return {
      kind: "failure",
      reason: "Payment service is unavailable. Try again in a moment.",
    };
  }
}

export async function fetchPaymentReturnStatus(
  input: {
    attemptId?: string | null;
    paymentId?: string | null;
    providerCheckoutSessionId?: string | null;
  },
  fetcher: typeof fetch = fetch
): Promise<PaymentReturnStatusClientResult> {
  const params = new URLSearchParams();

  if (input.attemptId) params.set("attemptId", input.attemptId);
  if (input.paymentId) params.set("paymentId", input.paymentId);
  if (input.providerCheckoutSessionId) {
    params.set("providerCheckoutSessionId", input.providerCheckoutSessionId);
  }

  if (Array.from(params).length === 0) {
    return {
      kind: "missing",
      reason: "Checkout status link is missing payment reference.",
    };
  }

  try {
    const response = await fetcher(`/api/checkout/payment-return?${params}`, {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });
    const body = (await response.json()) as PaymentReturnStatusEnvelope;

    if ("data" in body && isPaymentReturnStatusResult(body.data)) {
      return { kind: "loaded", status: body.data };
    }

    if ("error" in body && body.error.code === "RESOURCE_NOT_FOUND") {
      return {
        kind: "missing",
        reason: "Checkout status is not available yet.",
      };
    }

    return {
      kind: "failure",
      reason: response.ok
        ? "Could not read payment status."
        : "Could not read payment status.",
    };
  } catch {
    return {
      kind: "failure",
      reason: "Payment status is unavailable. Try again in a moment.",
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
