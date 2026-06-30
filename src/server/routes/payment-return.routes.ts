import { t } from "elysia";
import { createDb } from "@/adapter/infrastructure/db/client";
import { createOrderConfirmationEmailNotifier } from "@/adapter/infrastructure/resend/OrderConfirmationEmailNotifier";
import type { OperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
import { openApiErrorResponses, tboxApiSuccess } from "@/lib/typebox/api";
import { PayMongoClient } from "@/lib/paymongo/PayMongoClient";
import { PaymentReconciliationController } from "@/server/controllers/PaymentReconciliationController";
import type { RequestContextDecorations } from "@/server/context/request-context";
import { routeDetail } from "@/server/openapi/route-metadata";
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

const tboxPaymentReturnStatusData = t.Object({
  canRetry: t.Boolean(),
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
  status: t.Union([
    t.Literal("pending"),
    t.Literal("confirmed"),
    t.Literal("failed"),
    t.Literal("expired"),
    t.Literal("cancelled"),
    t.Literal("refunded"),
    t.Literal("unknown"),
  ]),
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

  const repository = new DrizzleOrderConfirmationRepository(
    createDb(db as D1Database)
  );
  const payMongoSecretKey = stringEnv(input.runtimeEnv, "PAYMONGO_SECRET_KEY");
  const service = new PaymentReconciliationService({
    emailNotifier: createOrderConfirmationEmailNotifier(
      input.runtimeEnv ?? {},
      {
        requestUrl: input.request.url,
      }
    ),
    operationalLogger: options.operationalLogger,
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
          "Reads payment/order status after PayMongo Hosted Checkout return using server-owned checkout references only. Redirect query values never finalize payment or create paid state; paid order confirmation can only be created from existing JRW PAYMENT_PAID state or backend PayMongo session reconciliation using JRW secrets. Brand membership is not required because this endpoint returns a limited customer-safe status for high-entropy checkout references and no provider payload, card data, token, email lookup, phone, or address.",
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
