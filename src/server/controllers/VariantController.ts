import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  ArchiveVariantServiceInput,
  CreateVariantServiceInput,
  ListProductVariantsServiceInput,
  UpdateVariantServiceInput,
  VariantDetailResult,
  VariantDetailServiceInput,
} from "@/server/services/VariantService";
import type { VariantListResult } from "@/domain/products/types";
import type { AppResult } from "@/utils/general/result";

export type VariantServiceLike = {
  listProductVariants(
    input: ListProductVariantsServiceInput
  ): Promise<AppResult<VariantListResult>>;
  createVariant(input: CreateVariantServiceInput): Promise<AppResult<VariantDetailResult>>;
  getVariant(input: VariantDetailServiceInput): Promise<AppResult<VariantDetailResult>>;
  updateVariant(input: UpdateVariantServiceInput): Promise<AppResult<VariantDetailResult>>;
  archiveVariant(
    input: ArchiveVariantServiceInput
  ): Promise<AppResult<VariantDetailResult>>;
};

export type VariantControllerResult<T> = {
  status: number;
  body: ApiResponse<T>;
};

export type VariantListControllerInput = {
  actor: ListProductVariantsServiceInput["actor"];
  requestId: string;
  productId: string;
  query: ListProductVariantsServiceInput["query"];
};

export type VariantCreateControllerInput = {
  actor: CreateVariantServiceInput["actor"];
  requestId: string;
  productId: string;
  body: Record<string, unknown>;
};

export type VariantDetailControllerInput = {
  actor: VariantDetailServiceInput["actor"];
  requestId: string;
  productId: string;
  variantId: string;
};

export type VariantUpdateControllerInput = {
  actor: UpdateVariantServiceInput["actor"];
  requestId: string;
  productId: string;
  variantId: string;
  body: Record<string, unknown>;
};

export type VariantArchiveControllerInput = {
  actor: ArchiveVariantServiceInput["actor"];
  requestId: string;
  productId: string;
  variantId: string;
  body: Record<string, unknown>;
};

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): VariantControllerResult<T> {
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

export class VariantController {
  constructor(private readonly service: VariantServiceLike) {}

  async listProductVariants(
    input: VariantListControllerInput
  ): Promise<VariantControllerResult<VariantListResult>> {
    const result = await this.service.listProductVariants(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 200,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
        page: result.content.page,
        pageSize: result.content.pageSize,
        totalItems: result.content.totalItems,
        totalPages: result.content.totalPages,
      }),
    };
  }

  async createVariant(
    input: VariantCreateControllerInput
  ): Promise<VariantControllerResult<VariantDetailResult>> {
    const result = await this.service.createVariant(input);

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

  async getVariant(
    input: VariantDetailControllerInput
  ): Promise<VariantControllerResult<VariantDetailResult>> {
    const result = await this.service.getVariant(input);

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

  async updateVariant(
    input: VariantUpdateControllerInput
  ): Promise<VariantControllerResult<VariantDetailResult>> {
    const result = await this.service.updateVariant(input);

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

  async archiveVariant(
    input: VariantArchiveControllerInput
  ): Promise<VariantControllerResult<VariantDetailResult>> {
    const result = await this.service.archiveVariant(input);

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
