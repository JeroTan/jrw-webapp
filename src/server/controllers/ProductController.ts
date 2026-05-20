import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  CreateProductServiceInput,
  ListProductsServiceInput,
  ProductActorInput,
  ProductCreateResult,
  ProductDetailResult,
  ProductDetailServiceInput,
  ProductListProductsResult,
  ProductUpdateResult,
  UpdateProductServiceInput,
} from "@/server/services/ProductService";
import type { AppResult } from "@/utils/general/result";

export type ProductServiceLike = {
  createProduct(
    input: CreateProductServiceInput
  ): Promise<AppResult<ProductCreateResult>>;
  getProduct(
    input: ProductDetailServiceInput
  ): Promise<AppResult<ProductDetailResult>>;
  listProducts(
    input: ListProductsServiceInput
  ): Promise<AppResult<ProductListProductsResult>>;
  updateProduct(
    input: UpdateProductServiceInput
  ): Promise<AppResult<ProductUpdateResult>>;
};

export type ProductControllerResult<T> = {
  status: number;
  body: ApiResponse<T>;
};

export type CreateProductControllerInput = {
  actor: ProductActorInput | undefined;
  requestId: string;
  body: Record<string, unknown>;
};

export type ProductDetailControllerInput = {
  actor: ProductActorInput | undefined;
  requestId: string;
  productId: string;
};

export type ListProductsControllerInput = {
  actor: ProductActorInput | undefined;
  requestId: string;
  query: {
    page?: number;
    pageSize?: number;
    status?: string;
    brandId?: string;
    categoryId?: string;
    search?: string;
    includeArchived?: boolean | string;
  };
};

export type UpdateProductControllerInput = {
  actor: ProductActorInput | undefined;
  requestId: string;
  productId: string;
  body: Record<string, unknown>;
};

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): ProductControllerResult<T> {
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

export class ProductController {
  constructor(private readonly service: ProductServiceLike) {}

  async createProduct(
    input: CreateProductControllerInput
  ): Promise<ProductControllerResult<ProductCreateResult>> {
    const result = await this.service.createProduct(input);

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

  async getProduct(
    input: ProductDetailControllerInput
  ): Promise<ProductControllerResult<ProductDetailResult>> {
    const result = await this.service.getProduct(input);

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

  async listProducts(
    input: ListProductsControllerInput
  ): Promise<ProductControllerResult<ProductListProductsResult>> {
    const result = await this.service.listProducts(input);

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

  async updateProduct(
    input: UpdateProductControllerInput
  ): Promise<ProductControllerResult<ProductUpdateResult>> {
    const result = await this.service.updateProduct(input);

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
