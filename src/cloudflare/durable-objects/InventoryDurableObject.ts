import { DurableObject } from "cloudflare:workers";
import { createDb } from "@/adapter/infrastructure/db/client";
import type { CheckoutReservationResponse } from "@/domain/checkout/inventory-reservation";
import { errorCodeToHttpStatus } from "@/lib/api/errors";
import { DrizzleCheckoutRepository } from "@/server/repositories/CheckoutRepository";
import {
  CheckoutService,
  type CheckoutReservationServiceInput,
} from "@/server/services/CheckoutService";
import { GeneralError, type ErrorCodeType } from "@/utils/general/error";

type InventoryReservationDurableObjectEnvelope =
  | { data: CheckoutReservationResponse }
  | { error: { code: ErrorCodeType; details?: unknown } };

export class InventoryDurableObject extends DurableObject {
  private readonly bindings: Env;

  constructor(
    ctx: DurableObjectState,
    env: Env
  ) {
    super(ctx, env);
    this.bindings = env;
  }

  private json(
    body: InventoryReservationDurableObjectEnvelope,
    status = 200
  ): Response {
    return new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
      status,
    });
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === "GET") {
      return this.json({ data: { ok: true } as never });
    }

    const url = new URL(request.url);

    if (request.method !== "POST" || url.pathname !== "/reserve") {
      return this.json(
        { error: { code: "RESOURCE_NOT_FOUND" } },
        errorCodeToHttpStatus("RESOURCE_NOT_FOUND")
      );
    }

    if (!this.bindings.DB) {
      return this.json(
        { error: { code: "PROVIDER_UNAVAILABLE" } },
        errorCodeToHttpStatus("PROVIDER_UNAVAILABLE")
      );
    }

    try {
      const input = (await request.json()) as CheckoutReservationServiceInput;
      const service = new CheckoutService({
        repository: new DrizzleCheckoutRepository(createDb(this.bindings.DB)),
      });
      const result = await service.reserveInventory(input);

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
