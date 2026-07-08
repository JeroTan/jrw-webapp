import { t } from "elysia";
import { createDb } from "@/adapter/infrastructure/db/client";
import { createOrderConfirmationEmailNotifier } from "@/adapter/infrastructure/resend/OrderConfirmationEmailNotifier";
import { createPaymentStatusEmailNotifier } from "@/adapter/infrastructure/resend/PaymentStatusEmailNotifier";
import type { OperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
import { openApiErrorResponses, tboxApiSuccess } from "@/lib/typebox/api";
import { PayMongoClient } from "@/lib/paymongo/PayMongoClient";
import { PaymentReconciliationController } from "@/server/controllers/PaymentReconciliationController";
import type { RequestContextDecorations } from "@/server/context/request-context";
import { routeDetail } from "@/server/openapi/route-metadata";
import { DrizzleInventoryReleaseRepository } from "@/server/repositories/InventoryReleaseRepository";
import { DrizzleOrderConfirmationRepository } from "@/server/repositories/OrderConfirmationRepository";
import { PaymentReconciliationService } from "@/server/services/PaymentReconciliationService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

export type PaymentReturnControllerFactoryInput = {
  request: Request;
  requestId: string;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
};

export type PaymentReturnRoutesOptions = {
  controllerFactory?: (
    input: PaymentReturnControllerFactoryInput
  ) => PaymentReconciliationController;
  operationalLogger?: OperationalLogger;
};

const tboxPaymentReturnQuery = t.Object(
  {
    attemptId: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
    paymentId: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
    providerCheckoutSessionId: t.Optional(
      t.String({ minLength: 1, maxLength: 255 })
    ),
  },
  { additionalProperties: true }
);

const tboxPaymentReturnEmailStatus = t.Union([
  t.Literal("PENDING"),
  t.Literal("SENDING"),
  t.Literal("SENT"),
  t.Literal("FAILED"),
]);

const tboxPaymentReturnPublicStatus = t.Union([
  t.Literal("pending"),
  t.Literal("confirmed"),
  t.Literal("failed"),
  t.Literal("expired"),
  t.Literal("cancelled"),
  t.Literal("refunded"),
  t.Literal("unknown"),
]);

const tboxPaymentReceiptLane = t.Object({
  kind: t.Union([
    t.Literal("payment"),
    t.Literal("fulfillment"),
    t.Literal("return"),
    t.Literal("refund"),
  ]),
  label: t.String(),
  updatedAt: t.Union([t.String(), t.Null()]),
  value: t.String(),
});

const tboxPaymentReceipt = t.Object({
  fulfillmentStatus: t.Object({
    label: t.String(),
    value: t.Union([
      t.Literal("ORDER_PLACED"),
      t.Literal("PROCESSING"),
      t.Literal("SHIPPED"),
      t.Literal("DELIVERED"),
      t.Literal("CANCELLED"),
      t.Null(),
    ]),
  }),
  guestAccountCta: t.Object({
    eligible: t.Boolean(),
    href: t.Optional(t.String()),
    label: t.Optional(t.String()),
    message: t.Optional(t.String()),
  }),
  inboxReminder: t.Optional(t.String()),
  items: t.Array(
    t.Object({
      lineTotalCentavos: t.Integer({ minimum: 0 }),
      name: t.String(),
      productId: t.Union([t.String(), t.Null()]),
      quantity: t.Integer({ minimum: 1 }),
      unitAmountCentavos: t.Integer({ minimum: 0 }),
      variantId: t.Union([t.String(), t.Null()]),
      variantLabel: t.Union([t.String(), t.Null()]),
    })
  ),
  orderNumber: t.Optional(t.String()),
  paymentStatus: t.Object({
    label: t.String(),
    value: tboxPaymentReturnPublicStatus,
  }),
  source: t.Union([t.Literal("order"), t.Literal("payment")]),
  statusLanes: t.Object({
    fulfillment: tboxPaymentReceiptLane,
    payment: tboxPaymentReceiptLane,
    refund: tboxPaymentReceiptLane,
    return: tboxPaymentReceiptLane,
  }),
  totals: t.Object({
    currency: t.Literal("PHP"),
    subtotalCentavos: t.Integer({ minimum: 0 }),
    totalCentavos: t.Integer({ minimum: 0 }),
  }),
});

const tboxPaymentReturnStatusData = t.Object({
  canRetry: t.Boolean(),
  email: t.Optional(
    t.Object({
      status: tboxPaymentReturnEmailStatus,
    })
  ),
  next: t.Object({
    refreshAllowed: t.Boolean(),
    retryCheckoutAllowed: t.Boolean(),
  }),
  order: t.Optional(
    t.Object({
      orderId: t.String(),
      orderNumber: t.String(),
      totalCentavos: t.Integer({ minimum: 0 }),
    })
  ),
  payment: t.Object({
    paymentId: t.String(),
    status: t.String(),
  }),
  receipt: t.Optional(tboxPaymentReceipt),
  status: tboxPaymentReturnPublicStatus,
});

function stringEnv(
  runtimeEnv: (Partial<Env> & Record<string, unknown>) | undefined,
  key: string
): string | undefined {
  const processValue =
    typeof process !== "undefined" ? process.env?.[key] : undefined;
  const value = runtimeEnv?.[key] ?? processValue;

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function createRuntimeController(
  input: PaymentReturnControllerFactoryInput,
  options: PaymentReturnRoutesOptions
): PaymentReconciliationController {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const appDb = createDb(db as D1Database);
  const repository = new DrizzleOrderConfirmationRepository(appDb, {
    accountPrefillSecret: stringEnv(input.runtimeEnv, "JWT_SECRET"),
  });
  const inventoryReleaseRepository = new DrizzleInventoryReleaseRepository(
    appDb
  );
  const payMongoSecretKey = stringEnv(input.runtimeEnv, "PAYMONGO_SECRET_KEY");
  const service = new PaymentReconciliationService({
    emailNotifier: createOrderConfirmationEmailNotifier(
      input.runtimeEnv ?? {},
      {
        requestUrl: input.request.url,
      }
    ),
    inventoryReleaseRepository,
    operationalLogger: options.operationalLogger,
    paymentStatusEmailNotifier: createPaymentStatusEmailNotifier(
      input.runtimeEnv ?? {},
      {
        requestUrl: input.request.url,
      }
    ),
    paymentStatusProvider: payMongoSecretKey
      ? new PayMongoClient({
          secretKey: payMongoSecretKey,
        })
      : undefined,
    repository,
  });

  return new PaymentReconciliationController(service);
}

function getController(
  input: PaymentReturnControllerFactoryInput,
  options: PaymentReturnRoutesOptions
): PaymentReconciliationController {
  return (
    options.controllerFactory?.(input) ??
    createRuntimeController(input, options)
  );
}

export function paymentReturnRoutes(
  app: AnyElysia,
  options: PaymentReturnRoutesOptions = {}
) {
  return app.get(
    "/checkout/payment-return",
    async (ctx) => {
      const { query, request, requestId, runtimeEnv, set } = ctx as typeof ctx &
        RequestContextDecorations & {
          query: {
            attemptId?: string;
            paymentId?: string;
            providerCheckoutSessionId?: string;
          };
          runtimeEnv?: Partial<Env> & Record<string, unknown>;
        };
      const controller = getController(
        { request, requestId, runtimeEnv },
        options
      );
      const result = await controller.getPaymentReturnStatus({
        attemptId: query.attemptId,
        paymentId: query.paymentId,
        providerCheckoutSessionId: query.providerCheckoutSessionId,
        requestId,
      });

      set.status = result.status;
      return result.body as never;
    },
    {
      detail: routeDetail({
        summary: "Read checkout payment return status",
        description:
          "Reads payment/order status after PayMongo Hosted Checkout return using server-owned checkout references only. Redirect query values never finalize payment or create paid state; paid order confirmation can only be created from existing JRW PAYMENT_PAID state or backend PayMongo session reconciliation using JRW secrets. Terminal or timed-out pending payment state may release reserved inventory and send one safe terminal payment-status email through server state only. Confirmed guest receipts may include a signed account-prefill context that carries checkout/payment IDs only; raw checkout email stays behind the customer registration prefill endpoint. Brand membership is not required because this endpoint returns a limited customer-safe status and no provider payload, card data, raw email, phone, or address.",
        tags: ["Checkout", "Payments"],
        auth: { mode: "public" },
        rateLimitClass: "checkout-payment",
        errorCodes: [
          "VALIDATION_FAILED",
          "RESOURCE_NOT_FOUND",
          "PROVIDER_UNAVAILABLE",
          "INTERNAL_ERROR",
        ],
      }),
      query: tboxPaymentReturnQuery,
      response: {
        200: tboxApiSuccess(tboxPaymentReturnStatusData),
        ...openApiErrorResponses([400, 404, 500, 503]),
      },
    }
  );
}
