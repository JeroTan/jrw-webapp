import { t } from "elysia";
import { openApiErrorResponses, tboxApiSuccess } from "@/lib/typebox/api";
import { CheckoutController } from "@/server/controllers/CheckoutController";
import type { RequestContextDecorations } from "@/server/context/request-context";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createCheckoutRepositories } from "@/server/repositories/CheckoutRepository";
import { CheckoutService } from "@/server/services/CheckoutService";
import { GeneralError } from "@/utils/general/error";
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
};

const tboxCheckoutVariantOption = t.Object({
  group: t.String(),
  name: t.String(),
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
    variantOptions: t.Optional(t.Array(tboxCheckoutVariantOption)),
  },
  { additionalProperties: false }
);

const tboxCheckoutCartValidationBody = t.Object(
  {
    cartUpdatedAt: t.Optional(t.String()),
    items: t.Array(tboxCheckoutCartValidationItem),
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
  variantOptions: t.Array(tboxCheckoutVariantOption),
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

function createRuntimeController(
  input: CheckoutControllerFactoryInput
): CheckoutController {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const repositories = createCheckoutRepositories(db as D1Database);
  const service = new CheckoutService({
    ...repositories,
  });

  return new CheckoutController(service);
}

function getController(
  input: CheckoutControllerFactoryInput,
  options: CheckoutRoutesOptions
): CheckoutController {
  return options.controllerFactory?.(input) ?? createRuntimeController(input);
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

export function checkoutRoutes(
  app: AnyElysia,
  options: CheckoutRoutesOptions = {}
) {
  return app.post(
    "/checkout/cart-validations",
    async (ctx) => {
      const { body, request, requestId, runtimeEnv, set } = ctx as typeof ctx &
        RequestContextDecorations & {
          body: unknown;
          runtimeEnv?: Partial<Env> & Record<string, unknown>;
        };
      const controller = getController({ request, requestId, runtimeEnv }, options);
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
  );
}
