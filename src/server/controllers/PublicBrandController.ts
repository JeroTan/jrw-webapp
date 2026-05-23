import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  PublicBrandDetailResult,
  PublicBrandListResult,
} from "@/domain/brands/public-types";
import type {
  PublicBrandDetailServiceInput,
  PublicBrandListServiceInput,
} from "@/server/services/PublicBrandService";
import type { AppResult } from "@/utils/general/result";

export type PublicBrandServiceLike = {
  getBrand(
    input: PublicBrandDetailServiceInput
  ): Promise<AppResult<PublicBrandDetailResult>>;
  listBrands(
    input: PublicBrandListServiceInput
  ): Promise<AppResult<PublicBrandListResult>>;
};

export type PublicBrandControllerResult<T> = {
  status: number;
  body: ApiResponse<T>;
};

export type PublicBrandListControllerInput = {
  requestId: string;
};

export type PublicBrandDetailControllerInput = {
  requestId: string;
  slugOrId: string;
};

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): PublicBrandControllerResult<T> {
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

export class PublicBrandController {
  constructor(private readonly service: PublicBrandServiceLike) {}

  async listBrands(
    input: PublicBrandListControllerInput
  ): Promise<PublicBrandControllerResult<PublicBrandListResult>> {
    const result = await this.service.listBrands(input);

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

  async getBrand(
    input: PublicBrandDetailControllerInput
  ): Promise<PublicBrandControllerResult<PublicBrandDetailResult>> {
    const result = await this.service.getBrand(input);

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
