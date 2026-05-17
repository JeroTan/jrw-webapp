import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  BrandActorInput,
  BrandCreateResult,
  CreateBrandServiceInput,
} from "@/server/services/BrandService";
import type { AppResult } from "@/utils/general/result";

export type BrandServiceLike = {
  createBrand(input: CreateBrandServiceInput): Promise<AppResult<BrandCreateResult>>;
};

export type BrandControllerResult<T> = {
  status: number;
  body: ApiResponse<T>;
};

export type CreateBrandControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  body: Record<string, unknown>;
};

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): BrandControllerResult<T> {
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

export class BrandController {
  constructor(private readonly service: BrandServiceLike) {}

  async createBrand(
    input: CreateBrandControllerInput
  ): Promise<BrandControllerResult<BrandCreateResult>> {
    const result = await this.service.createBrand(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 201,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
    };
  }
}
