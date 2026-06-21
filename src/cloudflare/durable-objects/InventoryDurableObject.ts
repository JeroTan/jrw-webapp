import { DurableObject } from "cloudflare:workers";
import { createDb } from "@/adapter/infrastructure/db/client";
import { consoleOperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
import type { CheckoutReservationResponse } from "@/domain/checkout/inventory-reservation";
import { errorCodeToHttpStatus } from "@/lib/api/errors";
import { PayMongoClient } from "@/lib/paymongo/PayMongoClient";
import { DrizzleCheckoutRepository } from "@/server/repositories/CheckoutRepository";
import {
  CheckoutService,
  type CheckoutPaymentResult,
  type CheckoutPaymentServiceInput,
  type CheckoutReservationServiceInput,
} from "@/server/services/CheckoutService";
import { GeneralError, type ErrorCodeType } from "@/utils/general/error";
import type { AppResult } from "@/utils/general/result";
import { CheckoutPaymentAttemptCoordinator } from "./CheckoutPaymentAttemptCoordinator";

type InventoryDurableObjectData =
  | { ok: true }
  | CheckoutPaymentResult
  | CheckoutReservationResponse;

type InventoryDurableObjectEnvelope =
  | { data: InventoryDurableObjectData }
  | { error: { code: ErrorCodeType; details?: unknown } };

type CheckoutPaymentRuntimeConfig = {
  appBaseUrl?: unknown;
  paymentMethods?: unknown;
  secretKey?: unknown;
  sendEmailReceipt?: unknown;
};

type CheckoutPaymentDurableObjectRequest = CheckoutPaymentServiceInput & {
  runtimePaymentConfig?: CheckoutPaymentRuntimeConfig;
};

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  const stringValue = cleanString(value);

  return stringValue ? stringValue.toLowerCase() === "true" : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringBinding(env: Env, key: string): string | undefined {
  return cleanString((env as Env & Record<string, unknown>)[key]);
}

function booleanBinding(env: Env, key: string): boolean | undefined {
  return booleanValue((env as Env & Record<string, unknown>)[key]);
}

function stringConfig(
  config: CheckoutPaymentRuntimeConfig | undefined,
  key: keyof CheckoutPaymentRuntimeConfig
): string | undefined {
  return cleanString(config?.[key]);
}

function booleanConfig(
  config: CheckoutPaymentRuntimeConfig | undefined,
  key: keyof CheckoutPaymentRuntimeConfig
): boolean | undefined {
  return booleanValue(config?.[key]);
}

function paymentServiceInput(
  input: CheckoutPaymentDurableObjectRequest
): CheckoutPaymentServiceInput {
  return {
    actor: input.actor,
    attemptId: input.attemptId,
    body: input.body,
    now: input.now,
    requestId: input.requestId,
  };
}

function paymentRuntimeConfig(
  value: unknown
): CheckoutPaymentRuntimeConfig | undefined {
  return isRecord(value) ? value : undefined;
}

export class InventoryDurableObject extends DurableObject {
  private readonly bindings: Env;
  private readonly paymentAttempts = new CheckoutPaymentAttemptCoordinator();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.bindings = env;
  }

  private json(body: InventoryDurableObjectEnvelope, status = 200): Response {
    return new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
      status,
    });
  }

  private checkoutService(
    runtimeConfig?: CheckoutPaymentRuntimeConfig
  ): CheckoutService {
    if (!this.bindings.DB) {
      throw new GeneralError({}, "PROVIDER_UNAVAILABLE");
    }

    const secretKey =
      stringConfig(runtimeConfig, "secretKey") ??
      stringBinding(this.bindings, "PAYMONGO_SECRET_KEY");
    const appBaseUrl =
      stringConfig(runtimeConfig, "appBaseUrl") ??
      stringBinding(this.bindings, "APP_BASE_URL") ??
      stringBinding(this.bindings, "PUBLIC_APP_BASE_URL");

    if (!appBaseUrl) {
      throw new GeneralError(
        { reason: "missing_app_base_url" },
        "PROVIDER_UNAVAILABLE"
      );
    }

    return new CheckoutService({
      operationalLogger: consoleOperationalLogger,
      paymentConfig: {
        appBaseUrl,
        paymentMethods:
          stringConfig(runtimeConfig, "paymentMethods") ??
          stringBinding(this.bindings, "PAYMONGO_PAYMENT_METHODS"),
        sendEmailReceipt:
          booleanConfig(runtimeConfig, "sendEmailReceipt") ??
          booleanBinding(this.bindings, "PAYMONGO_SEND_EMAIL_RECEIPT"),
      },
      payMongoClient: secretKey ? new PayMongoClient({ secretKey }) : undefined,
      repository: new DrizzleCheckoutRepository(createDb(this.bindings.DB)),
    });
  }

  private createPaymentSerialized(
    request: CheckoutPaymentDurableObjectRequest
  ): Promise<AppResult<CheckoutPaymentResult>> {
    const input = paymentServiceInput(request);
    const runtimeConfig = paymentRuntimeConfig(request.runtimePaymentConfig);

    return this.paymentAttempts.run(input.attemptId, () =>
      this.checkoutService(runtimeConfig).createPayment(input)
    );
  }

  private resultResponse<T extends InventoryDurableObjectData>(
    result: AppResult<T>
  ): Response {
    if (result.error) {
      return this.json(
        {
          error: {
            code: result.error.code,
            details: result.error.data,
          },
        },
        errorCodeToHttpStatus(result.error.code)
      );
    }

    return this.json({ data: result.content });
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === "GET") {
      return this.json({ data: { ok: true } });
    }

    const url = new URL(request.url);

    if (
      request.method !== "POST" ||
      (url.pathname !== "/reserve" && url.pathname !== "/payments")
    ) {
      return this.json(
        { error: { code: "RESOURCE_NOT_FOUND" } },
        errorCodeToHttpStatus("RESOURCE_NOT_FOUND")
      );
    }

    try {
      if (url.pathname === "/payments") {
        const input =
          (await request.json()) as CheckoutPaymentDurableObjectRequest;

        if (typeof input.attemptId !== "string" || input.attemptId.length === 0) {
          throw new GeneralError({}, "VALIDATION_FAILED");
        }

        return this.resultResponse(await this.createPaymentSerialized(input));
      }

      const input = (await request.json()) as CheckoutReservationServiceInput;
      return this.resultResponse(
        await this.checkoutService().reserveInventory(input)
      );
    } catch (error) {
      const generalError =
        error instanceof GeneralError
          ? error
          : new GeneralError({}, "PROVIDER_UNAVAILABLE");

      return this.json(
        {
          error: {
            code: generalError.code,
            details: generalError.data,
          },
        },
        errorCodeToHttpStatus(generalError.code)
      );
    }
  }
}
