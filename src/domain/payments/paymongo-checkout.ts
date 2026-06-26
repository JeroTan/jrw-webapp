import type { ErrorCodeType } from "@/utils/general/error";

export const CHECKOUT_PAYMENT_STATUS = [
  "PAYMENT_PENDING",
  "PAYMENT_FAILED",
  "PAYMENT_PAID",
  "PAYMENT_EXPIRED",
  "PAYMENT_CANCELLED",
  "PAYMENT_REFUNDED",
  "UNKNOWN",
] as const;

export type CheckoutPaymentStatus = (typeof CHECKOUT_PAYMENT_STATUS)[number];

export type CheckoutPaymentAttemptStatus =
  | "DETAILS_CAPTURED"
  | "INVENTORY_RESERVED"
  | "PAYMENT_CREATED"
  | "PAYMENT_CREATION_FAILED"
  | "RESERVATION_FAILED"
  | "UNKNOWN";

export type CheckoutPaymentExistingPayment = {
  paymentId: string;
  reservationId: string;
  status: CheckoutPaymentStatus;
};

export type CheckoutPaymentCreationDecision =
  | { decision: "create" }
  | { decision: "reuse" }
  | { code: ErrorCodeType; decision: "reject" };

export type CheckoutPaymentReservationItem = {
  name?: string | null;
  priceCentavos: number;
  productId: string | null;
  quantity: number;
  reservationMode: "PREORDER" | "STOCK";
  variantId: string | null;
};

export type CheckoutPaymentReservation = {
  checkoutAttemptId: string;
  expiresAt: string;
  id: string;
  items: readonly CheckoutPaymentReservationItem[];
  status: "ACTIVE" | "EXPIRED" | "FAILED" | "RELEASED";
  subtotalCentavos: number;
};

export type PayMongoCheckoutSessionPayload = {
  data: {
    attributes: {
      cancel_url: string;
      line_items: ReadonlyArray<{
        amount: number;
        currency: "PHP";
        name: string;
        quantity: number;
      }>;
      metadata: Record<string, string>;
      payment_method_types: readonly string[];
      reference_number: string;
      send_email_receipt: boolean;
      success_url: string;
    };
  };
};

export type BuildPayMongoCheckoutSessionPayloadInput = {
  attemptId: string;
  cancelUrl: string;
  currency?: "PHP";
  metadata: Record<string, unknown>;
  paymentMethods: readonly string[];
  referenceNumber: string;
  reservation: CheckoutPaymentReservation;
  sendEmailReceipt: boolean;
  successUrl: string;
};

const DEFAULT_PAYMONGO_PAYMENT_METHODS = ["card", "gcash", "qrph"] as const;

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isTrustedPayMongoCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "checkout.paymongo.com" &&
      url.port === "" &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

function safeLineItemName(item: CheckoutPaymentReservationItem): string {
  const explicitName = cleanString(item.name);

  if (explicitName) {
    return explicitName.slice(0, 255);
  }

  const productId = cleanString(item.productId);
  const variantId = cleanString(item.variantId);

  return [productId || "Product", variantId || "Variant"]
    .filter(Boolean)
    .join(" - ")
    .slice(0, 255);
}

function metadataStringMap(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata)
      .map(([key, value]) => [cleanString(key), cleanString(value)] as const)
      .filter(([key, value]) => key.length > 0 && value.length > 0)
  );
}

function parseBaseUrl(appBaseUrl: string) {
  try {
    return new URL(appBaseUrl);
  } catch {
    return new URL("http://localhost:4321");
  }
}

export function normalizePayMongoPaymentMethods(
  value?: readonly string[] | string | null
): string[] {
  const methods = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : DEFAULT_PAYMONGO_PAYMENT_METHODS;
  const normalized = methods
    .map((method) => cleanString(method).toLowerCase())
    .filter((method) => method.length > 0);
  const unique = Array.from(new Set(normalized));

  return unique.length > 0 ? unique : [...DEFAULT_PAYMONGO_PAYMENT_METHODS];
}

export function buildPayMongoReturnUrls(input: {
  appBaseUrl: string;
  attemptId?: string;
}) {
  const baseUrl = parseBaseUrl(input.appBaseUrl);
  const successUrl = new URL("/checkout/payment-return", baseUrl);

  if (input.attemptId) {
    successUrl.searchParams.set("attemptId", input.attemptId);
  }

  return {
    cancelUrl: new URL("/checkout", baseUrl).toString(),
    successUrl: successUrl.toString(),
  };
}

export function buildPayMongoCheckoutSessionPayload(
  input: BuildPayMongoCheckoutSessionPayloadInput
): PayMongoCheckoutSessionPayload {
  if (
    input.reservation.items.some(
      (item) =>
        !Number.isSafeInteger(item.priceCentavos) ||
        item.priceCentavos < 0 ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1
    )
  ) {
    throw new Error("INVALID_PAYMONGO_LINE_ITEM");
  }

  return {
    data: {
      attributes: {
        cancel_url: input.cancelUrl,
        line_items: input.reservation.items.map((item) => ({
          amount: item.priceCentavos,
          currency: input.currency ?? "PHP",
          name: safeLineItemName(item),
          quantity: item.quantity,
        })),
        metadata: metadataStringMap(input.metadata),
        payment_method_types: normalizePayMongoPaymentMethods(
          input.paymentMethods
        ),
        reference_number: input.referenceNumber,
        send_email_receipt: input.sendEmailReceipt,
        success_url: input.successUrl,
      },
    },
  };
}

export function decideCheckoutPaymentCreation(input: {
  attemptStatus: CheckoutPaymentAttemptStatus;
  existingPayment: CheckoutPaymentExistingPayment | null;
  now: string;
  reservationExpiresAt: string;
  reservationId: string;
  reservationStatus: CheckoutPaymentReservation["status"];
}): CheckoutPaymentCreationDecision {
  if (input.reservationStatus !== "ACTIVE") {
    return { code: "CONFLICT_STATE", decision: "reject" };
  }

  const expiresAt = Date.parse(input.reservationExpiresAt);
  const now = Date.parse(input.now);

  if (
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(now) ||
    expiresAt <= now
  ) {
    return { code: "CONFLICT_STATE", decision: "reject" };
  }

  if (input.existingPayment) {
    return input.existingPayment.status === "PAYMENT_PENDING" &&
      input.existingPayment.reservationId === input.reservationId
      ? { decision: "reuse" }
      : { code: "IDEMPOTENCY_CONFLICT", decision: "reject" };
  }

  if (input.attemptStatus !== "INVENTORY_RESERVED") {
    return { code: "CONFLICT_STATE", decision: "reject" };
  }

  return { decision: "create" };
}
