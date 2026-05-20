import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  ArchiveCategoryServiceInput,
  CategoryActorInput,
  CategoryArchiveResult,
  CategoryCreateResult,
  CategoryDetailResult,
  CategoryListCategoriesResult,
  CategoryDetailServiceInput,
  CreateCategoryServiceInput,
  ListCategoriesServiceInput,
  UpdateCategoryServiceInput,
  CategoryUpdateResult,
} from "@/server/services/CategoryService";
import type { AppResult } from "@/utils/general/result";

export type CategoryServiceLike = {
  createCategory(
    input: CreateCategoryServiceInput
  ): Promise<AppResult<CategoryCreateResult>>;
  getCategory(
    input: CategoryDetailServiceInput
  ): Promise<AppResult<CategoryDetailResult>>;
  listCategories(
    input: ListCategoriesServiceInput
  ): Promise<AppResult<CategoryListCategoriesResult>>;
  updateCategory(
    input: UpdateCategoryServiceInput
  ): Promise<AppResult<CategoryUpdateResult>>;
  archiveCategory(
    input: ArchiveCategoryServiceInput
  ): Promise<AppResult<CategoryArchiveResult>>;
};

export type CategoryControllerResult<T> = {
  status: number;
  body: ApiResponse<T>;
};

export type CreateCategoryControllerInput = {
  actor: CategoryActorInput | undefined;
  requestId: string;
  body: Record<string, unknown>;
};

export type CategoryDetailControllerInput = {
  actor: CategoryActorInput | undefined;
  requestId: string;
  categoryId: string;
};

export type ListCategoriesControllerInput = {
  actor: CategoryActorInput | undefined;
  requestId: string;
  query: {
    page?: number;
    pageSize?: number;
    status?: string;
    isVisible?: boolean | string;
  };
};

export type UpdateCategoryControllerInput = {
  actor: CategoryActorInput | undefined;
  requestId: string;
  categoryId: string;
  body: Record<string, unknown>;
};

export type ArchiveCategoryControllerInput = CategoryDetailControllerInput;

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): CategoryControllerResult<T> {
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

export class CategoryController {
  constructor(private readonly service: CategoryServiceLike) {}

  async createCategory(
    input: CreateCategoryControllerInput
  ): Promise<CategoryControllerResult<CategoryCreateResult>> {
    const result = await this.service.createCategory(input);

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

  async getCategory(
    input: CategoryDetailControllerInput
  ): Promise<CategoryControllerResult<CategoryDetailResult>> {
    const result = await this.service.getCategory(input);

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

  async listCategories(
    input: ListCategoriesControllerInput
  ): Promise<CategoryControllerResult<CategoryListCategoriesResult>> {
    const result = await this.service.listCategories(input);

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

  async updateCategory(
    input: UpdateCategoryControllerInput
  ): Promise<CategoryControllerResult<CategoryUpdateResult>> {
    const result = await this.service.updateCategory(input);

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

  async archiveCategory(
    input: ArchiveCategoryControllerInput
  ): Promise<CategoryControllerResult<CategoryArchiveResult>> {
    const result = await this.service.archiveCategory(input);

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

