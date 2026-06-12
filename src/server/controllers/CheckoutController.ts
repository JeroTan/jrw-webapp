import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type { CheckoutCartValidationSummary } from "@/domain/checkout/cart-validation";
import type {
  CheckoutDetailsResult,
  CheckoutDetailsServiceInput,
  CheckoutCartValidationServiceInput,
  CheckoutReservationServiceInput,
} from "@/server/services/CheckoutService";
import type { CheckoutReservationResponse } from "@/domain/checkout/inventory-reservation";
import type { AppResult } from "@/utils/general/result";

export type CheckoutServiceLike = {
  validateCart(
    input: CheckoutCartValidationServiceInput
  ): Promise<AppResult<CheckoutCartValidationSummary>>;
  saveDetails(
    input: CheckoutDetailsServiceInput
  ): Promise<AppResult<CheckoutDetailsResult>>;
  reserveInventory(
    input: CheckoutReservationServiceInput
  ): Promise<AppResult<CheckoutReservationResponse>>;
};

export type CheckoutControllerResult<T> = {
  body: ApiResponse<T>;
  status: number;
};

export type CheckoutCartValidationControllerInput = {
  body: unknown;
  requestId: string;
};

export type CheckoutDetailsControllerInput = CheckoutDetailsServiceInput;
export type CheckoutReservationControllerInput = CheckoutReservationServiceInput;

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): CheckoutControllerResult<T> {
  if (!result.error) {
    throw new Error("Expected error result.");
  }

  const details =
    typeof result.error.data === "object" &&
    result.error.data !== null &&
    Object.keys(result.error.data).length > 0
      ? result.error.data
      : undefined;

  return {
    body: apiErrorWithRequestId(
      result.error.code,
      publicErrorMessage(result.error.code, result.error.message),
      requestId,
      details
    ),
    status: errorCodeToHttpStatus(result.error.code),
  };
}

export class CheckoutController {
  constructor(private readonly service: CheckoutServiceLike) {}

  async validateCart(
    input: CheckoutCartValidationControllerInput
  ): Promise<CheckoutControllerResult<CheckoutCartValidationSummary>> {
    const result = await this.service.validateCart(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
      status: 200,
    };
  }

  async saveDetails(
    input: CheckoutDetailsControllerInput
  ): Promise<CheckoutControllerResult<CheckoutDetailsResult>> {
    const result = await this.service.saveDetails(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
      status: 200,
    };
  }

  async reserveInventory(
    input: CheckoutReservationControllerInput
  ): Promise<CheckoutControllerResult<CheckoutReservationResponse>> {
    const result = await this.service.reserveInventory(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
      status: 200,
    };
  }
}
