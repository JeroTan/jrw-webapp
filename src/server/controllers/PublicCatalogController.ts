import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  PublicCatalogCategoryListResult,
  PublicCatalogDetailResult,
  PublicCatalogResult,
} from "@/domain/products/public-types";
import type {
  PublicCatalogCategoryListServiceInput,
  PublicCatalogDetailServiceInput,
  PublicCatalogListServiceInput,
} from "@/server/services/PublicCatalogService";
import type { AppResult } from "@/utils/general/result";

export type PublicCatalogServiceLike = {
  listCatalog(
    input: PublicCatalogListServiceInput
  ): Promise<AppResult<PublicCatalogResult>>;
  listCategories(
    input: PublicCatalogCategoryListServiceInput
  ): Promise<AppResult<PublicCatalogCategoryListResult>>;
  getProductDetail(
    input: PublicCatalogDetailServiceInput
  ): Promise<AppResult<PublicCatalogDetailResult>>;
};

export type PublicCatalogControllerResult<T> = {
  body: ApiResponse<T>;
  status: number;
};

export type PublicCatalogListControllerInput = {
  query: PublicCatalogListServiceInput["query"];
  requestId: string;
};

export type PublicCatalogCategoryListControllerInput = {
  requestId: string;
};

export type PublicCatalogDetailControllerInput = {
  requestId: string;
  slug: string;
};

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): PublicCatalogControllerResult<T> {
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

export class PublicCatalogController {
  constructor(private readonly service: PublicCatalogServiceLike) {}

  async listCatalog(
    input: PublicCatalogListControllerInput
  ): Promise<PublicCatalogControllerResult<PublicCatalogResult>> {
    const result = await this.service.listCatalog(input);

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

  async listCategories(
    input: PublicCatalogCategoryListControllerInput
  ): Promise<PublicCatalogControllerResult<PublicCatalogCategoryListResult>> {
    const result = await this.service.listCategories(input);

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

  async getProductDetail(
    input: PublicCatalogDetailControllerInput
  ): Promise<PublicCatalogControllerResult<PublicCatalogDetailResult>> {
    const result = await this.service.getProductDetail(input);

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
