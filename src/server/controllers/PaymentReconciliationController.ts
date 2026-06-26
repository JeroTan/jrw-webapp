import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  PaymentReturnStatusInput,
  PaymentReturnStatusResult,
} from "@/server/services/PaymentReconciliationService";
import type { AppResult } from "@/utils/general/result";

export type PaymentReturnStatusControllerResult = {
  body: ApiResponse<PaymentReturnStatusResult>;
  status: number;
};

export type PaymentReconciliationServiceLike = {
  getPaymentReturnStatus(
    input: PaymentReturnStatusInput
  ): Promise<AppResult<PaymentReturnStatusResult>>;
};

export class PaymentReconciliationController {
  constructor(private readonly service: PaymentReconciliationServiceLike) {}

  async getPaymentReturnStatus(
    input: PaymentReturnStatusInput
  ): Promise<PaymentReturnStatusControllerResult> {
    const result = await this.service.getPaymentReturnStatus(input);

    if (result.error) {
      return {
        body: apiErrorWithRequestId(
          result.error.code,
          publicErrorMessage(result.error.code, result.error.message),
          input.requestId,
          result.error.data
        ),
        status: errorCodeToHttpStatus(result.error.code),
      };
    }

    return {
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
      status: 200,
    };
  }
}
