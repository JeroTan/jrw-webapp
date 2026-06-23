import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
} from "@/lib/api/response";
import type {
  PaymentWebhookServiceInput,
  PaymentWebhookServiceResult,
} from "@/server/services/PaymentWebhookService";
import type { GeneralError } from "@/utils/general/error";
import type { AppResult } from "@/utils/general/result";

export type PaymentWebhookControllerResult = {
  body: unknown;
  status: number;
};

export type PaymentWebhookServiceLike = {
  processPayMongoWebhook(
    input: PaymentWebhookServiceInput
  ): Promise<AppResult<PaymentWebhookServiceResult>>;
};

function errorResult(
  error: GeneralError,
  requestId: string
): PaymentWebhookControllerResult {
  return {
    body: apiErrorWithRequestId(
      error.code,
      publicErrorMessage(error.code, error.message),
      requestId,
      error.data && typeof error.data === "object" ? error.data : undefined
    ),
    status: errorCodeToHttpStatus(error.code),
  };
}

export class PaymentWebhookController {
  constructor(private readonly service: PaymentWebhookServiceLike) {}

  async processPayMongoWebhook(
    input: PaymentWebhookServiceInput
  ): Promise<PaymentWebhookControllerResult> {
    const result = await this.service.processPayMongoWebhook(input);

    if (result.error) {
      return errorResult(result.error, input.requestId);
    }

    return {
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
      status: 200,
    };
  }
}
