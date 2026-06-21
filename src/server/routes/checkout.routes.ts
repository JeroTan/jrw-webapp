import { t } from "elysia";
import { STOREFRONT_CART_LINE_ITEM_MAX } from "@/domain/checkout/cart-validation";
import {
  SNAPSHOT_VARIANT_OPTION_MAX_ITEMS,
  SNAPSHOT_VARIANT_OPTION_TEXT_MAX_LENGTH,
} from "@/domain/snapshots/schemas";
import { openApiErrorResponses, tboxApiSuccess } from "@/lib/typebox/api";
import { CheckoutController } from "@/server/controllers/CheckoutController";
import type { RequestContextDecorations } from "@/server/context/request-context";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createCheckoutRepositories } from "@/server/repositories/CheckoutRepository";
import {
  CheckoutService,
  type CheckoutPaymentExecutor,
  type CheckoutPaymentResult,
  type CheckoutPaymentServiceInput,
  type CheckoutReservationServiceInput,
} from "@/server/services/CheckoutService";
import type { OperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
import { isTrustedPayMongoCheckoutUrl } from "@/domain/payments/paymongo-checkout";
import { PayMongoClient } from "@/lib/paymongo/PayMongoClient";
import { GeneralError, type ErrorCodeType } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";
import type { CheckoutReservationResponse } from "@/domain/checkout/inventory-reservation";
import type { AnyElysia } from "elysia";

export type CheckoutControllerFactoryInput = {
  request: Request;
  requestId: string;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
};

export type CheckoutRoutesOptions = {
  controllerFactory?: (
    input: CheckoutControllerFactoryInput
  ) => CheckoutController;
  operationalLogger?: OperationalLogger;
};

const tboxCheckoutVariantOption = t.Object({
  group: t.String({
    minLength: 1,
    maxLength: SNAPSHOT_VARIANT_OPTION_TEXT_MAX_LENGTH,
  }),
  name: t.String({
    minLength: 1,
    maxLength: SNAPSHOT_VARIANT_OPTION_TEXT_MAX_LENGTH,
  }),
});

const tboxCheckoutCartValidationItem = t.Object(
  {
    priceCentavos: t.Integer({ minimum: 0 }),
    productId: t.String({ minLength: 1, maxLength: 128 }),
    productName: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
    productSlug: t.String({ minLength: 1, maxLength: 160 }),
    quantity: t.Integer({ minimum: 1, maximum: 99 }),
    variantId: t.String({ minLength: 1, maxLength: 128 }),
    variantLabel: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
    variantOptions: t.Optional(
      t.Array(tboxCheckoutVariantOption, {
        maxItems: SNAPSHOT_VARIANT_OPTION_MAX_ITEMS,
      })
    ),
  },
  { additionalProperties: false }
);

const tboxCheckoutCartValidationBody = t.Object(
  {
    cartUpdatedAt: t.Optional(t.String()),
    items: t.Array(tboxCheckoutCartValidationItem, {
      maxItems: STOREFRONT_CART_LINE_ITEM_MAX,
      minItems: 1,
    }),
  },
  { additionalProperties: false }
);

const tboxCheckoutCartValidationIssueCode = t.Union([
  t.Literal("CART_EMPTY"),
  t.Literal("ITEM_INVALID"),
  t.Literal("PRODUCT_UNAVAILABLE"),
  t.Literal("VARIANT_UNAVAILABLE"),
  t.Literal("PRICE_CHANGED"),
  t.Literal("QUANTITY_REDUCED"),
  t.Literal("QUANTITY_UNAVAILABLE"),
  t.Literal("PRODUCT_VARIANT_MISMATCH"),
]);

const tboxCheckoutCartValidationIssue = t.Object({
  code: tboxCheckoutCartValidationIssueCode,
  message: t.String(),
  productId: t.Optional(t.String()),
  variantId: t.Optional(t.String()),
});

const tboxCheckoutCartLine = t.Object({
  availabilityLabel: t.String(),
  availabilityStatus: t.Union([
    t.Literal("ACTIVE"),
    t.Literal("STALE"),
    t.Literal("UNAVAILABLE"),
  ]),
  imageAlt: t.Optional(t.String()),
  imageSrc: t.Optional(t.String()),
  lineSubtotalCentavos: t.Integer({ minimum: 0 }),
  lineSubtotalLabel: t.String(),
  maxQuantity: t.Integer({ minimum: 0, maximum: 99 }),
  priceCentavos: t.Integer({ minimum: 0 }),
  priceLabel: t.String(),
  productId: t.String(),
  productName: t.String(),
  productSlug: t.String(),
  quantity: t.Integer({ minimum: 0, maximum: 99 }),
  reason: t.Optional(t.String()),
  recoveryStatus: t.Union([
    t.Literal("READY"),
    t.Literal("PRICE_CHANGED"),
    t.Literal("QUANTITY_REDUCED"),
    t.Literal("BLOCKED"),
  ]),
  suggestedAction: t.Optional(t.String()),
  variantId: t.String(),
  variantLabel: t.String(),
  variantOptions: t.Array(tboxCheckoutVariantOption, {
    maxItems: SNAPSHOT_VARIANT_OPTION_MAX_ITEMS,
  }),
});

const tboxCheckoutCartValidationData = t.Object({
  issues: t.Array(tboxCheckoutCartValidationIssue),
  items: t.Array(tboxCheckoutCartLine),
  lineItemCount: t.Integer({ minimum: 0 }),
  requiresCustomerAcceptance: t.Boolean(),
  status: t.Union([
    t.Literal("VALID"),
    t.Literal("CHANGED"),
    t.Literal("BLOCKED"),
  ]),
  subtotalCentavos: t.Integer({ minimum: 0 }),
  subtotalLabel: t.String(),
  totalQuantity: t.Integer({ minimum: 0 }),
});

const tboxCheckoutDetailsBody = t.Object(
  {
    email: t.Optional(t.Unknown()),
    fullName: t.Optional(t.Unknown()),
    phone: t.Optional(t.Unknown()),
    streetAddress: t.Optional(t.Unknown()),
    barangay: t.Optional(t.Unknown()),
    cityProvince: t.Optional(t.Unknown()),
    postalCode: t.Optional(t.Unknown()),
    privacyAcknowledged: t.Optional(t.Unknown()),
  },
  { additionalProperties: true }
);

const tboxCheckoutContactSnapshot = t.Object({
  barangay: t.String(),
  cityProvince: t.String(),
  email: t.String({ format: "email" }),
  firstName: t.Nullable(t.String()),
  fullName: t.String(),
  lastName: t.Nullable(t.String()),
  phone: t.String(),
  postalCode: t.String(),
  privacyAcknowledged: t.Literal(true),
  streetAddress: t.String(),
});

const tboxCheckoutDetailsData = t.Object({
  attempt: t.Object({
    attemptId: t.String(),
    attemptToken: t.String(),
    status: t.Literal("DETAILS_CAPTURED"),
  }),
  customer: t.Object({
    customerId: t.Nullable(t.String()),
    mode: t.Union([t.Literal("guest"), t.Literal("signed-in")]),
  }),
  details: tboxCheckoutContactSnapshot,
  next: t.Object({
    cartValidationRequired: t.Literal(true),
    paymentAllowed: t.Literal(false),
  }),
});

const tboxCheckoutReservationParams = t.Object({
  attemptId: t.String({ minLength: 1, maxLength: 128 }),
});

const tboxCheckoutReservationBody = t.Object(
  {
    attemptToken: t.Optional(t.String({ minLength: 1, maxLength: 512 })),
    cartUpdatedAt: t.Optional(t.String()),
    items: t.Array(tboxCheckoutCartValidationItem, {
      maxItems: STOREFRONT_CART_LINE_ITEM_MAX,
      minItems: 1,
    }),
  },
  { additionalProperties: false }
);

const tboxCheckoutPaymentBody = t.Object(
  {
    attemptToken: t.Optional(t.String({ minLength: 1, maxLength: 512 })),
  },
  { additionalProperties: false }
);

const tboxCheckoutReservationData = t.Object({
  attempt: t.Object({
    attemptId: t.String(),
    status: t.Literal("INVENTORY_RESERVED"),
  }),
  reservation: t.Object({
    reservationId: t.String(),
    status: t.Literal("ACTIVE"),
    expiresAt: t.String(),
  }),
  cart: tboxCheckoutCartValidationData,
  next: t.Object({
    paymentAllowed: t.Literal(true),
    payMongoCreationRequired: t.Literal(true),
  }),
});

const tboxCheckoutPaymentData = t.Object({
  attempt: t.Object({
    attemptId: t.String(),
    status: t.Literal("PAYMENT_CREATED"),
  }),
  reservation: t.Object({
    reservationId: t.String(),
    status: t.Literal("ACTIVE"),
    expiresAt: t.String(),
  }),
  payment: t.Object({
    amountCentavos: t.Integer({ minimum: 0 }),
    currency: t.Literal("PHP"),
    paymentId: t.String(),
    provider: t.Literal("PAYMONGO"),
    providerCheckoutSessionId: t.String(),
    status: t.Literal("PAYMENT_PENDING"),
  }),
  handoff: t.Object({
    checkoutUrl: t.String(),
    redirectMethod: t.Literal("browser"),
  }),
  next: t.Object({
    orderCreated: t.Literal(false),
    receiptAvailable: t.Literal(false),
    webhookRequired: t.Literal(true),
  }),
});

type InventoryDurableObjectEnvelope =
  | { data: CheckoutPaymentResult | CheckoutReservationResponse }
  | { error: { code: ErrorCodeType; details?: unknown } };

type CheckoutPaymentDurableObjectRuntimeConfig = {
  appBaseUrl: string;
  paymentMethods?: string;
  secretKey?: string;
  sendEmailReceipt?: boolean;
};

type CheckoutPaymentDurableObjectRequest = CheckoutPaymentServiceInput & {
  runtimePaymentConfig?: CheckoutPaymentDurableObjectRuntimeConfig;
};

function isInventoryDurableObjectEnvelope(
  value: unknown
): value is InventoryDurableObjectEnvelope {
  return typeof value === "object" && value !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCheckoutReservationResponse(
  value: unknown
): value is CheckoutReservationResponse {
  if (!isRecord(value)) {
    return false;
  }

  const { attempt, cart, next, reservation } = value;

  return (
    isRecord(attempt) &&
    isRecord(cart) &&
    isRecord(next) &&
    isRecord(reservation) &&
    typeof attempt.attemptId === "string" &&
    attempt.status === "INVENTORY_RESERVED" &&
    Array.isArray(cart.items) &&
    Array.isArray(cart.issues) &&
    (cart.status === "VALID" ||
      cart.status === "CHANGED" ||
      cart.status === "BLOCKED") &&
    next.paymentAllowed === true &&
    next.payMongoCreationRequired === true &&
    typeof reservation.reservationId === "string" &&
    reservation.status === "ACTIVE" &&
    typeof reservation.expiresAt === "string"
  );
}

function isCheckoutPaymentResult(value: unknown): value is CheckoutPaymentResult {
  if (!isRecord(value)) return false;

  const attempt = value.attempt;
  const handoff = value.handoff;
  const next = value.next;
  const payment = value.payment;
  const reservation = value.reservation;

  return (
    isRecord(attempt) &&
    isRecord(handoff) &&
    isRecord(next) &&
    isRecord(payment) &&
    isRecord(reservation) &&
    typeof attempt.attemptId === "string" &&
    attempt.status === "PAYMENT_CREATED" &&
    isTrustedPayMongoCheckoutUrl(handoff.checkoutUrl) &&
    handoff.redirectMethod === "browser" &&
    next.orderCreated === false &&
    next.receiptAvailable === false &&
    next.webhookRequired === true &&
    typeof payment.amountCentavos === "number" &&
    Number.isSafeInteger(payment.amountCentavos) &&
    payment.amountCentavos > 0 &&
    payment.currency === "PHP" &&
    typeof payment.paymentId === "string" &&
    payment.provider === "PAYMONGO" &&
    typeof payment.providerCheckoutSessionId === "string" &&
    payment.status === "PAYMENT_PENDING" &&
    typeof reservation.expiresAt === "string" &&
    typeof reservation.reservationId === "string" &&
    reservation.status === "ACTIVE"
  );
}

function createInventoryReservationExecutor(
  namespace: DurableObjectNamespace | undefined
):
  | ((
      input: CheckoutReservationServiceInput
    ) => Promise<AppResult<CheckoutReservationResponse>>)
  | undefined {
  if (!namespace) {
    return undefined;
  }

  return async (input) => {
    try {
      const id = namespace.idFromName("checkout-inventory");
      const stub = namespace.get(id);
      const response = await stub.fetch(
        new Request("https://inventory-reservation.internal/reserve", {
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        })
      );
      const body = (await response.json()) as unknown;

      if (!isInventoryDurableObjectEnvelope(body)) {
        return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
      }

      if (
        "data" in body &&
        response.ok &&
        isCheckoutReservationResponse(body.data)
      ) {
        return Result.okay(body.data);
      }

      if (
        "error" in body &&
        isRecord(body.error) &&
        typeof body.error.code === "string"
      ) {
        return Result.error(
          new GeneralError(
            "details" in body.error ? (body.error.details ?? {}) : {},
            body.error.code as ErrorCodeType
          )
        );
      }

      return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
    } catch {
      return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
    }
  };
}

export function createCheckoutPaymentExecutor(
  namespace: DurableObjectNamespace | undefined,
  runtimePaymentConfig?: CheckoutPaymentDurableObjectRuntimeConfig
): CheckoutPaymentExecutor | undefined {
  if (!namespace) {
    return undefined;
  }

  return async (input) => {
    try {
      const id = namespace.idFromName("checkout-inventory");
      const stub = namespace.get(id);
      const durableObjectRequest: CheckoutPaymentDurableObjectRequest = {
        ...input,
        runtimePaymentConfig,
      };
      const response = await stub.fetch(
        new Request("https://inventory-reservation.internal/payments", {
          body: JSON.stringify(durableObjectRequest),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        })
      );
      const body = (await response.json()) as unknown;

      if (!isInventoryDurableObjectEnvelope(body)) {
        return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
      }

      if (
        "data" in body &&
        response.ok &&
        isCheckoutPaymentResult(body.data) &&
        body.data.attempt.attemptId === input.attemptId
      ) {
        return Result.okay(body.data);
      }

      if (
        "error" in body &&
        isRecord(body.error) &&
        typeof body.error.code === "string"
      ) {
        return Result.error(
          new GeneralError(
            "details" in body.error ? (body.error.details ?? {}) : {},
            body.error.code as ErrorCodeType
          )
        );
      }

      return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
    } catch {
      return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
    }
  };
}

function stringEnv(
  env: (Partial<Env> & Record<string, unknown>) | undefined,
  key: string
): string | undefined {
  const value = env?.[key] ?? process.env[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];

  return (first === `"` || first === `'`) && first === last
    ? trimmed.slice(1, -1).trim()
    : trimmed;
}

function booleanEnv(
  env: (Partial<Env> & Record<string, unknown>) | undefined,
  key: string
): boolean | undefined {
  const value = stringEnv(env, key);

  if (!value) {
    return undefined;
  }

  return value.toLowerCase() === "true";
}

function shouldUseInventoryDurableObject() {
  return process.env.JRW_USE_INVENTORY_DURABLE_OBJECT !== "false";
}

function createCheckoutPaymentRuntimeConfig(
  input: CheckoutControllerFactoryInput
): CheckoutPaymentDurableObjectRuntimeConfig {
  return {
    appBaseUrl:
      stringEnv(input.runtimeEnv, "APP_BASE_URL") ??
      stringEnv(input.runtimeEnv, "PUBLIC_APP_BASE_URL") ??
      new URL(input.request.url).origin,
    paymentMethods: stringEnv(input.runtimeEnv, "PAYMONGO_PAYMENT_METHODS"),
    secretKey: stringEnv(input.runtimeEnv, "PAYMONGO_SECRET_KEY"),
    sendEmailReceipt: booleanEnv(
      input.runtimeEnv,
      "PAYMONGO_SEND_EMAIL_RECEIPT"
    ),
  };
}

function createRuntimeController(
  input: CheckoutControllerFactoryInput,
  options: CheckoutRoutesOptions
): CheckoutController {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const repositories = createCheckoutRepositories(db as D1Database);
  const runtimePaymentConfig = createCheckoutPaymentRuntimeConfig(input);
  const reservationExecutor = shouldUseInventoryDurableObject()
    ? createInventoryReservationExecutor(
        input.runtimeEnv?.INVENTORY_DURABLE_OBJECT as
          | DurableObjectNamespace
          | undefined
      )
    : undefined;
  const paymentExecutor = shouldUseInventoryDurableObject()
    ? createCheckoutPaymentExecutor(
        input.runtimeEnv?.INVENTORY_DURABLE_OBJECT as
          | DurableObjectNamespace
          | undefined,
        runtimePaymentConfig
      )
    : undefined;
  const service = new CheckoutService({
    ...repositories,
    operationalLogger: options.operationalLogger,
    paymentExecutor,
    payMongoClient: runtimePaymentConfig.secretKey
      ? new PayMongoClient({
          secretKey: runtimePaymentConfig.secretKey,
        })
      : undefined,
    paymentConfig: {
      appBaseUrl: runtimePaymentConfig.appBaseUrl,
      paymentMethods: runtimePaymentConfig.paymentMethods,
      sendEmailReceipt: runtimePaymentConfig.sendEmailReceipt,
    },
    reservationExecutor,
  });

  return new CheckoutController(service);
}

function getController(
  input: CheckoutControllerFactoryInput,
  options: CheckoutRoutesOptions
): CheckoutController {
  return (
    options.controllerFactory?.(input) ?? createRuntimeController(input, options)
  );
}

const checkoutAuth = {
  mode: "optional",
  roles: ["PROSPECT", "CUSTOMER"],
} as const;

const checkoutValidationErrors = [
  "VALIDATION_FAILED",
  "CONFLICT_STATE",
  "INVENTORY_UNAVAILABLE",
  "RESOURCE_NOT_FOUND",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

const checkoutReservationErrors = [
  "VALIDATION_FAILED",
  "AUTH_FORBIDDEN",
  "CONFLICT_STATE",
  "IDEMPOTENCY_CONFLICT",
  "INVENTORY_UNAVAILABLE",
  "RESOURCE_NOT_FOUND",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

const checkoutPaymentErrors = [
  "VALIDATION_FAILED",
  "AUTH_FORBIDDEN",
  "CONFLICT_STATE",
  "IDEMPOTENCY_CONFLICT",
  "PAYMENT_FAILED",
  "RESOURCE_NOT_FOUND",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export function checkoutRoutes(
  app: AnyElysia,
  options: CheckoutRoutesOptions = {}
) {
  return app
    .post(
      "/checkout/cart-validations",
      async (ctx) => {
        const { body, request, requestId, runtimeEnv, set } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              body: unknown;
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
            };
        const controller = getController(
          { request, requestId, runtimeEnv },
          options
        );
        const result = await controller.validateCart({
          body,
          requestId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        body: tboxCheckoutCartValidationBody,
        detail: routeDetail({
          summary: "Validate cart before checkout",
          description:
            "Validates the browser cart against current JRW product and variant availability before checkout details or payment handoff. Brand membership is not required because only customer-safe published storefront sellability data is used, and this endpoint creates no payment, order, reservation, webhook, email, or inventory lock.",
          tags: ["Checkout"],
          auth: checkoutAuth,
          rateLimitClass: "checkout-payment",
          errorCodes: [...checkoutValidationErrors],
        }),
        response: {
          200: tboxApiSuccess(tboxCheckoutCartValidationData),
          ...openApiErrorResponses([400, 404, 409, 500, 503]),
        },
      }
    )
    .post(
      "/checkout/details",
      async (ctx) => {
        const { body, request, requestContext, requestId, runtimeEnv, set } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              body: unknown;
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
            };
        const controller = getController(
          { request, requestId, runtimeEnv },
          options
        );
        const result = await controller.saveDetails({
          actor: requestContext.actor,
          body,
          requestId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        body: tboxCheckoutDetailsBody,
        detail: routeDetail({
          summary: "Validate checkout details",
          description:
            "Validates required checkout email/contact/delivery details for guest or signed-in shopper checkout. Customer auth is optional: a valid Customer session can attach the server-side customer reference, while guests keep a nullable customer reference. The browser cannot submit customer ID, role, email verification state, payment state, order state, provider fields, or raw PII beyond required fulfillment/contact fields. This endpoint creates no payment, order, reservation, webhook, email, or inventory lock.",
          tags: ["Checkout"],
          auth: checkoutAuth,
          rateLimitClass: "checkout-payment",
          errorCodes: [
            "VALIDATION_FAILED",
            "PROVIDER_UNAVAILABLE",
            "INTERNAL_ERROR",
          ],
        }),
        response: {
          200: tboxApiSuccess(tboxCheckoutDetailsData),
          ...openApiErrorResponses([400, 500, 503]),
        },
      }
    )
    .post(
      "/checkout/attempts/:attemptId/reservations",
      async (ctx) => {
        const {
          body,
          params,
          request,
          requestContext,
          requestId,
          runtimeEnv,
          set,
        } = ctx as typeof ctx &
          RequestContextDecorations & {
            body: unknown;
            params: { attemptId: string };
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
          };
        const controller = getController(
          { request, requestId, runtimeEnv },
          options
        );
        const result = await controller.reserveInventory({
          actor: requestContext.actor,
          attemptId: params.attemptId,
          body,
          requestId,
        });

        set.status = result.status;
        return result.body as never;
      },
      {
        body: tboxCheckoutReservationBody,
        detail: routeDetail({
          summary: "Reserve checkout inventory",
          description:
            "Validates a captured checkout attempt and current cart before reserving public storefront inventory for guest or signed-in Customer checkout. Brand membership is not required because reservation uses only published storefront catalog state. The browser cannot submit customer identity, payment, order, reservation status, provider fields, stock versions, or lock data. This endpoint creates no PayMongo session, order, webhook, email, or fulfillment transition.",
          tags: ["Checkout"],
          auth: checkoutAuth,
          rateLimitClass: "checkout-payment",
          errorCodes: [...checkoutReservationErrors],
        }),
        params: tboxCheckoutReservationParams,
        response: {
          200: tboxApiSuccess(tboxCheckoutReservationData),
          ...openApiErrorResponses([400, 403, 404, 409, 500, 503]),
        },
      }
    )
    .post(
      "/checkout/attempts/:attemptId/payments",
      async (ctx) => {
        const {
          body,
          params,
          request,
          requestContext,
          requestId,
          runtimeEnv,
          set,
        } = ctx as typeof ctx &
          RequestContextDecorations & {
            body: unknown;
            params: { attemptId: string };
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
          };
        const controller = getController(
          { request, requestId, runtimeEnv },
          options
        );
        const result = await controller.createPayment({
          actor: requestContext.actor,
          attemptId: params.attemptId,
          body,
          requestId,
        } satisfies CheckoutPaymentServiceInput);

        set.status = result.status;
        return result.body as never;
      },
      {
        body: tboxCheckoutPaymentBody,
        detail: routeDetail({
          summary: "Create PayMongo checkout handoff",
          description:
            "Creates or reuses a server-owned PayMongo Hosted Checkout session for an active reserved checkout attempt. The browser submits only the checkout attempt token when needed; it cannot submit amount, currency, line items, card data, provider payloads, payment status, order state, or webhook fields. This endpoint creates no order, receipt, webhook, email, fulfillment transition, or direct card collection.",
          tags: ["Checkout"],
          auth: checkoutAuth,
          rateLimitClass: "checkout-payment",
          errorCodes: [...checkoutPaymentErrors],
        }),
        params: tboxCheckoutReservationParams,
        response: {
          200: tboxApiSuccess(tboxCheckoutPaymentData),
          ...openApiErrorResponses([400, 402, 403, 404, 409, 500, 503]),
        },
      }
    );
}
