import { t } from "elysia";
import { createDb } from "@/adapter/infrastructure/db/client";
import { createOrderConfirmationEmailNotifier } from "@/adapter/infrastructure/resend/OrderConfirmationEmailNotifier";
import type { OperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
import { openApiErrorResponses, tboxApiSuccess } from "@/lib/typebox/api";
import { PaymentWebhookController } from "@/server/controllers/PaymentWebhookController";
import type { RequestContextDecorations } from "@/server/context/request-context";
import { routeDetail } from "@/server/openapi/route-metadata";
import { DrizzleInventoryReleaseRepository } from "@/server/repositories/InventoryReleaseRepository";
import { DrizzleOrderConfirmationRepository } from "@/server/repositories/OrderConfirmationRepository";
import { DrizzlePaymentWebhookRepository } from "@/server/repositories/PaymentWebhookRepository";
import { PaymentReconciliationService } from "@/server/services/PaymentReconciliationService";
import { PaymentWebhookService } from "@/server/services/PaymentWebhookService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

const MAX_WEBHOOK_BODY_BYTES = 512 * 1024;

export type PaymentWebhookControllerFactoryInput = {
  request: Request;
  requestId: string;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
};

export type PaymentWebhookRoutesOptions = {
  controllerFactory?: (
    input: PaymentWebhookControllerFactoryInput
  ) => PaymentWebhookController;
  operationalLogger?: OperationalLogger;
};

const tboxWebhookEventData = t.Object({
  event: t.Object({
    eventType: t.String(),
    idempotent: t.Boolean(),
    providerEventId: t.String(),
    status: t.Union([
      t.Literal("RECEIVED"),
      t.Literal("PROCESSED"),
      t.Literal("IGNORED"),
      t.Literal("CONFLICT"),
      t.Literal("FAILED"),
    ]),
  }),
  payment: t.Optional(
    t.Object({
      paymentId: t.String(),
      status: t.Literal("PAYMENT_PAID"),
    })
  ),
  order: t.Optional(
    t.Object({
      emailStatus: t.Union([
        t.Literal("PENDING"),
        t.Literal("SENDING"),
        t.Literal("SENT"),
        t.Literal("FAILED"),
      ]),
      fulfillmentStatus: t.String(),
      orderId: t.String(),
      orderNumber: t.String(),
      totalCentavos: t.Integer({ minimum: 0 }),
    })
  ),
});

function stringEnv(
  runtimeEnv: (Partial<Env> & Record<string, unknown>) | undefined,
  key: string
): string | undefined {
  const value = runtimeEnv?.[key] ?? process.env[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function createRuntimeController(
  input: PaymentWebhookControllerFactoryInput,
  options: PaymentWebhookRoutesOptions
): PaymentWebhookController {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const appDb = createDb(db as D1Database);
  const repository = new DrizzlePaymentWebhookRepository(appDb);
  const reconciliationRepository = new DrizzleOrderConfirmationRepository(
    appDb
  );
  const inventoryReleaseRepository = new DrizzleInventoryReleaseRepository(
    appDb
  );
  const reconciliationService = new PaymentReconciliationService({
    emailNotifier: createOrderConfirmationEmailNotifier(
      input.runtimeEnv ?? {},
      {
        requestUrl: input.request.url,
      }
    ),
    inventoryReleaseRepository,
    operationalLogger: options.operationalLogger,
    repository: reconciliationRepository,
  });
  const service = new PaymentWebhookService({
    operationalLogger: options.operationalLogger,
    reconciliationService,
    repository,
  });

  return new PaymentWebhookController(service);
}

function getController(
  input: PaymentWebhookControllerFactoryInput,
  options: PaymentWebhookRoutesOptions
): PaymentWebhookController {
  return (
    options.controllerFactory?.(input) ??
    createRuntimeController(input, options)
  );
}

export function paymentWebhookRoutes(
  app: AnyElysia,
  options: PaymentWebhookRoutesOptions = {}
) {
  return app.post(
    "/payments/paymongo/webhooks",
    async (ctx) => {
      const { body, request, requestId, runtimeEnv, set } = ctx as typeof ctx &
        RequestContextDecorations & {
          body: unknown;
          runtimeEnv?: Partial<Env> & Record<string, unknown>;
        };
      const rawBody = typeof body === "string" ? body : "";

      if (
        new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BODY_BYTES
      ) {
        throw new GeneralError({}, "PAYLOAD_TOO_LARGE");
      }

      const controller = getController(
        { request, requestId, runtimeEnv },
        options
      );
      const result = await controller.processPayMongoWebhook({
        rawBody,
        requestId,
        signatureHeader: request.headers.get("Paymongo-Signature"),
        webhookSecret: stringEnv(runtimeEnv, "PAYMONGO_WEBHOOK_SECRET"),
      });

      set.status = result.status;
      return result.body as never;
    },
    {
      detail: routeDetail({
        summary: "Receive PayMongo payment webhooks",
        description:
          "Receives PayMongo Hosted Checkout payment events. This endpoint is public because PayMongo-Signature verification with the configured webhook secret is the provider auth boundary; customer, admin, and brand sessions are not used. The route reads the raw request body before parsing. A verified paid event may create an idempotent JRW order confirmation and order confirmation email from server payment state, but it does not release inventory, create a rich receipt, send terminal payment failure emails, or change fulfillment beyond initial order placement.",
        tags: ["Payments", "Webhooks"],
        auth: { mode: "public" },
        rateLimitClass: "webhook",
        errorCodes: [
          "VALIDATION_FAILED",
          "WEBHOOK_INVALID_SIGNATURE",
          "IDEMPOTENCY_CONFLICT",
          "PAYLOAD_TOO_LARGE",
          "PROVIDER_UNAVAILABLE",
          "INTERNAL_ERROR",
        ],
      }),
      parse: "text",
      response: {
        200: tboxApiSuccess(tboxWebhookEventData),
        ...openApiErrorResponses([400, 401, 409, 413, 500, 503]),
      },
    }
  );
}
