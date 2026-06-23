import { t } from "elysia";
import { createDb } from "@/adapter/infrastructure/db/client";
import type { OperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
import { openApiErrorResponses, tboxApiSuccess } from "@/lib/typebox/api";
import { PaymentWebhookController } from "@/server/controllers/PaymentWebhookController";
import type { RequestContextDecorations } from "@/server/context/request-context";
import { routeDetail } from "@/server/openapi/route-metadata";
import { DrizzlePaymentWebhookRepository } from "@/server/repositories/PaymentWebhookRepository";
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

  const repository = new DrizzlePaymentWebhookRepository(
    createDb(db as D1Database)
  );
  const service = new PaymentWebhookService({
    operationalLogger: options.operationalLogger,
    repository,
  });

  return new PaymentWebhookController(service);
}

function getController(
  input: PaymentWebhookControllerFactoryInput,
  options: PaymentWebhookRoutesOptions
): PaymentWebhookController {
  return (
    options.controllerFactory?.(input) ?? createRuntimeController(input, options)
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

      if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BODY_BYTES) {
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
          "Receives PayMongo Hosted Checkout payment events. This endpoint is public because PayMongo-Signature verification with the configured webhook secret is the provider auth boundary; customer, admin, and brand sessions are not used. The route reads the raw request body before parsing and creates no orders, receipts, emails, fulfillment changes, or inventory releases.",
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
