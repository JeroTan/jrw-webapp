import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type { AppResult } from "@/utils/general/result";
import type {
  GetAvailabilityServiceInput,
  InventoryAvailabilityResult,
  InventoryDetailResult,
  UpdateInventoryStateServiceInput,
  UpdateStockQuantityServiceInput,
} from "@/server/services/InventoryService";

export type InventoryServiceLike = {
  updateStockQuantity(
    input: UpdateStockQuantityServiceInput
  ): Promise<AppResult<InventoryDetailResult>>;
  updateInventoryState(
    input: UpdateInventoryStateServiceInput
  ): Promise<AppResult<InventoryDetailResult>>;
  getAvailability(
    input: GetAvailabilityServiceInput
  ): Promise<AppResult<InventoryAvailabilityResult>>;
};

export type InventoryControllerResult<T> = {
  status: number;
  body: ApiResponse<T>;
};

export type InventoryStockControllerInput = {
  actor: UpdateStockQuantityServiceInput["actor"];
  requestId: string;
  productId: string;
  variantId: string;
  body: Record<string, unknown>;
};

export type InventoryStateControllerInput = {
  actor: UpdateInventoryStateServiceInput["actor"];
  requestId: string;
  productId: string;
  variantId: string;
  body: Record<string, unknown>;
};

export type InventoryAvailabilityControllerInput = {
  requestId: string;
  productId: string;
  variantId: string;
};

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): InventoryControllerResult<T> {
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
    status: errorCodeToHttpStatus(result.error.code),
    body: apiErrorWithRequestId(
      result.error.code,
      publicErrorMessage(result.error.code, result.error.message),
      requestId,
      details
    ),
  };
}

export class InventoryController {
  constructor(private readonly service: InventoryServiceLike) {}

  async updateStockQuantity(
    input: InventoryStockControllerInput
  ): Promise<InventoryControllerResult<InventoryDetailResult>> {
    const result = await this.service.updateStockQuantity(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 200,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
    };
  }

  async updateInventoryState(
    input: InventoryStateControllerInput
  ): Promise<InventoryControllerResult<InventoryDetailResult>> {
    const result = await this.service.updateInventoryState(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 200,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
    };
  }

  async getAvailability(
    input: InventoryAvailabilityControllerInput
  ): Promise<InventoryControllerResult<InventoryAvailabilityResult>> {
    const result = await this.service.getAvailability(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 200,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
    };
  }
}
